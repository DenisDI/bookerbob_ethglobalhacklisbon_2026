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

import type { Band, ContextSnapshot, InventoryLevel, Terms, Tier } from "./types.js";

export interface TermsSignals {
  /** A credential proving a real, unique human stands behind the agent. */
  hasCredential: boolean;
  /** Null when no address was consented, or when there is no history yet. */
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

function rank(band: Band): number {
  return band === "unavailable" ? -1 : BAND_RANK[band];
}

/** Highest ranked band across dimensions; -1 when nothing usable came back. */
export function peakBand(context: ContextSnapshot | null): number {
  if (!context) return -1;
  const ranks = Object.values(context.bands).map(rank);
  return ranks.length > 0 ? Math.max(...ranks) : -1;
}

/**
 * Thresholds, and why they sit here (specs/02-context-bands-mcp.md):
 *
 *   T2 = a wallet with a real, repeated footprint. That is the first point at
 *        which deferring settlement is underwritable, so T2 unlocks the rate
 *        lock. Below it the credential alone still earns a deposit, because
 *        personhood removes the sybil risk even with no onchain history.
 *   T4 = a long, dense, multi-category footprint. Rare enough that letting the
 *        money move only at checkout is a bounded exposure.
 *
 * Bands are calibrated so a typical active DeFi wallet lands T2 to T3, which
 * means the interesting middle of the demo is the common case, not a corner.
 */
export function decideTerms(signals: TermsSignals): Terms {
  if (!signals.hasCredential) {
    // Nobody is accountable for this request, so nothing is extended on trust.
    return { tier: "bot", inventory: "basic", payment: "prepay_100" };
  }

  const peak = peakBand(signals.context);

  if (peak >= BAND_RANK.T4) {
    return { tier: "elite", inventory: "elite", payment: "pay_at_checkout" };
  }

  if (peak >= BAND_RANK.T2) {
    return { tier: "verified", inventory: "member", payment: "rate_lock_pay_later" };
  }

  // Credential, but no usable context: an empty or stale graph must not cost
  // the guest their human terms.
  return { tier: "human", inventory: "full", payment: "deposit" };
}

/**
 * How many rooms a tier gets to see. The supplier returns a single ranked list,
 * so member and elite currently resolve to the same depth as full: the honest
 * difference between those tiers is the payment term, not a longer list. Only
 * the unbacked tier is genuinely restricted, which is also the anti-farming
 * limit rather than a perk withheld from bots.
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

const DEBUG_TIERS: Record<Tier, TermsSignals> = {
  bot: { hasCredential: false, context: null },
  human: { hasCredential: true, context: null },
  verified: {
    hasCredential: true,
    context: {
      address: null,
      bands: { defiActivity: "T3" },
      activeCategories: ["lending", "dex"],
    },
  },
  elite: {
    hasCredential: true,
    context: {
      address: null,
      bands: { defiActivity: "T4" },
      activeCategories: ["lending", "dex"],
    },
  },
};

/**
 * Debug helper for demoing the delta before the credential path is wired. It
 * synthesises SIGNALS rather than forcing a result, so what a reviewer sees on
 * screen is the real matrix deciding, not a hardcoded answer. Ignored once a
 * genuine credential is present.
 */
export function debugSignals(tier: string | undefined): TermsSignals | null {
  if (!tier) return null;
  return DEBUG_TIERS[tier as Tier] ?? null;
}
