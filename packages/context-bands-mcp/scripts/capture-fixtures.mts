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
  heavy: "0x62e2ceb6933a0747579f4f9f96d3253a7af0b237",
  broad: "0x561c75466c1568c2b581c5538b84039a44d186e7",
  faint: "0x646c5ba59f30cf73deea9b00e13aead674c6b07a",
  empty: "0x1111111111111111111111111111111111111111",
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
    responses[manifest.name] = await query<unknown>(
      payer,
      manifest.subgraphId,
      template.query,
      template.variables(address),
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
