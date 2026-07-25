// Bot metering via x402 on Hedera testnet (hedera:testnet), settled in HBAR.
//
// Credentialed requests skip the wall (AgentKit verified or ?credential=1 stand-in).
// Anonymous /offers must present a PAYMENT-SIGNATURE, or the race may use
// POST /x402/paid-offers which pays with LISBON2026_HEDERA_* (demo operator).
//
// Pattern: matevszm/x402-hedera-example — server holds no settle key; Blocky402
// facilitator is the fee-payer. payTo is a Hedera account id (0.0.x).

import { transactionUrl } from "@bookerbob/hedera-schedule";
import { x402Client, x402HTTPClient } from "@x402/core/client";
import {
  HTTPFacilitatorClient,
  x402ResourceServer,
  type RoutesConfig,
} from "@x402/core/server";
import type { Network } from "@x402/core/types";
import { wrapFetchWithPayment } from "@x402/fetch";
import {
  createClientHederaSigner,
  HBAR_ASSET_ID,
  HEDERA_TESTNET_CAIP2,
  PrivateKey as HederaPrivateKey,
} from "@x402/hedera";
import { ExactHederaScheme as ExactHederaClientScheme } from "@x402/hedera/exact/client";
import { ExactHederaScheme } from "@x402/hedera/exact/server";
import { paymentMiddleware } from "@x402/hono";
import type { Context, MiddlewareHandler } from "hono";
import { getCredential } from "./world.js";
import { QUERY_PRICE_USD, recordSpend } from "./spent.js";

const NETWORK = HEDERA_TESTNET_CAIP2 as Network; // "hedera:testnet"
const FACILITATOR =
  process.env.LISBON2026_X402_FACILITATOR_URL?.trim() ||
  "https://api.testnet.blocky402.com";
/** 0.01 HBAR in tinybars (1 HBAR = 1e8). */
const PRICE_ATOMIC = "1000000";
const PRICE_LABEL = "0.01 HBAR";

const ACCOUNT_ID = /^\d+\.\d+\.\d+$/;
const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/;

// Blocky402 rejects bare EVM aliases as payTo — use the entity id. Map known
// testnet receivers so LISBON2026_X402_PAYTO_ACCOUNT can be either form.
const EVM_TO_ACCOUNT: Record<string, string> = {
  // Legacy alias that previously mapped to 0.0.9700187 — payments now target
  // LISBON2026_X402_PAYTO_ACCOUNT (default receiver: 0.0.9692348).
  "0xdccb15a7c3d3d7f603d41e2a21add3ed1136e86a": "0.0.9692348",
};

function payTo(): string | null {
  const raw =
    process.env.LISBON2026_X402_PAYTO_ACCOUNT?.trim() ||
    process.env.LISBON2026_HEDERA_PAYEE_ACCOUNT_ID?.trim() ||
    "";
  if (!raw) return null;
  if (ACCOUNT_ID.test(raw)) return raw;
  if (EVM_ADDRESS.test(raw)) {
    const mapped = EVM_TO_ACCOUNT[raw.toLowerCase()];
    if (mapped) return mapped;
    console.warn(
      `x402: EVM payTo ${raw} has no entity-id map — set 0.0.x (mirror /api/v1/accounts/<0x>)`,
    );
    return null;
  }
  return null;
}

function demoPayer(): { accountId: string; privateKey: string } | null {
  const accountId = process.env.LISBON2026_HEDERA_ACCOUNT_ID?.trim() || "";
  const privateKey = process.env.LISBON2026_HEDERA_PRIVATE_KEY?.trim() || "";
  if (!accountId || !privateKey || !ACCOUNT_ID.test(accountId)) return null;
  return { accountId, privateKey };
}

/** True when this request must clear the paywall before /offers. */
export function shouldMeter(c: Context): boolean {
  const cred = getCredential(c);
  if (cred.status !== "missing") return false;
  const flag = c.req.query("credential")?.trim().toLowerCase();
  if (flag === "1" || flag === "true" || flag === "yes") return false;
  return true;
}

export function x402Configured(): boolean {
  return payTo() != null;
}

export function demoPayerAddress(): string | null {
  return demoPayer()?.accountId ?? null;
}

function buildServer() {
  const to = payTo();
  if (!to) return null;
  const facilitator = new HTTPFacilitatorClient({ url: FACILITATOR });
  const server = new x402ResourceServer(facilitator).register(
    "hedera:*",
    new ExactHederaScheme(),
  );
  const routes: RoutesConfig = {
    "GET /offers": {
      accepts: {
        scheme: "exact",
        price: { amount: PRICE_ATOMIC, asset: HBAR_ASSET_ID },
        network: NETWORK,
        payTo: to,
        maxTimeoutSeconds: 180,
      },
      description: "hotel offers — bot metering (Hedera HBAR)",
      mimeType: "application/json",
    },
  };
  return { server, routes, payTo: to };
}

