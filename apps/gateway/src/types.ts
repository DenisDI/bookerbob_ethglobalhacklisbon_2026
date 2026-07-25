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
