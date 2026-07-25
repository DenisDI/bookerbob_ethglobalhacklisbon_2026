#!/usr/bin/env -S npx tsx
// An agent that actually presents a World credential, rather than a checkbox in
// a browser saying it has one.
//
// It signs an AgentKit header with the registered agent wallet and calls
// /offers with it. The gateway parses the header, checks it was issued for that
// resource, verifies the signature and looks the wallet up in the AgentBook on
// World Chain. Whatever comes back is printed as-is, including a refusal: an
// unregistered wallet is a real outcome, not a failure of the script.
//
// This is the World artefact. Two agents, the same prompt, and the only
// difference is whether a human stands behind one of them.
//
//   npx tsx scripts/agent-with-credential.ts [address-or-name]
//
// NOTE ON WHAT WE DO NOT USE. declareAgentkitExtension accepts
// `mode: { type: "discount", percent }`. That is the shape the prize rules
// disqualify, so the credential here changes risk terms and never price. See
// docs/FEEDBACK-world.md.

import { createAgentkitClient, declareAgentkitExtension } from "@worldcoin/agentkit";
import { fileURLToPath } from "node:url";
import { privateKeyToAccount } from "viem/accounts";

try {
  process.loadEnvFile(fileURLToPath(new URL("../.env", import.meta.url)));
} catch {
  // Exported environment is fine too.
}

const KEY = process.env.LISBON2026_AGENT_PRIVATE_KEY?.trim();
const GATEWAY = process.env.LISBON2026_GATEWAY_URL?.trim() || "http://localhost:3000";
/** World Chain: the AgentBook always resolves there, whatever chain signed. */
const CHAIN = "eip155:480";

if (!KEY) {
  console.error(
    "LISBON2026_AGENT_PRIVATE_KEY is not set. Generate an agent wallet, register\n" +
      "it with `npx @worldcoin/agentkit-cli register <address>` and approve in\n" +
      "World App, then put the key in .env. Nothing else is missing.",
  );
  process.exit(2);
}

const account = privateKeyToAccount(KEY as `0x${string}`);
const resource = `${GATEWAY}/offers`;

const client = createAgentkitClient({
  signer: {
    address: account.address,
    chainId: CHAIN,
    type: "eip191",
    signMessage: (message) => account.signMessage({ message }),
  },
  onEvent: (event) => console.log(`  · ${event.type}`),
});

// declareAgentkitExtension is the SERVER side of the handshake: it advertises
// what a resource accepts and deliberately leaves `nonce` and `issuedAt` empty,
// because in the x402 flow the server issues those in its 402 challenge.
// createHeader requires them, so a header-only client has to mint them itself.
// Getting this wrong reads as "Invalid agentkit header: nonce: Required,
// issuedAt: Required", which is accurate but does not say whose job they are.
const declared = declareAgentkitExtension({
  // Hostname WITHOUT the port: the validator derives the expected domain from
  // the resource URI that way, even though SIWE domains conventionally carry it.
  domain: new URL(GATEWAY).hostname,
  resourceUri: resource,
  statement: "book a room on behalf of the human backing this agent",
  network: CHAIN,
});
const base = Object.values(declared)[0];
if (!base) throw new Error("agentkit extension was not declared");

const extension = {
  ...base,
  info: {
    ...base.info,
    nonce: crypto.randomUUID().replace(/-/g, ""),
    issuedAt: new Date().toISOString(),
  },
};

console.log(`agent wallet: ${account.address}`);
console.log(`resource:     ${resource}`);

const started = Date.now();
const header = await client.createHeader(extension);
console.log(`header built in ${Date.now() - started}ms, ${header.length} chars`);

const address = process.argv[2] ?? "vitalik.eth";
const url = `${resource}?address=${encodeURIComponent(address)}`;

const res = await fetch(url, { headers: { agentkit: header } });
const body = (await res.json()) as {
  credential?: { status: string; source?: string };
  terms?: { tier: string; payment: string };
  reason?: string;
};

console.log(`\nHTTP ${res.status} in ${Date.now() - started}ms`);
console.log(`credential: ${JSON.stringify(body.credential)}`);
console.log(`terms:      ${body.terms?.tier} · ${body.terms?.payment}`);
console.log(`reason:     ${body.reason}`);

if (body.credential?.status !== "verified") {
  console.log(
    "\nNot verified. The signature path ran; what is missing is the AgentBook\n" +
      "entry for this wallet. Register it and run this again: nothing in the\n" +
      "gateway changes, and only then does World count as a working integration.",
  );
}
