// The underwriting engine. Pure: signals in, three enums out, no network and no
// side effects, so the whole matrix is testable offline.
//
// THE RULE THIS FILE EXISTS TO ENFORCE (specs/00-final-plan.md A.2): identity
// never changes the price. Everyone is quoted the same supplier rate. What
// changes is who carries the risk between booking and stay:
//
//   prepay_100          the guest pays everything up front
//   deposit             part up front, rest later
//   rate_lock_pay_later the price is held now, settled later
//   pay_at_checkout     nothing moves until the stay
//
// So there is no discount, no percentage, and no price multiplier anywhere in
// this module, and the tests assert their absence.
//
// WHY THERE IS NO SINGLE NUMBER HERE. Collapsing context into one total would
// make this "did more, gets more", which is a scoreboard. Underwriting asks
// separate questions, and the answers are allowed to disagree: the busiest
// address we sampled has a genuine repayment record and two liquidations behind
// it. It earns a held price. It does not earn walking in having paid nothing.

import type {
  Band,
  BandName,
  ContextSnapshot,
  InventoryLevel,
  Terms,
} from "./types.js";

export interface TermsSignals {
  /** A credential proving a real, unique human stands behind the agent. */
  hasCredential: boolean;
  /** Null when no address was consented, or when the lookup failed. */
  context: ContextSnapshot | null;
}

/**
 * Band ordering. "unavailable" is deliberately absent: a stale source has no
 * rank, so it can neither raise nor lower a tier. Serving a stale tier is worse
 * than serving none, because the guest would be underwritten on a fiction.
 */
const BAND_RANK: Record<Exclude<Band, "unavailable">, number> = {
  T0: 0,
  T1: 1,
  T2: 2,
  T3: 3,
  T4: 4,
};

function rank(band: Band | undefined): number {
  if (!band || band === "unavailable") return -1;
  return BAND_RANK[band];
}

export function bandAtLeast(
  context: ContextSnapshot | null,
  name: BandName,
  minimum: Exclude<Band, "unavailable">,
): boolean {
  return rank(context?.bands[name]) >= BAND_RANK[minimum];
}

/**
 * Underwriting rules, in the order an underwriter would ask them.
 *
 * A HELD PRICE (rate_lock_pay_later) asks: is this a real, established
 * counterparty? Tenure carries the weight, because time is the one input nobody
 * can buy retroactively, and either depth of use or breadth of use confirms it
 * is not a dormant address that merely happens to be old.
 *
 * SETTLING AT CHECKOUT (pay_at_checkout) hands over the most: a room is held
 * and nothing moves until the guest arrives. So it asks for everything above,
 * plus size, plus a longer record, and it refuses on a liquidation. Being
 * liquidated is not a moral failing and it is not scored: it is direct evidence
 * that this counterparty has been caught short before, which is precisely the
 * risk being taken on.
 */
const RATE_LOCK_TENURE = "T2";
const CHECKOUT_TENURE = "T3";
const CHECKOUT_SCALE = "T3";

export function decideTerms(signals: TermsSignals): Terms {
  if (!signals.hasCredential) {
    // Nobody is accountable for this request, so nothing is extended on trust,
    // however rich the onchain history behind the address happens to be.
    return { tier: "bot", inventory: "basic", payment: "prepay_100" };
  }

  const context = signals.context;
  const humanTerms: Terms = { tier: "human", inventory: "full", payment: "deposit" };

  const established =
    bandAtLeast(context, "tenure", RATE_LOCK_TENURE) &&
    (bandAtLeast(context, "activity", "T2") || bandAtLeast(context, "breadth", "T3"));

  if (!established) return humanTerms;

  const earnsCheckout =
    bandAtLeast(context, "tenure", CHECKOUT_TENURE) &&
    bandAtLeast(context, "scale", CHECKOUT_SCALE) &&
    context?.signals.repayment !== "liquidated";

  return earnsCheckout
    ? { tier: "elite", inventory: "elite", payment: "pay_at_checkout" }
    : { tier: "verified", inventory: "member", payment: "rate_lock_pay_later" };
}

/**
 * How many rooms a tier gets to see. The supplier returns a single ranked list,
 * so member and elite resolve to the same depth as full: the honest difference
 * between those tiers is the payment term, not a longer list. Only the unbacked
 * tier is genuinely restricted, which is also the anti-farming limit rather than
 * a perk withheld from bots.
 */
export function offerLimit(inventory: InventoryLevel): number {
  return inventory === "basic" ? 3 : 10;
}

/** Tiers whose payment term is a held price, so they are shown the rate lock. */
export function earnsRateLock(terms: Terms): boolean {
  return (
    terms.payment === "rate_lock_pay_later" || terms.payment === "pay_at_checkout"
  );
}

function synthetic(
  bands: Record<BandName, Band>,
  repayment: ContextSnapshot["signals"]["repayment"],
  categories: string[],
): ContextSnapshot {
  return {
    address: null,
    ens: null,
    since: null,
    bands,
    signals: { repayment },
    activeCategories: categories,
  };
}

const DEBUG_TIERS: Record<string, TermsSignals> = {
  bot: { hasCredential: false, context: null },
  human: { hasCredential: true, context: null },
  verified: {
    hasCredential: true,
    context: synthetic(
      { activity: "T3", tenure: "T3", breadth: "T3", scale: "T2" },
      "clean",
      ["lending", "dex"],
    ),
  },
  elite: {
    hasCredential: true,
    context: synthetic(
      { activity: "T4", tenure: "T4", breadth: "T4", scale: "T4" },
      "clean",
      ["lending", "dex"],
    ),
  },
};

/**
 * Debug helper for demoing the delta before the credential path is wired. It
 * synthesises SIGNALS rather than forcing a result, so what a reviewer sees on
 * screen is the real matrix deciding, not a hardcoded answer. A real consented
 * address always overrides the synthetic context.
 */
export function debugSignals(tier: string | undefined): TermsSignals | null {
  if (!tier) return null;
  return DEBUG_TIERS[tier] ?? null;
}
