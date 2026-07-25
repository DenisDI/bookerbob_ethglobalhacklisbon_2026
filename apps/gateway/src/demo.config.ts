// Pinned demo parameters. Nothing on stage is live-searched for an unchecked
// city: Lisbon was verified against the live booker on 2026-07-25 (region_id
// 2080, 10 matching hotels for this window).

export const demo = {
  city: "Lisbon",
  /** ISO with a 4-digit year — the supplier rejects anything looser. */
  checkin: "2026-08-14",
  checkout: "2026-08-17",
  adults: 2,

  /**
   * Depth to capture into the snapshot. Must be at least the largest
   * offerLimit() in terms.ts, otherwise the cached source cannot serve the
   * full-inventory tiers and every tier looks identical offline.
   */
  captureTopN: 10,

  /**
   * Preferred hotel for the finale card: 4 stars and 6 photos, which reads far
   * better on camera than the cheapest match. The one-shot call picks the best
   * price, so this is the id to enrich and feature, not to force.
   */
  finaleHotelId: "neya_lisboa_hotel",
} as const;

/** Checkout is the date the scheduled settlement targets. */
export const settlementDate = demo.checkout;
