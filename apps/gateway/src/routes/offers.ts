// GET /offers — the main path: identity -> context -> terms -> inventory.
//
// Identity (AgentKit) and context bands land in later steps. Until then the
// only way to reach a non-bot tier is the ?tier= debug parameter, which
// synthesises SIGNALS and lets the real engine decide, so what a reviewer sees
// is the actual matrix rather than a canned answer.

import type { Context } from "hono";
import { lookupContext } from "../context.js";
import { demo } from "../demo.config.js";
import { createInventory, InventoryUnavailableError } from "../inventory/index.js";
import {
  Narrator,
  narrateHold,
  narrateSearch,
  narrateTerms,
} from "../narration.js";
import {
  debugSignals,
  decideTerms,
  earnsRateLock,
  offerLimit,
  type TermsSignals,
} from "../terms.js";

const inventory = createInventory();

/** No credential source is wired yet, so every real request is unbacked. */
const UNBACKED: TermsSignals = { hasCredential: false, context: null };

export async function offersHandler(c: Context) {
  const city = c.req.query("city")?.trim() || demo.city;
  const debugTier = c.req.query("tier")?.trim();
  const address = c.req.query("address")?.trim();

  // The two axes stay separate. ?tier= stands in for the credential until
  // AgentKit lands; ?address= is the consented context, and a real address
  // always overrides the synthetic bands the debug lever carries.
  const base = debugSignals(debugTier) ?? UNBACKED;
  const lookup = address ? await lookupContext(address) : null;
  const signals: TermsSignals = lookup
    ? { ...base, context: lookup.status === "ok" ? lookup.snapshot : null }
    : base;
  const lookupFailed = lookup?.status === "failed";

  const terms = decideTerms(signals);
  const limit = offerLimit(terms.inventory);

  const narrator = new Narrator();

  try {
    const result = await inventory.findAndPrebook({
      city,
      checkin: demo.checkin,
      checkout: demo.checkout,
      adults: demo.adults,
      topN: limit,
    });

    const offers = result.offers.slice(0, limit);
    // The lock is shown only to tiers whose payment term is a held price. A bot
    // prepays and a human leaves a deposit, so neither is told about a hold,
    // even though the supplier's one-shot call creates one.
    const hold = earnsRateLock(terms) ? result.hold : null;

    narrateSearch(narrator, city, result);
    narrateTerms(narrator, terms, offers.length, signals.context, lookupFailed);
    narrateHold(narrator, hold);

    return c.json({
      terms,
      city: result.city,
      checkin: result.checkin,
      checkout: result.checkout,
      nights: result.nights,
      matchingCount: result.matchingCount,
      offers,
      hold,
      source: result.source,
      capturedAt: result.capturedAt,
      // Bands and categories only, never the counts behind them.
      context: signals.context
        ? {
            address: signals.context.address,
            ens: signals.context.ens,
            since: signals.context.since,
            bands: signals.context.bands,
            signals: signals.context.signals,
            activeCategories: signals.context.activeCategories,
          }
        : null,
      narration: narrator.all(),
      debugTier: debugTier && debugSignals(debugTier) ? debugTier : undefined,
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
