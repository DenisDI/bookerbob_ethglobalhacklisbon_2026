import type { OffersResponse, Tier } from "./types";

const GATEWAY =
  (import.meta.env.VITE_LISBON2026_GATEWAY_URL as string | undefined) ??
  "http://localhost:3000";

export class OffersError extends Error {}

/**
 * ?tier= is the debug lever that stands in for a credential until AgentKit is
 * wired. The gateway turns it into signals and lets the real matrix decide.
 */
export async function fetchOffers(tier: Tier): Promise<OffersResponse> {
  const res = await fetch(`${GATEWAY}/offers?tier=${tier}`);
  if (!res.ok) {
    throw new OffersError(`the desk answered ${res.status}`);
  }
  return (await res.json()) as OffersResponse;
}
