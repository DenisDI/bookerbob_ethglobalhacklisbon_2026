// Mirror of the gateway's /offers response. Kept as a hand-written copy rather
// than a shared package: the demo is one repo away from the source of truth and
// a build-time coupling would slow the loop down for no benefit.

import type { CredentialSource } from "./credential/types";

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
  /** The one fact that decided these terms, in plain words. */
  reason: string;
  city: string;
  checkin: string;
  checkout: string;
  nights: number | null;
  matchingCount: number | null;
  offers: Offer[];
  hold: PrebookHold | null;
  /**
   * What the gateway made of the credential. `verified` only ever comes from a
   * real check on the server: `agentkit` from a signed header verified against
   * the AgentBook, `world-id` from a nullifier the Developer Portal confirmed.
   * The browser flag and the dev verifier are `stand_in` forever.
   */
  credential: {
    status: "missing" | "stand_in" | "verified";
    source?: CredentialSource;
  };
  /**
   * Wallet ownership axis (Privy). `typed` = ?address= alone; `verified` only
   * after the gateway checked a Bearer access token against linked wallets.
   */
  wallet?: {
    status: "missing" | "typed" | "verified";
    address?: string;
  };
  /** Hedera HashScan schedule URL when pay-later / pay-at-checkout. */
  scheduleUrl: string | null;
  scheduleId: string | null;
  source: "live" | "cached";
  capturedAt: string | null;
  /** Graph context bands for the consented address (null if none / failed). */
  context: ContextBands | null;
  narration: NarrationLine[];
  /** Echo of the credential axis the gateway used. */
  hasCredential?: boolean;
}
