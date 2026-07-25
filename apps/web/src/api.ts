import type { OffersResponse, Tier } from "./types";

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
};

/**
 * Product path. Bot lane (no credential) goes through POST /x402/paid-offers so
 * the demo Hedera account settles 0.01 HBAR via x402; credentialed lane hits
 * GET /offers free.
 */
export async function fetchOffers(
  input: FetchOffersInput,
): Promise<OffersResponse & { spentUsd?: number }> {
  if (!input.credential) {
    return fetchPaidBotOffers(input);
  }

  const params = new URLSearchParams();
  params.set("credential", "1");
  if (input.address?.trim()) params.set("address", input.address.trim());
  if (input.city?.trim()) params.set("city", input.city.trim());
  if (input.debugTier) params.set("tier", input.debugTier);

  const headers: HeadersInit = {};
  if (input.accessToken?.trim()) {
    headers.Authorization = `Bearer ${input.accessToken.trim()}`;
  }

  const res = await fetch(`${GATEWAY}/offers?${params}`, { headers });
  if (!res.ok) {
    throw new OffersError(`the desk answered ${res.status}`);
  }
  return (await res.json()) as OffersResponse;
}

async function fetchPaidBotOffers(
  input: FetchOffersInput,
): Promise<OffersResponse & { spentUsd?: number }> {
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
  return { ...data, spentUsd };
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
