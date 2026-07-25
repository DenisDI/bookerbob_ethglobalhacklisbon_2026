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

// The receipt and the counter travel together or not at all. They used to live
// in headers alone, which a proxy can drop and a browser can hide, so a screen
// could truthfully show a HashScan link beside "$0.00, 0 queries".
test("payment facts ride in the body next to the offers", async () => {
  const { withPaymentFacts } = await import("../src/routes/paidOffers.js");
  const merged = JSON.parse(
    withPaymentFacts('{"terms":{"tier":"bot"},"offers":[]}', {
      spentUsd: 0.08,
      paymentTxId: "0.0.7162784@1785015428.054415548",
      paymentTxUrl: "https://hashscan.io/testnet/transaction/0.0.7162784-1785015428-054415548",
      payer: "0.0.9699769",
    }),
  );

  assert.equal(merged.terms.tier, "bot", "the offers body is not disturbed");
  assert.equal(merged.spentUsd, 0.08);
  assert.match(merged.paymentTxUrl, /hashscan\.io/);
});

test("a missing receipt stays missing rather than becoming a plausible number", async () => {
  const { withPaymentFacts } = await import("../src/routes/paidOffers.js");
  const merged = JSON.parse(
    withPaymentFacts('{"offers":[]}', {
      spentUsd: null,
      paymentTxId: null,
      paymentTxUrl: null,
      payer: null,
    }),
  );
  assert.equal(merged.spentUsd, null);
  assert.equal(merged.paymentTxUrl, null);
});

test("a body we did not write is passed through untouched", async () => {
  const { withPaymentFacts } = await import("../src/routes/paidOffers.js");
  const error = '{"error":"demo_payer_unset"}';
  const facts = { spentUsd: null, paymentTxId: null, paymentTxUrl: null, payer: null };
  assert.equal(JSON.parse(withPaymentFacts(error, facts)).error, "demo_payer_unset");
  assert.equal(withPaymentFacts("not json at all", facts), "not json at all");
});
