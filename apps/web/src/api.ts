import type { OffersResponse, Tier } from "./types";

// Dev: hit local gateway. Prod: same origin (Fly serves web + API together).
// Hardcoding localhost in the bundle makes lisbonhack.world → Failed to fetch.
const GATEWAY =
  (import.meta.env.VITE_LISBON2026_GATEWAY_URL as string | undefined)?.trim() ||
  (import.meta.env.DEV ? "http://localhost:3000" : "");

export class OffersError extends Error {}

export type FetchOffersInput = {
  /** Product axis: human-backed agent. World will set this after verify. */
  credential: boolean;
  /** Consented wallet / ENS for Graph bands. */
  address?: string;
  /** Debug only — synthesises signals; do not use on the stage race. */
  debugTier?: Tier;
};

/**
 * Product path: credential + address.
 * Debug path: optional debugTier (synthetic bands unless address overrides).
 */
export async function fetchOffers(
  input: FetchOffersInput,
): Promise<OffersResponse> {
  const params = new URLSearchParams();
  params.set("credential", input.credential ? "1" : "0");
  if (input.address?.trim()) params.set("address", input.address.trim());
  if (input.debugTier) params.set("tier", input.debugTier);

  const res = await fetch(`${GATEWAY}/offers?${params}`);
  if (!res.ok) {
    throw new OffersError(`the desk answered ${res.status}`);
  }
  return (await res.json()) as OffersResponse;
}
