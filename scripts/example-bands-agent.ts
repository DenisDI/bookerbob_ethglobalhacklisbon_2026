#!/usr/bin/env -S npx tsx
// A second consumer, deliberately unrelated to FairTerms: a token-gated group
// chat that decides who gets in. It talks to context-bands-mcp over stdio like
// any other MCP client, and knows nothing about hotels, terms or payments.
//
//   npx tsx scripts/example-bands-agent.ts 0x62e2ceb6933a0747579f4f9f96d3253a7af0b237

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const address = process.argv[2] ?? "0x62e2ceb6933a0747579f4f9f96d3253a7af0b237";
const ADMITS = new Set(["T2", "T3", "T4"]);

const client = new Client({ name: "gated-room", version: "1.0.0" });
await client.connect(
  new StdioClientTransport({ command: "npx", args: ["context-bands-mcp"] }),
);

const res = await client.callTool({
  name: "get_context_bands",
  arguments: { address },
});
const { bands, activeCategories } = JSON.parse(
  (res.content as Array<{ text: string }>)[0]!.text,
) as { bands: Record<string, string>; activeCategories: string[] };

const band = bands.defi_activity ?? "unavailable";
if (band === "unavailable") {
  // The gate refuses to guess when the data is stale, rather than admitting or
  // rejecting on a fiction.
  console.log(`${address}: cannot check right now, try again later`);
} else if (ADMITS.has(band)) {
  console.log(`${address}: welcome in (${band}, active in ${activeCategories.join(", ")})`);
} else {
  console.log(`${address}: not enough of a track record yet (${band})`);
}

await client.close();
