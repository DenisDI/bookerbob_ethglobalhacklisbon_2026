// Shared shapes. Underwriting is enums only: identity changes who carries the
// risk, never the price (specs/00-final-plan.md A.2). No percentages here.

export type Tier = "bot" | "human" | "verified" | "elite";

export type Payment =
  | "prepay_100"
  | "deposit"
  | "rate_lock_pay_later"
  | "pay_at_checkout";

export type InventoryLevel = "basic" | "full" | "member" | "elite";

export interface Terms {
  tier: Tier;
  inventory: InventoryLevel;
  payment: Payment;
}

/**
 * Coarse activity band for one dimension. "unavailable" means the source was
 * stale: it must never be read as low activity, and never as high.
 */
export type Band = "T0" | "T1" | "T2" | "T3" | "T4" | "unavailable";

/** The four axes the context MCP reports. Deliberately independent. */
export type BandName = "activity" | "tenure" | "breadth" | "scale";

/**
 * Whether borrowed money came back. Not a scale and not a verdict on a person:
 * it is the public record of the consented address, and it speaks directly to
 * who should carry risk between booking and the stay.
 */
export type RepaymentSignal =
  | "no_credit_history"
  | "clean"
  | "borrowing_open"
  | "liquidated";

/** What the context-bands MCP tells us about a consented address. */
export interface ContextSnapshot {
  address: string | null;
  /** Resolved name, when the address has one. */
  ens: { name: string; createdAt: number | null } | null;
  /** Calendar year first seen. Coarse on purpose: sayable, not a raw date. */
  since: number | null;
  bands: Record<BandName, Band>;
  signals: { repayment: RepaymentSignal };
  /** e.g. ["lending", "dex"]. Categories, never raw counts. */
  activeCategories: string[];
}

/** One hotel as shown to an agent. Prices are real supplier prices. */
export interface Offer {
  hotelId: string;
  name: string | null;
  stars: number | null;
  address: string | null;
  perNightUsd: number;
  totalUsd: number;
  /** ISO timestamp from the supplier; a real risk signal, not decoration. */
  freeCancellationBefore: string | null;
  photoUrl: string | null;
}

/** A bookable rate. `bookHash` is the supplier's own identifier. */
export interface RateOption {
  bookHash: string;
  roomName: string | null;
  meal: string | null;
  totalUsd: number;
  perNightUsd: number;
  freeCancellationBefore: string | null;
}

/** Prebook hold: the rate lock. Short-lived (minutes) upstream. */
export interface PrebookHold {
  partnerOrderId: string;
  /**
   * The hotel the supplier actually held, so a screen can show that room rather
   * than whichever offer happens to sort first. Taken from the response's own
   * `hotel` block, never guessed.
   */
  hotelId: string | null;
  roomName: string | null;
  totalUsd: number;
  perNightUsd: number;
  freeCancellationBefore: string | null;
}

export type InventorySource = "live" | "cached";

export interface InventoryQuery {
  city: string;
  checkin: string;
  checkout: string;
  adults?: number;
  topN?: number;
  maxPerNightUsd?: number;
}

export interface InventoryResult {
  city: string;
  checkin: string;
  checkout: string;
  nights: number | null;
  matchingCount: number | null;
  offers: Offer[];
  rates: RateOption[];
  hold: PrebookHold | null;
  summary: string | null;
  source: InventorySource;
  /** Set when served from the captured second source. */
  capturedAt: string | null;
}

/** Warm, lowercase, no crypto jargon on the surface (A.1 / B.3). */
export interface NarrationLine {
  t: number;
  line: string;
}
