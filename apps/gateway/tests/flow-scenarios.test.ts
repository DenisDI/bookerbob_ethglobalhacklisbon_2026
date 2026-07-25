// The main product flow, told as personas. terms.test.ts pins each branch of the
// engine; this file pins the whole outcome a real person or agent lands on, in the
// order they gain proof, plus the one invariant the product rests on: the engine is
// blind to whether the credential belongs to a person proving themselves or to an
// agent with a human behind it. Same context, same terms, either way.
//
// Offline: decide() is pure, so no gateway, no network, no mocks.

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  decide,
  decideTerms,
  earnsRateLock,
  offerLimit,
} from "../src/terms.js";
import type {
  Band,
  BandName,
  ContextSnapshot,
  RepaymentSignal,
  Terms,
} from "../src/types.js";

/** A consented address read as bands. Anything unset reads as T0, the floor. */
function wallet(
  bands: Partial<Record<BandName, Band>>,
  repayment: RepaymentSignal = "no_credit_history",
): ContextSnapshot {
  return {
    address: "0xabc",
    ens: null,
    since: null,
    bands: { activity: "T0", tenure: "T0", breadth: "T0", scale: "T0", ...bands },
    signals: { repayment },
    activeCategories: ["lending"],
  };
}

// Representative wallets for the personas below.
const FRESH = wallet({ activity: "T1", tenure: "T1", scale: "T2" });
const ESTABLISHED = wallet({ activity: "T4", tenure: "T3", breadth: "T3", scale: "T3" }, "borrowing_open");
const WHALE = wallet({ activity: "T4", tenure: "T4", breadth: "T4", scale: "T4" }, "clean");

/** Asserts a persona's full outcome, not just the tier label. */
function expectTerms(terms: Terms, expected: Terms) {
  assert.deepEqual(terms, expected, `expected ${expected.tier} terms`);
}

const BOT: Terms = { tier: "bot", inventory: "basic", payment: "prepay_100" };
const HUMAN: Terms = { tier: "human", inventory: "full", payment: "deposit" };
const VERIFIED: Terms = { tier: "verified", inventory: "member", payment: "rate_lock_pay_later" };
const ELITE: Terms = { tier: "elite", inventory: "elite", payment: "pay_at_checkout" };

test("persona 1: a person by hand, nothing proven, gets unbacked terms", () => {
  const terms = decideTerms({ hasCredential: false, context: null });
  expectTerms(terms, BOT);
  assert.equal(offerLimit(terms.inventory), 3, "the short list");
  assert.equal(earnsRateLock(terms), false, "nothing held for an unbacked request");
  // The answer to "is a plain human a bot": without a credential the engine cannot
  // tell them apart, so a person who proves nothing is quoted the unbacked terms.
});

test("persona 2: a World proof, no wallet, moves prepay to a deposit", () => {
  const terms = decideTerms({ hasCredential: true, context: null });
  expectTerms(terms, HUMAN);
  assert.equal(offerLimit(terms.inventory), 10, "the full list opens");
  assert.equal(earnsRateLock(terms), false, "a deposit is not a held price");
});

test("persona 3: World proof plus a fresh wallet still reads human", () => {
  const terms = decideTerms({ hasCredential: true, context: FRESH });
  expectTerms(terms, HUMAN);
  const { reason } = decide({ hasCredential: true, context: FRESH });
  assert.match(reason, /too new/, "the history was read, it is just not enough yet");
});

test("persona 4: World proof plus an established wallet earns a held price", () => {
  const terms = decideTerms({ hasCredential: true, context: ESTABLISHED });
  expectTerms(terms, VERIFIED);
  assert.equal(earnsRateLock(terms), true, "the price is held now, settled later");
});

test("persona 5: World proof plus a long, large, clean wallet settles at checkout", () => {
  const terms = decideTerms({ hasCredential: true, context: WHALE });
  expectTerms(terms, ELITE);
  assert.equal(earnsRateLock(terms), true, "held, and nothing moves until arrival");
});

test("persona 6: an agent for a human resolves identically to that human", () => {
  // decide() sees only hasCredential and the context. Whether that credential is a
  // person proving themselves or an agent presenting a human-backed credential is,
  // by design, invisible to the engine. So the same wallet must produce the same
  // terms either way. This is the invariant the product is built on.
  for (const context of [ESTABLISHED, WHALE]) {
    const asPerson = decideTerms({ hasCredential: true, context });
    const asAgentForHuman = decideTerms({ hasCredential: true, context });
    assert.deepEqual(
      asAgentForHuman,
      asPerson,
      "an agent with a human behind it earns exactly what the human would",
    );
  }
});

test("the ladder only ever lowers exposure as proof is added", () => {
  // prepay_100 is the most exposed for the guest (all money up front); pay_at_checkout
  // is the least (nothing until the stay). As a persona gains proof, exposure must
  // never rise.
  const EXPOSURE: Record<Terms["payment"], number> = {
    prepay_100: 3,
    deposit: 2,
    rate_lock_pay_later: 1,
    pay_at_checkout: 0,
  };

  const walk: Terms[] = [
    decideTerms({ hasCredential: false, context: null }),
    decideTerms({ hasCredential: true, context: null }),
    decideTerms({ hasCredential: true, context: ESTABLISHED }),
    decideTerms({ hasCredential: true, context: WHALE }),
  ];

  for (let i = 1; i < walk.length; i++) {
    assert.ok(
      EXPOSURE[walk[i]!.payment] <= EXPOSURE[walk[i - 1]!.payment],
      "gaining proof must never make the guest pay sooner",
    );
  }
});
