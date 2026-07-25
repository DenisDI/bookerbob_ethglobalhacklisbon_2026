import type { Offer } from "./types";

/**
 * Some properties come back without metadata, so fall back to the supplier's
 * own id rather than showing a blank or inventing a name. Reads as a real
 * property, which it is.
 */
export function displayName(offer: Offer): string {
  if (offer.name) return offer.name;
  return offer.hotelId
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function starsLabel(stars: number | null): string {
  return stars ? "★".repeat(stars) : "";
}
