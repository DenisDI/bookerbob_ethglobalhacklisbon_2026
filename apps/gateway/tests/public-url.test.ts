// The production bug this file guards: an AgentKit credential is bound to the
// resource it was issued for, and behind Fly the socket is plain HTTP while the
// caller used HTTPS. If the gateway compares against the socket's idea of the
// URL, a correctly signed credential is refused and the guest silently drops to
// the bot tier. Measured once on prod; never again.

import assert from "node:assert/strict";
import { test } from "node:test";
import { Hono } from "hono";
import { publicOrigin, publicResource } from "../src/public-url.js";

/** Requests go through a real Hono app: no hand-rolled Context to get wrong. */
async function ask(
  headers: Record<string, string>,
  url = "http://internal.local/offers",
): Promise<{ origin: string; resource: string; configured: string }> {
  const app = new Hono();
  app.get("*", (c) =>
    c.json({
      // "" for configured: exercise the header path regardless of the local .env.
      origin: publicOrigin(c, ""),
      resource: publicResource(c, ""),
      configured: publicResource(c, "https://lisbonhack.world"),
    }),
  );
  const res = await app.request(url, { headers });
  return (await res.json()) as { origin: string; resource: string; configured: string };
}

test("a terminating proxy decides the scheme, not the socket", async () => {
  const seen = await ask({
    "x-forwarded-proto": "https",
    "x-forwarded-host": "lisbonhack.world",
  });
  assert.equal(seen.origin, "https://lisbonhack.world");
  assert.equal(seen.resource, "https://lisbonhack.world/offers");
});

test("chained proxies: the first hop is the one the caller reached", async () => {
  const seen = await ask({
    "x-forwarded-proto": "https, http",
    "x-forwarded-host": "lisbonhack.world",
  });
  assert.equal(seen.origin, "https://lisbonhack.world");
});

test("no forwarded host falls back to Host", async () => {
  const seen = await ask({ "x-forwarded-proto": "https" });
  assert.equal(seen.origin, "https://internal.local");
});

test("without forwarded headers the request URL stands", async () => {
  const seen = await ask({});
  assert.equal(seen.resource, "http://internal.local/offers");
});

test("a garbage proto is ignored rather than trusted", async () => {
  const seen = await ask({
    "x-forwarded-proto": "javascript",
    "x-forwarded-host": "lisbonhack.world",
  });
  assert.equal(seen.origin, "http://internal.local");
});

test("a configured public URL wins over any header", async () => {
  const seen = await ask({
    "x-forwarded-proto": "http",
    "x-forwarded-host": "attacker.example",
  });
  assert.equal(seen.configured, "https://lisbonhack.world/offers");
});

test("the path is always the real one, never the configured URL's", async () => {
  const seen = await ask({}, "http://internal.local/prebook");
  assert.equal(seen.configured, "https://lisbonhack.world/prebook");
});
