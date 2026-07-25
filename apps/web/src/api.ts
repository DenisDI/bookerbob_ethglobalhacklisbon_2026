import type { OffersResponse, Tier } from "./types";

const GATEWAY =
  (import.meta.env.VITE_LISBON2026_GATEWAY_URL as string | undefined) ??
  "http://localhost:3000";

export class OffersError extends Error {}

/**
 * Two separate axes, exactly as the gateway treats them.
 *
 * `tier` is the debug lever standing in for a credential until AgentKit lands.
 * `address` is the consented context: an address or an ENS name, and the real
 * bands behind it decide whether a credentialed request reaches verified or
 * elite. Sending an address without a credential still yields bot, which is the
 * point rather than a bug.
 */
export async function fetchOffers(
  tier: Tier,
  address?: string,
): Promise<OffersResponse> {
  const params = new URLSearchParams({ tier });
  if (address?.trim()) params.set("address", address.trim());

  const res = await fetch(`${GATEWAY}/offers?${params}`);
  if (!res.ok) {
    throw new OffersError(`the desk answered ${res.status}`);
  }
  return (await res.json()) as OffersResponse;
}
