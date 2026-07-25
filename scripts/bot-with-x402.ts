#!/usr/bin/env -S npx tsx
// Anonymous bot: pays 0.01 HBAR on Hedera testnet via x402, then reads /offers.
//
//   npm run bot:x402
//
// Needs LISBON2026_HEDERA_ACCOUNT_ID + _PRIVATE_KEY (funded testnet) and
// LISBON2026_X402_PAYTO_ACCOUNT on the gateway (receiver account id).

import { wrapFetchWithPayment } from "@x402/fetch";
import { x402Client, x402HTTPClient } from "@x402/core/client";
import {
  createClientHederaSigner,
  PrivateKey as HederaPrivateKey,
} from "@x402/hedera";
import { ExactHederaScheme } from "@x402/hedera/exact/client";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

function loadDotEnv(path: string): void {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadDotEnv(fileURLToPath(new URL("../.env", import.meta.url)));

const GATEWAY =
  process.env.LISBON2026_GATEWAY_URL?.trim() || "http://localhost:3000";
const accountId = process.env.LISBON2026_HEDERA_ACCOUNT_ID?.trim();
const privateKey = process.env.LISBON2026_HEDERA_PRIVATE_KEY?.trim();
if (!accountId || !privateKey) {
  console.error(
    "LISBON2026_HEDERA_ACCOUNT_ID and LISBON2026_HEDERA_PRIVATE_KEY are required",
  );
  process.exit(2);
}

let signer;
try {
  signer = createClientHederaSigner(
    accountId,
    HederaPrivateKey.fromStringECDSA(privateKey),
    { network: "hedera:testnet" },
  );
} catch {
  signer = createClientHederaSigner(
    accountId,
    HederaPrivateKey.fromStringED25519(privateKey),
    { network: "hedera:testnet" },
  );
}

const client = new x402Client().register(
  "hedera:*",
  new ExactHederaScheme(signer),
);
const fetchPaid = wrapFetchWithPayment(fetch, client);
const httpClient = new x402HTTPClient(client);

const url = `${GATEWAY.replace(/\/$/, "")}/offers?credential=0`;
console.log(`payer   ${accountId}`);
console.log(`GET     ${url}`);

const started = Date.now();
const res = await fetchPaid(url);
const body = (await res.json()) as {
  terms?: { tier: string; payment: string };
  credential?: { status: string };
  error?: string;
};
console.log(`HTTP ${res.status} in ${Date.now() - started}ms`);
console.log(`credential ${JSON.stringify(body.credential)}`);
console.log(`terms      ${body.terms?.tier} · ${body.terms?.payment}`);

const settlement = httpClient.getPaymentSettleResponse((name) =>
  res.headers.get(name),
);
if (settlement) {
  console.log("settlement", {
    success: settlement.success,
    transaction: settlement.transaction,
    payer: settlement.payer,
  });
}

if (!res.ok) {
  console.error(body);
  process.exit(1);
}

const spent = await fetch(`${GATEWAY.replace(/\/$/, "")}/spent`);
console.log(`spent     ${await spent.text()}`);
