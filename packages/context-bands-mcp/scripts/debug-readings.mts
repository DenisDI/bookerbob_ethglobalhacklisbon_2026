// Per-source readings for one address, so a surprising band can be traced to
// the source that produced it.
import { fileURLToPath } from "node:url";
import { loadRegistry } from "../src/registry.js";
import { TEMPLATES } from "../src/templates/index.js";
import { payerFromEnv, query } from "../src/graph.js";
import { normaliseAddress } from "../src/service.js";

try {
  process.loadEnvFile(fileURLToPath(new URL("../../../.env", import.meta.url)));
} catch {}

const address = normaliseAddress(process.argv[2] ?? "");
const payer = payerFromEnv();
if (!payer) throw new Error("GRAPH_API_KEY missing");

for (const manifest of loadRegistry()) {
  const template = TEMPLATES[manifest.schemaType];
  try {
    const data = await query<Record<string, unknown>>(
      payer,
      manifest.subgraphId,
      template.query,
      template.variables(address),
    );
    const reading = template.read(data, manifest.category);
    console.log(
      `${manifest.name.padEnd(22)} ${JSON.stringify(reading)}  raw=${JSON.stringify(data).slice(0, 120)}`,
    );
  } catch (err) {
    console.log(`${manifest.name.padEnd(22)} ERROR ${(err as Error).message}`);
  }
}
