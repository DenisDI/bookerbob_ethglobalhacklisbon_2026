// The credential axis, offline. These tests guard one property: nothing except a
// verified AgentKit header may say "world". A stand-in that could claim it would
// put a partner integration on screen that never ran.

import assert from "node:assert/strict";
import { test } from "node:test";
import { Hono } from "hono";
import {
  createMockVerifier,
  credentialLabel,
  credentialMiddleware,
  getCredential,
  mayDeferSettlement,
  NO_CREDENTIAL,
  pickVerifier,
  publicCredential,
} from "../src/world.js";

const RESOURCE = "http://localhost:3000/offers";

test("the mock verifier cannot produce a verified credential", async () => {
  const mock = createMockVerifier();

  const accepted = await mock.verify("dev:human-1", RESOURCE);
  assert.equal(accepted.status, "stand_in");

  // Exhaustive on purpose: whatever a caller sends, "verified" is unreachable.
  for (const header of ["dev:", "dev:world", "verified", "world", "", "{}"]) {
    const result = await mock.verify(header, RESOURCE);
    assert.notEqual(
      result.status,
      "verified",
      `${JSON.stringify(header)} must not reach verified through the mock`,
    );
  }
});

test("the mock refuses anything that is not a dev header", async () => {
  const result = await createMockVerifier().verify("garbage", RESOURCE);
  assert.equal(result.status, "missing");
  assert.match(result.detail ?? "", /dev:/);
});

// The switch is opt-out on purpose. Keying it off a present secret is how the
// deployed gateway ended up running the stand-in and refusing real credentials:
// the secret in question was the agent's, and servers do not have it.
test("real verification is the default and the stand-in must be asked for", () => {
  assert.equal(pickVerifier("stand_in").kind, "mock");
  assert.equal(pickVerifier("").kind, "world");
  assert.equal(pickVerifier("world").kind, "world");
  assert.equal(pickVerifier("  stand_in  ").kind, "mock");
  // A typo must not quietly downgrade verification.
  assert.equal(pickVerifier("standin").kind, "world");
});

test("a missing credential is the default, and it is not an error", () => {
  assert.equal(NO_CREDENTIAL.status, "missing");
});

test("labels never promise World for a stand-in", () => {
  assert.doesNotMatch(credentialLabel({ status: "stand_in" }), /^verified/i);
  assert.match(credentialLabel({ status: "stand_in" }), /not World yet/i);
  assert.match(
    credentialLabel({ status: "verified", source: "agentkit", humanId: "h" }),
    /verified by World/i,
  );
  assert.match(credentialLabel({ status: "missing" }), /no credential/i);
});

/**
 * The gate on /prebook and /book. Deferred settlement is what the credential
 * underwrites, so the routes that hold a room or move money have to refuse a
 * caller nobody is accountable for. Before this the terms were enforced only
 * where they were displayed.
 */
test("nobody accountable means nothing is deferred", () => {
  assert.equal(mayDeferSettlement({ status: "missing" }), false);
  assert.equal(mayDeferSettlement({ status: "stand_in" }), true);
  assert.equal(
    mayDeferSettlement({ status: "verified", source: "agentkit", humanId: "h" }),
    true,
  );
});

// The middleware is where every route reads its one answer, so the properties
// below are about the pipeline, not the verifier.
function middlewareApp() {
  const app = new Hono();
  app.use("*", credentialMiddleware(createMockVerifier()));
  app.get("/offers", (c) => c.json(getCredential(c)));
  return app;
}

test("no header means no credential and no verification work", async () => {
  const res = await middlewareApp().request("http://localhost/offers");
  assert.deepEqual(await res.json(), { status: "missing" });
});

test("a presented header is resolved once, before the handler runs", async () => {
  const res = await middlewareApp().request("http://localhost/offers", {
    headers: { agentkit: "dev:human-1" },
  });
  assert.deepEqual(await res.json(), { status: "stand_in" });
});

test("what leaves the gateway is status and source, nothing else", () => {
  assert.deepEqual(
    publicCredential({ status: "verified", source: "agentkit", humanId: "h" }),
    { status: "verified", source: "agentkit" },
  );
  // The reason a check failed is logged, not returned: it is free help for
  // forging the next attempt.
  assert.deepEqual(
    publicCredential({ status: "missing", detail: "signature did not verify" }),
    { status: "missing" },
  );
  assert.deepEqual(publicCredential({ status: "stand_in" }), { status: "stand_in" });
});

test("a humanId is never part of a label", () => {
  const label = credentialLabel({
    status: "verified",
    source: "agentkit",
    humanId: "human-secret-id",
  });
  assert.doesNotMatch(label, /human-secret-id/);
});
