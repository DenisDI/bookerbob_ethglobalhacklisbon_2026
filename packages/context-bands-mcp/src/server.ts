import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { loadRegistry, loadRetired } from "./registry.js";
import {
  AddressError,
  getContextBands,
  NoPayerError,
  resolveName,
} from "./service.js";

// Convenience for running inside this monorepo. Standalone users export
// GRAPH_API_KEY themselves, and shell values win either way.
try {
  process.loadEnvFile(fileURLToPath(new URL("../../../.env", import.meta.url)));
} catch {
  // No .env: the service will say what is missing if nothing is exported.
}

// Two tools, documented with real schemas in SKILL.md. Output is bands and
// categories only: no balances, no counts, no dollar values.

const server = new McpServer({ name: "context-bands-mcp", version: "0.1.0" });

function json(value: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
  };
}

server.registerTool(
  "get_context_bands",
  {
    description:
      "Underwriting bands for an EVM address or ENS name, from live subgraphs on The Graph. Returns four coarse bands (activity, tenure, breadth, scale), a repayment signal, and the categories the address is active in. Never raw values. A stale source reports 'unavailable' rather than a guess.",
    inputSchema: {
      address: z.string().describe("EVM address or ENS name, e.g. vitalik.eth"),
    },
  },
  async ({ address }) => {
    try {
      return json(await getContextBands(address));
    } catch (err) {
      if (err instanceof AddressError || err instanceof NoPayerError) {
        return {
          isError: true,
          content: [{ type: "text" as const, text: err.message }],
        };
      }
      throw err;
    }
  },
);

server.registerTool(
  "resolve_name",
  {
    description:
      "Resolve an ENS name to an address, with the date the name was registered. Useful on its own: a person types words, a contract needs hex.",
    inputSchema: { name: z.string().describe("ENS name, e.g. vitalik.eth") },
  },
  async ({ name }) => {
    const resolved = await resolveName(name);
    if (!resolved) {
      return {
        isError: true,
        content: [{ type: "text" as const, text: `${name} does not resolve` }],
      };
    }
    return json({ name: resolved.record.name, ...resolved });
  },
);

server.registerTool(
  "get_supported_subgraphs",
  {
    description:
      "Registry contents: which subgraphs this server reads, which schema each speaks, and which sources were retired and why.",
    inputSchema: {},
  },
  async () => json({ active: loadRegistry(), retired: loadRetired() }),
);

/** `--http` or `--http 3005`; falls back to MCP_HTTP_PORT, then 3001. */
function httpPort(argv: string[]): number | null {
  const at = argv.indexOf("--http");
  if (at === -1) return null;
  const next = argv[at + 1];
  const explicit = next && !next.startsWith("-") ? Number(next.replace(":", "")) : NaN;
  if (Number.isFinite(explicit)) return explicit;
  const fromEnv = Number(process.env.MCP_HTTP_PORT);
  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : 3001;
}

async function main() {
  const port = httpPort(process.argv);
  if (port !== null) {
    const { serveHttp } = await import("./http.js");
    await serveHttp(server, port);
    return;
  }
  await server.connect(new StdioServerTransport());
  console.error("context-bands-mcp ready on stdio");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
