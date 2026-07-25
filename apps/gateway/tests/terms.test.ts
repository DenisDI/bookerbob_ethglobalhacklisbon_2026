// The underwriting matrix, offline. These tests are the guard on the one rule
// the project cannot break: identity moves risk, never price. They also pin the
// decisions that make this underwriting rather than a scoreboard.

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  bandAtLeast,
  debugSignals,
  decideTerms,
  earnsRateLock,
  offerLimit,
} from "../src/terms.js";
import type { Band, BandName, ContextSnapshot, RepaymentSignal } from "../src/types.js";

function ctx(
  bands: Partial<Record<BandName, Band>>,
  repayment: RepaymentSignal = "no_credit_history",
): ContextSnapshot {
  return {
    address: "0xabc",
    ens: null,
    since: null,
    bands: {
      activity: "T0",
      tenure: "T0",
      breadth: "T0",
      scale: "T0",
      ...bands,
    },
    signals: { repayment },
    activeCategories: ["lending"],
  };
}

const ESTABLISHED = { activity: "T2", tenure: "T2" } as const;
const STRONG = { activity: "T4", tenure: "T3", breadth: "T3", scale: "T3" } as const;

test("no credential lands on the unbacked tier", () => {
  assert.deepEqual(decideTerms({ hasCredential: false, context: null }), {
    tier: "bot",
    inventory: "basic",
    payment: "prepay_100",
  });
});

test("no credential outranks any amount of context", () => {
  const terms = decideTerms({ hasCredential: false, context: ctx(STRONG, "clean") });
  assert.equal(terms.tier, "bot", "context without a person is not underwritable");
});

test("a credential with no context still earns human terms", () => {
  assert.deepEqual(decideTerms({ hasCredential: true, context: null }), {
    tier: "human",
    inventory: "full",
    payment: "deposit",
  });
});

test("a thin file stays on human terms", () => {
  const young = decideTerms({
    hasCredential: true,
    context: ctx({ activity: "T4", tenure: "T1" }),
  });
  assert.equal(young.tier, "human", "age is what a held price is underwritten on");

  const dormant = decideTerms({
    hasCredential: true,
    context: ctx({ activity: "T1", tenure: "T4" }),
  });
  assert.equal(dormant.tier, "human", "old but barely used is not established");
});

test("tenure plus depth earns a held price", () => {
  const terms = decideTerms({ hasCredential: true, context: ctx(ESTABLISHED) });
  assert.equal(terms.tier, "verified");
  assert.equal(terms.payment, "rate_lock_pay_later");
});

test("tenure plus breadth also earns a held price", () => {
  const terms = decideTerms({
    hasCredential: true,
    context: ctx({ activity: "T1", tenure: "T2", breadth: "T3" }),
  });
  assert.equal(terms.tier, "verified", "breadth substitutes for depth");
});

test("a long, large, clean file settles at checkout", () => {
  const terms = decideTerms({ hasCredential: true, context: ctx(STRONG, "clean") });
  assert.equal(terms.tier, "elite");
  assert.equal(terms.payment, "pay_at_checkout");
});

test("having been liquidated closes pay at checkout, not the rate lock", () => {
  const caught = decideTerms({
    hasCredential: true,
    context: ctx(STRONG, "liquidated"),
  });

  assert.equal(caught.tier, "verified", "the price is still held");
  assert.equal(caught.payment, "rate_lock_pay_later");

  // Everything else identical, so the liquidation is provably the deciding fact.
  const clean = decideTerms({ hasCredential: true, context: ctx(STRONG, "clean") });
  assert.equal(clean.payment, "pay_at_checkout");
});

test("never having borrowed is not held against anyone", () => {
  const terms = decideTerms({
    hasCredential: true,
    context: ctx(STRONG, "no_credit_history"),
  });
  assert.equal(terms.tier, "elite", "no credit history is neutral, not negative");
});

test("size gates checkout on its own", () => {
  const small = decideTerms({
    hasCredential: true,
    context: ctx({ ...STRONG, scale: "T2" }, "clean"),
  });
  assert.equal(small.tier, "verified");
});

test("stale bands never upgrade and never cost human terms", () => {
  const stale = ctx(
    {
      activity: "unavailable",
      tenure: "unavailable",
      breadth: "unavailable",
      scale: "unavailable",
    },
    "no_credit_history",
  );
  const terms = decideTerms({ hasCredential: true, context: stale });

  assert.equal(terms.tier, "human", "stale must not be read as a rich history");
  assert.equal(terms.payment, "deposit", "nor as an empty one");
  assert.equal(bandAtLeast(stale, "tenure", "T1"), false);
});

test("one live axis still counts when another is stale", () => {
  const mixed = ctx({ activity: "T2", tenure: "T2", breadth: "unavailable" });
  assert.equal(decideTerms({ hasCredential: true, context: mixed }).tier, "verified");
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

test("every debug tier really produces its tier through the engine", () => {
  for (const tier of ["bot", "human", "verified", "elite"] as const) {
    const signals = debugSignals(tier);
    assert.ok(signals);
    assert.equal(decideTerms(signals).tier, tier, `${tier} must not be a label only`);
  }
});

test("an unknown debug tier is ignored rather than guessed", () => {
  assert.equal(debugSignals("whale"), null);
  assert.equal(debugSignals(undefined), null);
});
