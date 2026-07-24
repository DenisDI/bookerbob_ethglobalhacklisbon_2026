import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Skeleton. Per specs/02-context-bands-mcp.md the real server adds: manifest
// registry (registry/*.json), Messari query templates, freshness gating, band
// thresholds with rationale, keyless x402 to The Graph, offline fixture tests.
// Tool names and shapes are fixed here so consumers can wire against them now.

const NOT_WIRED = "skeleton: not wired to The Graph yet";

const server = new McpServer({ name: "context-bands-mcp", version: "0.1.0" });

server.registerTool(
  "get_context_bands",
  {
    description:
      "Coarse onchain activity bands (T1-T4) for an address. Bands only, never raw values.",
    inputSchema: { address: z.string().describe("EVM address, any case") },
  },
  async ({ address }) => ({
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            address: address.toLowerCase(),
            bands: null,
            freshness: [],
            source: "the-graph:messari-standardized",
            status: NOT_WIRED,
          },
          null,
          2,
        ),
      },
    ],
  }),
);

server.registerTool(
  "get_supported_subgraphs",
  {
    description: "Registry contents: which subgraphs this server can band.",
    inputSchema: {},
  },
  async () => ({
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({ subgraphs: [], status: NOT_WIRED }, null, 2),
      },
    ],
  }),
);

async function main() {
  const httpFlag = process.argv.includes("--http");
  if (httpFlag) {
    // HTTP transport lands with the registry step; stdio is the documented path.
    console.error("--http transport not implemented yet; run over stdio");
    process.exit(2);
  }
  await server.connect(new StdioServerTransport());
  console.error("context-bands-mcp ready on stdio");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
