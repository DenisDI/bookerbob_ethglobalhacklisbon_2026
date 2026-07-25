// Consented onchain context, read through the standalone MCP rather than by
// importing its internals. That keeps the boundary honest: the MCP is a product
// on its own, and this gateway is just one of its clients.
//
// The server is spawned once and reused. Starting a child process per request
// would add seconds to every offer, and the demo runs on stage.

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type {
  Band,
  BandName,
  ContextSnapshot,
  RepaymentSignal,
} from "./types.js";

/** Five subgraphs, each with one retry. Measured around 2-4s in practice. */
const LOOKUP_TIMEOUT_MS = 20_000;

let clientPromise: Promise<Client> | null = null;

async function connect(): Promise<Client> {
  const client = new Client({ name: "fairterms-gateway", version: "0.1.0" });
  await client.connect(
    new StdioClientTransport({ command: "npx", args: ["context-bands-mcp"] }),
  );
  return client;
}

function client(): Promise<Client> {
  if (!clientPromise) {
    clientPromise = connect().catch((err) => {
      // Let the next request try again instead of poisoning the singleton.
      clientPromise = null;
      throw err;
    });
  }
  return clientPromise;
}

interface BandsPayload {
  address: string;
  ens: { name: string; createdAt: number | null } | null;
  since: number | null;
  bands: Record<BandName, Band>;
  signals: { repayment: RepaymentSignal };
  activeCategories: string[];
}

/**
 * Returns null when the address cannot be read at all. Null means "we do not
 * know", which the terms engine treats as no context rather than as an empty
 * wallet, so a broken lookup never costs a guest their human terms.
 */
export async function getContextSnapshot(
  /** An address or an ENS name; the MCP resolves either. */
  address: string,
): Promise<ContextSnapshot | null> {
  try {
    const mcp = await client();
    const res = await mcp.callTool(
      { name: "get_context_bands", arguments: { address } },
      undefined,
      { timeout: LOOKUP_TIMEOUT_MS },
    );

    if (res.isError) return null;

    const text = Array.isArray(res.content)
      ? ((res.content[0] as { text?: string })?.text ?? "")
      : "";
    if (!text) return null;

    const payload = JSON.parse(text) as BandsPayload;
    return {
      address: payload.address,
      ens: payload.ens ?? null,
      since: payload.since ?? null,
      bands: payload.bands,
      signals: payload.signals,
      activeCategories: payload.activeCategories,
    };
  } catch (err) {
    console.warn(`context lookup failed for ${address}: ${(err as Error).message}`);
    return null;
  }
}

export async function closeContext(): Promise<void> {
  if (!clientPromise) return;
  const pending = clientPromise;
  clientPromise = null;
  await pending.then((c) => c.close()).catch(() => {});
}
