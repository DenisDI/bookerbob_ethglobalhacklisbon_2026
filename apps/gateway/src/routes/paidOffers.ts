// POST /x402/paid-offers — race bot lane. Pays with Hedera operator keys via
// x402 (hedera:testnet HBAR), then returns the same body as GET /offers.
// Credentialed callers should not use this; they hit /offers free.

import type { Context } from "hono";
import { publicOrigin } from "../public-url.js";
import { paidOffersProxy } from "../x402.js";

export interface PaymentFacts {
  /** Running total for this payer after the query, from the gateway ledger. */
  spentUsd: number | null;
  paymentTxId: string | null;
  paymentTxUrl: string | null;
  payer: string | null;
}

/**
 * The payment facts travel in the body, not only in headers.
 *
 * They used to live in headers alone, and headers are the fragile half of a
 * response: a proxy can drop them, and a browser hides any it was not explicitly
 * told to expose, so a screen could show "paid, here is the HashScan link" next
 * to "$0.00, 0 queries" and both would be reading real data. Same payload, one
 * source, and the counter cannot disagree with the receipt.
 *
 * Nothing is invented here: a missing header stays null rather than becoming a
 * plausible number.
 */
export function withPaymentFacts(text: string, facts: PaymentFacts): string {
  try {
    const body = JSON.parse(text) as Record<string, unknown>;
    if (typeof body !== "object" || body === null) return text;
    return JSON.stringify({ ...body, ...facts });
  } catch {
    // An error body, or anything else we did not write. Pass it through
    // untouched rather than wrapping it in a shape the caller did not expect.
    return text;
  }
}

function readFacts(res: Response): PaymentFacts {
  const spentHeader = res.headers.get("x-bookerbob-spent-usd")?.trim();
  const spent = spentHeader ? Number(spentHeader) : Number.NaN;
  return {
    spentUsd: Number.isFinite(spent) ? spent : null,
    paymentTxId: res.headers.get("x-bookerbob-payment-tx")?.trim() || null,
    paymentTxUrl: res.headers.get("x-bookerbob-payment-tx-url")?.trim() || null,
    payer: res.headers.get("x-bookerbob-spent-payer")?.trim() || null,
  };
}

export async function paidOffersHandler(c: Context) {
  const body = (await c.req.json().catch(() => ({}))) as {
    city?: string;
    address?: string;
  };
  const query = new URLSearchParams();
  query.set("credential", "0");
  if (body.city?.trim()) query.set("city", body.city.trim());
  if (body.address?.trim()) query.set("address", body.address.trim());

  const origin = publicOrigin(c);
  const res = await paidOffersProxy(origin, query);
  const facts = readFacts(res);
  const text = await res.text();

  // A settled payment with no spend recorded means the two halves disagree, and
  // the screen would show a HashScan link beside a zero. Loud here, because it is
  // ours to fix and invisible to anybody looking at the UI.
  if (facts.paymentTxId && !(facts.spentUsd && facts.spentUsd > 0)) {
    console.warn(
      `x402: settled ${facts.paymentTxId} but the ledger reported ${facts.spentUsd}`,
    );
  }

  // HashScan headers are the proof the bot lane actually paid — do not drop them.
  return new Response(withPaymentFacts(text, facts), {
    status: res.status,
    headers: {
      "content-type": res.headers.get("content-type") ?? "application/json",
      "x-bookerbob-spent-usd": res.headers.get("x-bookerbob-spent-usd") ?? "",
      "x-bookerbob-spent-payer": res.headers.get("x-bookerbob-spent-payer") ?? "",
      "x-bookerbob-payment-tx": res.headers.get("x-bookerbob-payment-tx") ?? "",
      "x-bookerbob-payment-tx-url":
        res.headers.get("x-bookerbob-payment-tx-url") ?? "",
    },
  });
}
