import type { OffersResponse, Tier } from "./types";
import { worldIdToken } from "./worldid";

// Dev: hit local gateway. Prod: same origin (Fly serves web + API together).
const GATEWAY =
  (import.meta.env.VITE_LISBON2026_GATEWAY_URL as string | undefined)?.trim() ||
  (import.meta.env.DEV ? "http://localhost:3000" : "");

export class OffersError extends Error {}

export type FetchOffersInput = {
  credential: boolean;
  address?: string;
  city?: string;
  debugTier?: Tier;
  /**
   * Privy access token from getAccessToken(). Gateway verifies it and binds
   * ?address= to a linked wallet before calling the address "theirs".
   */
  accessToken?: string | null;
  /**
   * Whether an uncredentialed ask should be metered for real.
   *
   * Defaults to true, which is the race: an unbacked *agent* pays per query and
   * that payment is the point of the lane. The overview is a person reading a
   * page, not an agent being charged, and it starts uncredentialed on purpose, so
   * metering it would spend real money on every visit by someone who has not
   * asked for anything yet. That surface passes false and takes the free route.
   */
  metered?: boolean;
};

/**
 * Product path. An unbacked ask goes through POST /x402/paid-offers so the demo
 * Hedera account settles 0.01 HBAR via x402; a credentialed ask, and any ask that
 * opts out of metering, hits GET /offers free.
 */
export type PaidOffersResult = OffersResponse & {
  spentUsd?: number;
  /** Hedera testnet transfer id from x402 PAYMENT-RESPONSE. */
  paymentTxId?: string | null;
  /** HashScan page for that transfer — only set when the settle receipt is real. */
  paymentTxUrl?: string | null;
};

export async function fetchOffers(
  input: FetchOffersInput,
): Promise<PaidOffersResult> {
  if (!input.credential && input.metered !== false) {
    return fetchPaidBotOffers(input);
  }

  const params = new URLSearchParams();
  params.set("credential", input.credential ? "1" : "0");
  // Said out loud, because the gateway cannot tell a person reading a page from
  // an agent asking. Without this the overview's first visitor met a paywall.
  if (input.metered === false) params.set("metered", "false");
  if (input.address?.trim()) params.set("address", input.address.trim());
  if (input.city?.trim()) params.set("city", input.city.trim());
  if (input.debugTier) params.set("tier", input.debugTier);

  const headers: HeadersInit = {};
  if (input.accessToken?.trim()) {
    headers.Authorization = `Bearer ${input.accessToken.trim()}`;
  }
  // A finished Selfie Check, if there was one. The gateway minted this token and
  // is the only thing that can read it, so sending it costs nothing when absent
  // and claims nothing on its own.
  const worldId = worldIdToken();
  if (worldId) {
    headers["world-id"] = worldId;
  }

  const res = await fetch(`${GATEWAY}/offers?${params}`, { headers });
  if (!res.ok) {
    throw new OffersError(`the desk answered ${res.status}`);
  }
  return (await res.json()) as OffersResponse;
}

async function fetchPaidBotOffers(
  input: FetchOffersInput,
): Promise<PaidOffersResult> {
  const res = await fetch(`${GATEWAY}/x402/paid-offers`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      city: input.city?.trim() || undefined,
      address: input.address?.trim() || undefined,
    }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
    };
    throw new OffersError(
      err.message || err.error || `x402 paywall answered ${res.status}`,
    );
  }
  const data = (await res.json()) as OffersResponse;
  const spentHeader = res.headers.get("x-bookerbob-spent-usd");
  const spentUsd = spentHeader ? Number(spentHeader) : undefined;
  const paymentTxId = res.headers.get("x-bookerbob-payment-tx")?.trim() || null;
  const paymentTxUrl =
    res.headers.get("x-bookerbob-payment-tx-url")?.trim() || null;
  return { ...data, spentUsd, paymentTxId, paymentTxUrl };
}

/** Gateway ledger for the race counters. */
export async function fetchSpent(payer?: string): Promise<{
  totalUsd: number;
  queries: number;
  x402?: { configured: boolean; demoPayer: string | null };
}> {
  const params = new URLSearchParams();
  if (payer?.trim()) params.set("payer", payer.trim());
  const res = await fetch(
    `${GATEWAY}/spent${params.size ? `?${params}` : ""}`,
  );
  if (!res.ok) {
    throw new OffersError(`spent answered ${res.status}`);
  }
  return (await res.json()) as {
    totalUsd: number;
    queries: number;
    x402?: { configured: boolean; demoPayer: string | null };
  };
}
