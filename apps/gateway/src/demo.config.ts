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

  // No hotel is pinned for the finale on purpose. The card shows whichever
  // property the supplier actually held, because featuring a nicer hotel than
  // the one under the hold would put a booking on screen that does not exist.
} as const;

/** Checkout is the date the scheduled settlement targets. */
export const settlementDate = demo.checkout;
