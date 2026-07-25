// Who pays, and who is only reading.
//
// The paywall exists to show an unbacked AGENT paying a cent a query, which is
// the whole point of the race. It was also catching people: the first visitor to
// the overview met a 402 instead of the terms, and the demo spent real HBAR on
// somebody who had not asked for anything. These tests pin the line between the
// two so it cannot drift back.

import assert from "node:assert/strict";
import { test } from "node:test";
import { Hono } from "hono";
import { shouldMeter } from "../src/x402.js";
import { credentialMiddleware, createMockVerifier } from "../src/world.js";

/** Answers "would this request have to clear the paywall". */
async function metered(query: string, headers: Record<string, string> = {}) {
  const app = new Hono();
  app.use("*", credentialMiddleware(createMockVerifier()));
  app.get("/offers", (c) => c.json({ metered: shouldMeter(c) }));
  const res = await app.request(`http://localhost/offers${query}`, { headers });
  return ((await res.json()) as { metered: boolean }).metered;
}

test("an anonymous agent ask is metered, which is the demonstration", async () => {
  assert.equal(await metered("?credential=0&city=lisbon"), true);
  assert.equal(await metered(""), true);
});

test("a person reading a page is not charged for reading it", async () => {
  for (const q of ["?metered=false", "?metered=0", "?metered=no", "?credential=0&metered=false"]) {
    assert.equal(await metered(q), false, `${q} is a read, not an agent ask`);
  }
});

test("a credential skips the wall, however it was presented", async () => {
  assert.equal(await metered("?credential=1"), false);
  assert.equal(await metered("", { agentkit: "dev:human-1" }), false);
});

test("anything that is not an opt-out still pays", async () => {
  // A typo must not quietly turn the meter off.
  for (const q of ["?metered=maybe", "?metered=", "?metered=1", "?metered=true"]) {
    assert.equal(await metered(q), true, `${q} must not read as an opt-out`);
  }
});
