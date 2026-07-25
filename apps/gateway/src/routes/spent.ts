import type { Context } from "hono";
import { demoPayerAddress, x402Configured, x402Meta } from "../x402.js";
import { spentFor } from "../spent.js";

export async function spentHandler(c: Context) {
  const payer = c.req.query("payer")?.trim();
  const tally = spentFor(payer);
  return c.json({
    ...tally,
    queryPriceUsd: x402Meta.priceUsd,
    x402: {
      configured: x402Configured(),
      network: x402Meta.network,
      price: x402Meta.price,
      demoPayer: demoPayerAddress(),
    },
  });
}
