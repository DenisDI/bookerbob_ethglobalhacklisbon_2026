// POST /x402/paid-offers — race bot lane. Pays with Hedera operator keys via
// x402 (hedera:testnet HBAR), then returns the same body as GET /offers.
// Credentialed callers should not use this; they hit /offers free.

import type { Context } from "hono";
import { publicOrigin } from "../public-url.js";
import { paidOffersProxy } from "../x402.js";

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
  const text = await res.text();
  // HashScan headers are the proof the bot lane actually paid — do not drop them.
  return new Response(text, {
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