/**
 * Skip when credentialed; otherwise enforce x402. If PAYTO is unset the wall
 * is off and we log once — local Graph work should not hard-fail.
 */
export function meteringMiddleware(): MiddlewareHandler {
  const built = buildServer();
  if (!built) {
    console.warn(
      "x402: LISBON2026_X402_PAYTO_ACCOUNT unset — paywall off (offers free)",
    );
    return async (_c, next) => next();
  }

  const paid = paymentMiddleware(built.routes, built.server);

  return async (c, next) => {
    if (c.req.path !== "/offers" || c.req.method !== "GET") {
      return next();
    }
    if (!shouldMeter(c)) {
      return next();
    }

    return paid(c, async () => {
      const payer =
        c.req.header("x-payment-payer") ||
        c.req.header("payment-payer") ||
        demoPayerAddress() ||
        "x402-payer";
      const entry = recordSpend(payer, QUERY_PRICE_USD);
      c.header("x-bookerbob-spent-usd", String(entry.usd));
      c.header("x-bookerbob-spent-payer", payer);
      await next();
    });
  };
}

function hederaSigner(accountId: string, privateKey: string) {
  // Portal defaults are ECDSA; ED25519 accounts need fromStringED25519.
  try {
    return createClientHederaSigner(
      accountId,
      HederaPrivateKey.fromStringECDSA(privateKey),
      { network: NETWORK },
    );
  } catch {
    return createClientHederaSigner(
      accountId,
      HederaPrivateKey.fromStringED25519(privateKey),
      { network: NETWORK },
    );
  }
}

/** Pull settlement tx id from PAYMENT-RESPONSE (Hedera: transaction or transactionId). */
function settlementTxId(settlement: {
  success?: boolean;
  transaction?: string;
  transactionId?: string;
} | null): string | null {
  if (!settlement?.success) return null;
  const raw = settlement.transaction || settlement.transactionId || "";
  const id = String(raw).trim();
  return id.length > 0 ? id : null;
}

/**
 * Race helper: pay with the demo Hedera account then return /offers.
 * Real agents should hit /offers with their own PAYMENT-SIGNATURE instead.
 *
 * Forwards HashScan headers so LANE A can link a real testnet transfer, not a
 * client-side fake counter.
 */
export async function paidOffersProxy(
  origin: string,
  query: URLSearchParams,
): Promise<Response> {
  query.set("credential", "0");
  const url = `${origin.replace(/\/$/, "")}/offers?${query.toString()}`;

  if (!x402Configured()) {
    // No paywall → no claim of payment. Soft local for inventory only.
    const res = await fetch(url);
    const headers = new Headers(res.headers);
    headers.set("x-bookerbob-spent-usd", "0");
    headers.set("x-bookerbob-spent-payer", "unmetered");
    return new Response(res.body, { status: res.status, headers });
  }

  const payer = demoPayer();
  if (!payer) {
    return Response.json(
      {
        error: "demo_payer_unset",
        message:
          "LISBON2026_HEDERA_ACCOUNT_ID + LISBON2026_HEDERA_PRIVATE_KEY required for the race bot lane (Hedera testnet HBAR)",
      },
      { status: 503 },
    );
  }

  const signer = hederaSigner(payer.accountId, payer.privateKey);
  const client = new x402Client().register(
    "hedera:*",
    new ExactHederaClientScheme(signer),
  );
  const fetchPaid = wrapFetchWithPayment(fetch, client);
  const res = await fetchPaid(url);

  const httpClient = new x402HTTPClient(client);
  const settlement = httpClient.getPaymentSettleResponse((name) =>
    res.headers.get(name),
  );
  const txId = settlementTxId(settlement);
  const headers = new Headers(res.headers);

  if (txId) {
    headers.set("x-bookerbob-payment-tx", txId);
    headers.set("x-bookerbob-payment-tx-url", transactionUrl(txId));
  } else if (res.ok) {
    // Paid path without a settle receipt must not look like a real payment.
    console.warn("x402: /offers succeeded but PAYMENT-RESPONSE had no tx id");
  }

  if (settlement?.payer) {
    headers.set("x-bookerbob-spent-payer", String(settlement.payer));
  }

  return new Response(res.body, { status: res.status, headers });
}

export const x402Meta = {
  network: NETWORK,
  price: PRICE_LABEL,
  priceUsd: QUERY_PRICE_USD,
  priceAtomic: PRICE_ATOMIC,
  asset: HBAR_ASSET_ID,
  facilitator: FACILITATOR,
};
