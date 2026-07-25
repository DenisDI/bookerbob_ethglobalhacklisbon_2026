// GET /offers — the main path: identity -> context -> terms -> inventory.
//
// This step wires the inventory leg only. Identity (AgentKit), context bands,
// and the real terms engine land in later steps, so every request is treated as
// an unbacked agent: bot tier, short list, pay in full. The response shape is
// already the final one so the web demo and later steps do not have to reshape it.

import type { Context } from "hono";
import { demo } from "../demo.config.js";
import { createInventory, InventoryUnavailableError } from "../inventory/index.js";
import {
  Narrator,
  narrateHold,
  narrateSearch,
  narrateTerms,
} from "../narration.js";
import type { Terms } from "../types.js";

const inventory = createInventory();

/** Step 3 replaces this with the real underwriting matrix. */
const BOT_TERMS: Terms = {
  tier: "bot",
  inventory: "basic",
  payment: "prepay_100",
};

export async function offersHandler(c: Context) {
  const city = c.req.query("city")?.trim() || demo.city;
  const narrator = new Narrator();

  try {
    const result = await inventory.findAndPrebook({
      city,
      checkin: demo.checkin,
      checkout: demo.checkout,
      adults: demo.adults,
      topN: demo.botOfferCount,
    });

    const offers = result.offers.slice(0, demo.botOfferCount);
    // A bot prepays in full, so it is shown no rate lock — and is not told
    // about one either. The supplier's one-shot call holds a rate anyway;
    // later steps use the granular search path for this tier so no hold is
    // created needlessly.
    const surfacedHold = BOT_TERMS.tier === "bot" ? null : result.hold;

    narrateSearch(narrator, city, result);
    narrateTerms(narrator, BOT_TERMS, offers.length);
    narrateHold(narrator, surfacedHold);

    return c.json({
      terms: BOT_TERMS,
      city: result.city,
      checkin: result.checkin,
      checkout: result.checkout,
      nights: result.nights,
      matchingCount: result.matchingCount,
      offers,
      hold: surfacedHold,
      source: result.source,
      capturedAt: result.capturedAt,
      narration: narrator.all(),
    });
  } catch (err) {
    if (err instanceof InventoryUnavailableError) {
      narrator.say("i cannot reach the desk and i have nothing written down");
      return c.json(
        {
          error: "inventory_unavailable",
          causes: err.causes,
          narration: narrator.all(),
        },
        503,
      );
    }
    throw err;
  }
}
