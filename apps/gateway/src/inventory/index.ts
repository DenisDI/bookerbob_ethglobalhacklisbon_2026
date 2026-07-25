// Inventory adapter: one interface, two interchangeable sources.
//
// PENDING: the live path stays unannounced in the submission until the
// organizer sign-off lands in docs/DISCLOSURE-SIGNOFF.md (00-final-plan A.3).
// The captured snapshot needs no sign-off, so the demo is buildable either way.
//
// The live booker is primary. The captured snapshot is the second in-event
// source required by specs/00-final-plan.md A.3 — it exists so a slow or
// unreachable supplier cannot kill the demo mid-run. Callers always learn
// which source answered, and the UI badges a cached answer honestly.

import { env } from "../env.js";
import type { InventoryQuery, InventoryResult } from "../types.js";
import { BookerError, bookHotel, findAndPrebook } from "./booker.js";
import { fixtureHotelInfo, fromFixture } from "./fixtures.js";

export class InventoryUnavailableError extends Error {
  constructor(
    message: string,
    readonly causes: string[],
  ) {
    super(message);
    this.name = "InventoryUnavailableError";
  }
}

/**
 * get_hotel_info is failing upstream ("can't subtract offset-naive and
 * offset-aware datetimes"), which leaves live offers with no name or photo.
 * Prices stay live; only the static metadata comes from the snapshot. Drop this
 * once the booker fixes the tool.
 */
function fillMetadata(result: InventoryResult): InventoryResult {
  if (result.offers.every((o) => o.name && o.photoUrl)) return result;

  const meta = fixtureHotelInfo();
  if (meta.size === 0) return result;

  return {
    ...result,
    offers: result.offers.map((offer) => {
      const known = meta.get(offer.hotelId);
      if (!known) return offer;
      return {
        ...offer,
        name: offer.name ?? known.name ?? null,
        stars: offer.stars ?? known.star_rating ?? null,
        address: offer.address ?? known.address ?? null,
        photoUrl: offer.photoUrl ?? known.images?.[0] ?? null,
      };
    }),
  };
}

export interface Inventory {
  /** Search, pick, and hold a rate. Falls back per INVENTORY_SOURCE. */
  findAndPrebook(query: InventoryQuery): Promise<InventoryResult>;
  /** Seam for real bookings; refuses while the service is prebook-only. */
  book(): Promise<never>;
}

export function createInventory(): Inventory {
  return {
    async findAndPrebook(query) {
      const mode = env.inventorySource;

      if (mode === "cached") return fromFixture(query);

      try {
        return fillMetadata(await findAndPrebook(query));
      } catch (liveError) {
        const reason =
          liveError instanceof BookerError
            ? `${liveError.code}: ${liveError.message}`
            : String(liveError);

        if (mode === "live") {
          throw new InventoryUnavailableError(
            "live inventory failed and INVENTORY_SOURCE=live forbids the snapshot",
            [reason],
          );
        }

        try {
          return fromFixture(query);
        } catch (fixtureError) {
          throw new InventoryUnavailableError(
            "both inventory sources failed",
            [reason, String(fixtureError)],
          );
        }
      }
    },

    book: bookHotel,
  };
}
