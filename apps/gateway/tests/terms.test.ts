// The underwriting matrix, offline. These tests are the guard on the one rule
// the project cannot break: identity moves risk, never price.

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  debugSignals,
  decideTerms,
  earnsRateLock,
  offerLimit,
  peakBand,
} from "../src/terms.js";
import type { Band, ContextSnapshot } from "../src/types.js";

function ctx(bands: Record<string, Band>): ContextSnapshot {
  return { address: "0xabc", bands, activeCategories: ["lending"] };
}

test("no credential lands on the unbacked tier", () => {
  assert.deepEqual(decideTerms({ hasCredential: false, context: null }), {
    tier: "bot",
    inventory: "basic",
    payment: "prepay_100",
  });
});

test("a credential with no context still earns human terms", () => {
  assert.deepEqual(decideTerms({ hasCredential: true, context: null }), {
    tier: "human",
    inventory: "full",
    payment: "deposit",
  });
});

test("T2 and T3 earn the rate lock, T4 earns pay at checkout", () => {
  const t2 = decideTerms({ hasCredential: true, context: ctx({ defi: "T2" }) });
  const t3 = decideTerms({ hasCredential: true, context: ctx({ defi: "T3" }) });
  const t4 = decideTerms({ hasCredential: true, context: ctx({ defi: "T4" }) });

  assert.equal(t2.payment, "rate_lock_pay_later");
  assert.equal(t3.payment, "rate_lock_pay_later");
  assert.equal(t2.tier, "verified");
  assert.equal(t4.tier, "elite");
  assert.equal(t4.payment, "pay_at_checkout");
});

test("T0 and T1 do not clear the bar for deferred settlement", () => {
  for (const band of ["T0", "T1"] as const) {
    const terms = decideTerms({ hasCredential: true, context: ctx({ defi: band }) });
    assert.equal(terms.tier, "human", `${band} must not reach verified`);
    assert.equal(terms.payment, "deposit");
  }
});

test("a stale source never upgrades and never downgrades", () => {
  const stale = decideTerms({
    hasCredential: true,
    context: ctx({ defi: "unavailable" }),
  });
  assert.equal(stale.tier, "human", "stale must not be read as high activity");
  assert.equal(stale.payment, "deposit", "stale must not cost human terms");

  // One live dimension still counts even when another is stale.
  const mixed = decideTerms({
    hasCredential: true,
    context: ctx({ defi: "unavailable", dex: "T3" }),
  });
  assert.equal(mixed.tier, "verified");

  assert.equal(peakBand(ctx({ defi: "unavailable" })), -1);
});

test("the highest band across dimensions decides", () => {
  const terms = decideTerms({
    hasCredential: true,
    context: ctx({ defi: "T1", dex: "T4" }),
  });
  assert.equal(terms.tier, "elite");
});

test("no credential outranks any amount of context", () => {
  const terms = decideTerms({ hasCredential: false, context: ctx({ defi: "T4" }) });
  assert.equal(terms.tier, "bot", "context without a person is not underwritable");
});

test("inventory depth never shrinks as tiers rise", () => {
  const depths = (["basic", "full", "member", "elite"] as const).map(offerLimit);
  for (let i = 1; i < depths.length; i++) {
    assert.ok(
      (depths[i] ?? 0) >= (depths[i - 1] ?? 0),
      "a higher tier must never see fewer rooms",
    );
  }
  assert.equal(offerLimit("basic"), 3);
});

test("only held-price terms are shown a rate lock", () => {
  assert.equal(earnsRateLock({ tier: "bot", inventory: "basic", payment: "prepay_100" }), false);
  assert.equal(earnsRateLock({ tier: "human", inventory: "full", payment: "deposit" }), false);
  assert.equal(
    earnsRateLock({ tier: "verified", inventory: "member", payment: "rate_lock_pay_later" }),
    true,
  );
  assert.equal(
    earnsRateLock({ tier: "elite", inventory: "elite", payment: "pay_at_checkout" }),
    true,
  );
});

test("terms carry no price, percentage or multiplier", () => {
  for (const tier of ["bot", "human", "verified", "elite"]) {
    const signals = debugSignals(tier);
    assert.ok(signals, `${tier} must be demoable`);
    const raw = JSON.stringify(decideTerms(signals));
    assert.doesNotMatch(raw, /discount|percent|%|multiplier/i);
    // prepay_100 is an enum name, not a quantity: what must never appear is a
    // money amount or a rate that could scale a price.
    assert.doesNotMatch(raw, /[$€£]|\d+\.\d|\bx\d/i, "a term must carry no amount");
  }
});

test("an unknown debug tier is ignored rather than guessed", () => {
  assert.equal(debugSignals("whale"), null);
  assert.equal(debugSignals(undefined), null);
});
