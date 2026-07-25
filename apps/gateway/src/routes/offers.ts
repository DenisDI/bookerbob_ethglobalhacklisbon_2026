// GET /offers — the main path: identity -> context -> terms -> inventory.
//
// Product axes (separate):
//   ?credential=1|0     → hasCredential (World AgentKit/Selfie will own this)
//   ?address=           → Graph context bands (typed consent; anyone may type)
//   Authorization Bearer → Privy access token; binds address to "mine" when it
//                          matches a linked wallet. Without it, address stays typed.
// Debug only:
//   ?tier=bot|human|verified|elite → synthesises SIGNALS; real address overrides context

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
  contextAddress,
  publicWallet,
  resolveWalletConsent,
} from "../privy.js";
import { scheduleForHold } from "../settlement.js";
import { type Credential, getCredential, publicCredential } from "../world.js";
import {
  debugSignals,
  decide,
  earnsRateLock,
  offerLimit,
  type TermsSignals,
} from "../terms.js";

const inventory = createInventory();

function parseCredential(raw: string | undefined): boolean | null {
  if (raw === undefined || raw === "") return null;
  const v = raw.trim().toLowerCase();
  if (v === "1" || v === "true" || v === "yes") return true;
  if (v === "0" || v === "false" || v === "no") return false;
  return null;
}

export async function offersHandler(c: Context) {
  const city = c.req.query("city")?.trim() || demo.city;
  const debugTier = c.req.query("tier")?.trim();
  const requestedAddress = c.req.query("address")?.trim();
  const credentialFlag = parseCredential(c.req.query("credential") ?? undefined);

  // Only a verified AgentKit header may say "world". The browser flag and the
  // dev verifier are both stand-ins, permanently, and the response keeps them
  // distinguishable so nothing on screen can claim a partner integration that
  // has not run.
  // Resolved by the middleware, so the future paywall and this handler read one
  // answer instead of each working it out.
  const presented = getCredential(c);

  const credential: Credential =
    presented.status !== "missing"
      ? presented
      : credentialFlag === true
        ? { status: "stand_in" }
        : presented;

  // Privy Bearer → ownership. Typed ?address= without a matching token stays typed.
  const wallet = await resolveWalletConsent(
    c.req.header("authorization"),
    requestedAddress,
  );
  const address = contextAddress(requestedAddress, wallet);

  // Debug tier = canned signals for tests. Product path = credential + address.
  // Real address always overrides synthetic context below.
  const debug = debugSignals(debugTier);
  const hasCredential =
    credential.status !== "missing"
      ? true
      : credentialFlag !== null
        ? credentialFlag
        : (debug?.hasCredential ?? false);

  const base: TermsSignals = debug
    ? { ...debug, hasCredential }
    : { hasCredential, context: null };

  const lookup = address ? await lookupContext(address) : null;
  const signals: TermsSignals = lookup
    ? { ...base, context: lookup.status === "ok" ? lookup.snapshot : null }
    : base;
  const lookupFailed = lookup?.status === "failed";

  const { terms, reason } = decide(signals);
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
    const hold = earnsRateLock(terms) ? result.hold : null;

    // Guest settlement risk → Hedera schedule. Agent only triggered the ask.
    // Graph already influenced `terms` via `address` + lookupContext above.
    let scheduleUrl: string | null = null;
    let scheduleId: string | null = null;
    narrateSearch(narrator, city, result);
    narrateTerms(narrator, terms, offers.length, signals.context, lookupFailed);
    if (wallet.status === "verified") {
      narrator.say("wallet ownership checked — this address is theirs");
    } else if (wallet.status === "typed") {
      narrator.say("address was typed in, not proven owned");
    }
    narrateHold(narrator, hold);

    if (hold && earnsRateLock(terms)) {
      const settlement = await scheduleForHold({
        partnerOrderId: hold.partnerOrderId,
      });
      if (settlement) {
        scheduleUrl = settlement.scheduleUrl;
        scheduleId = settlement.scheduleId;
        narrator.say("rate locked. settlement scheduled for checkout day");
      }
    }

    return c.json({
      terms,
      reason,
      // One function owns what a credential looks like on the wire, so no route
      // can leak a humanId or a rejection reason by spreading the object.
      credential: publicCredential(credential),
      // Same honesty rule for the wallet axis: verified only after Privy check.
      wallet: publicWallet(wallet),
      city: result.city,
      checkin: result.checkin,
      checkout: result.checkout,
      nights: result.nights,
      matchingCount: result.matchingCount,
      offers,
      hold,
      scheduleId,
      scheduleUrl,
      source: result.source,
      capturedAt: result.capturedAt,
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
      // Echo so the UI can show the pipeline without guessing.
      hasCredential: signals.hasCredential,
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
