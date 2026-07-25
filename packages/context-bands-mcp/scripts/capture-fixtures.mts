// Records real gateway responses into tests/fixtures/ so the test suite runs
// with no network and no API key. Staleness is not faked here: the tests reach
// it by advancing the clock against these same real responses.
//
//   npx tsx scripts/capture-fixtures.mts

import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { payerFromEnv, query } from "../src/graph.js";
import { loadRegistry } from "../src/registry.js";
import { normaliseAddress } from "../src/service.js";
import { TEMPLATES } from "../src/templates/index.js";

try {
  process.loadEnvFile(fileURLToPath(new URL("../../../.env", import.meta.url)));
} catch {}

const OUT = fileURLToPath(new URL("../tests/fixtures", import.meta.url));

const ADDRESSES: Record<string, string> = {
  // Long lending history with real repayments AND two liquidations behind it.
  heavy: "0x62e2ceb6933a0747579f4f9f96d3253a7af0b237",
  // Broad trader, never borrowed, carries an ENS name from 2022.
  broad: "0x561c75466c1568c2b581c5538b84039a44d186e7",
  // First deposit on the day of capture.
  faint: "0x646c5ba59f30cf73deea9b00e13aead674c6b07a",
  // Never used. Not a vanity address on purpose: 0x1111...1111 turned out to
  // hold Aave positions on Base and two 2017 ENS records, so it was anything
  // but empty.
  empty: "0x9a7c4f1e2b8d5063af71c9e34b2d8f60517ac3be",
  // vitalik.eth: what a judge will type. Name registered 2017.
  vitalik: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
};

const payer = payerFromEnv();
if (!payer) throw new Error("GRAPH_API_KEY missing");

mkdirSync(OUT, { recursive: true });
const registry = loadRegistry();

for (const [label, rawAddress] of Object.entries(ADDRESSES)) {
  const address = normaliseAddress(rawAddress);
  const responses: Record<string, unknown> = {};

  for (const manifest of registry) {
    const template = TEMPLATES[manifest.schemaType];
    if (!template) continue;
    responses[manifest.name] = await query<unknown>(
      payer,
      manifest.subgraphId,
      template.kind === "naming" ? template.reverseQuery : template.query,
      template.kind === "naming"
        ? template.reverseVariables(address)
        : template.variables(address),
    );
  }

  const file = {
    capturedAt: new Date().toISOString(),
    note: "Real gateway responses. Entity ids are trimmed to keep the file readable; only list lengths matter to the band engine.",
    address,
    responses,
  };

  writeFileSync(`${OUT}/${label}.json`, `${JSON.stringify(file, null, 2)}\n`);
  console.log(`${label}: ${address} -> ${Object.keys(responses).length} sources`);
}

// ENS on its own: the forward path a judge uses by typing a name, and the
// reverse path against an address that collects unresolvable label records.
const ensManifest = registry.find((m) => m.role === "naming");
const ensTemplate = ensManifest ? TEMPLATES[ensManifest.schemaType] : undefined;

if (ensManifest && ensTemplate?.kind === "naming") {
  const forward = await query<unknown>(
    payer,
    ensManifest.subgraphId,
    ensTemplate.forwardQuery,
    ensTemplate.forwardVariables("vitalik.eth"),
  );
  const junk = await query<unknown>(
    payer,
    ensManifest.subgraphId,
    ensTemplate.reverseQuery,
    ensTemplate.reverseVariables("0x1111111111111111111111111111111111111111"),
  );

  writeFileSync(
    `${OUT}/ens.json`,
    `${JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        note: "Forward resolution of a real name, plus a reverse lookup on an address that collects records whose label preimage the subgraph does not know.",
        forward: { name: "vitalik.eth", response: forward },
        junkReverse: {
          address: "0x1111111111111111111111111111111111111111",
          response: junk,
        },
      },
      null,
      2,
    )}\n`,
  );
  console.log("ens: forward + junk reverse captured");
}
