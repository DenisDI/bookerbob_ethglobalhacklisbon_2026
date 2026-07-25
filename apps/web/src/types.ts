// Mirror of the gateway's /offers response. Kept as a hand-written copy rather
// than a shared package: the demo is one repo away from the source of truth and
// a build-time coupling would slow the loop down for no benefit.

export type Tier = "bot" | "human" | "verified" | "elite";

export type Payment =
  | "prepay_100"
  | "deposit"
  | "rate_lock_pay_later"
  | "pay_at_checkout";

export interface Terms {
  tier: Tier;
  inventory: "basic" | "full" | "member" | "elite";
  payment: Payment;
}

export interface Offer {
  hotelId: string;
  name: string | null;
  stars: number | null;
  address: string | null;
  perNightUsd: number;
  totalUsd: number;
  freeCancellationBefore: string | null;
  photoUrl: string | null;
}

export interface PrebookHold {
  partnerOrderId: string;
  roomName: string | null;
  totalUsd: number;
  perNightUsd: number;
  freeCancellationBefore: string | null;
}

export interface NarrationLine {
  t: number;
  line: string;
}

export type Band = "T0" | "T1" | "T2" | "T3" | "T4" | "unavailable";

export type RepaymentSignal =
  | "no_credit_history"
  | "clean"
  | "borrowing_open"
  | "liquidated";

/** Bands only. The gateway never sends counts or amounts, by design. */
export interface ContextBands {
  address: string | null;
  ens: { name: string; createdAt: number | null } | null;
  since: number | null;
  bands: { activity: Band; tenure: Band; breadth: Band; scale: Band };
  signals: { repayment: RepaymentSignal };
  activeCategories: string[];
}

export interface OffersResponse {
  terms: Terms;
  city: string;
  checkin: string;
  checkout: string;
  nights: number | null;
  matchingCount: number | null;
  offers: Offer[];
  hold: PrebookHold | null;
  source: "live" | "cached";
  capturedAt: string | null;
  context: ContextBands | null;
  narration: NarrationLine[];
}
