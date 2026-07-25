// Consented onchain context, read through the standalone MCP rather than by
// importing its internals. That keeps the boundary honest: the MCP is a product
// on its own, and this gateway is just one of its clients.
//
// The server is spawned once and reused. Starting a child process per request
// would add seconds to every offer, and the demo runs on stage.

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { createRequire } from "node:module";
import type {
  Band,
  BandName,
  ContextSnapshot,
  RepaymentSignal,
} from "./types.js";

/** Six subgraphs, each with one retry. Measured around 2-4s in practice. */
const LOOKUP_TIMEOUT_MS = 20_000;

/**
 * Long enough that the two panes of one race share a single sweep, short enough
 * that a judge retyping an address a minute later sees live data. Without it a
 * single run costs twelve gateway queries instead of six.
 */
const CACHE_TTL_MS = 60_000;

/**
 * Resolve the server's own entry point instead of shelling out to npx. npx would
 * work here, but if the workspace bin link were ever missing it would try to
 * download a package named context-bands-mcp from the public registry, where it
 * does not exist, and fail with something unrelated to the real problem.
 */
function serverEntry(): string {
  const require = createRequire(import.meta.url);
  return require.resolve("context-bands-mcp/bin/context-bands-mcp.mjs");
}

/**
 * The child gets exactly what it needs and nothing else.
 *
 * This is not defensive tidiness: StdioClientTransport passes only HOME, LOGNAME,
 * PATH, SHELL, TERM and USER by default, so a Graph key held in our process
 * never reached the server. Locally that went unnoticed because the package also
 * reads .env off disk. In a container there is no .env, secrets arrive as
 * environment variables, and every context lookup would have failed while the
 * demo quietly served human terms instead.
 *
 * Forwarding the whole parent environment would fix it too, and would hand a
 * subprocess the booker token and the Hedera keys for no reason.
 */
function childEnv(): Record<string, string> {
  const needed = [
    "HOME",
    "LOGNAME",
    "PATH",
    "SHELL",
    "TERM",
    "USER",
    "LISBON2026_GRAPH_API_KEY",
    "GRAPH_API_KEY",
    "LISBON2026_GRAPH_USDC_KEY",
  ];
  const env: Record<string, string> = {};
  for (const key of needed) {
    const value = process.env[key];
    if (value) env[key] = value;
  }
  return env;
}

let clientPromise: Promise<Client> | null = null;

async function connect(): Promise<Client> {
  const client = new Client({ name: "fairterms-gateway", version: "0.1.0" });
  await client.connect(
    new StdioClientTransport({
      command: process.execPath,
      args: [serverEntry()],
      env: childEnv(),
    }),
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
 * "We asked and could not get an answer" is a different fact from "nobody gave
 * us an address", and the demo says one of those out loud. Collapsing both into
 * null made the narration claim no wallet was shared when one had been.
 */
export type ContextLookup =
  | { status: "ok"; snapshot: ContextSnapshot }
  | { status: "failed"; reason: string };

const cache = new Map<string, { at: number; lookup: ContextLookup }>();

async function ask(input: string): Promise<ContextLookup> {
  try {
    const mcp = await client();
    const res = await mcp.callTool(
      { name: "get_context_bands", arguments: { address: input } },
      undefined,
      { timeout: LOOKUP_TIMEOUT_MS },
    );

    const text = Array.isArray(res.content)
      ? ((res.content[0] as { text?: string })?.text ?? "")
      : "";

    if (res.isError) {
      return { status: "failed", reason: text || "the context server refused" };
    }
    if (!text) {
      return { status: "failed", reason: "the context server said nothing" };
    }

    const payload = JSON.parse(text) as BandsPayload;
    return {
      status: "ok",
      snapshot: {
        address: payload.address,
        ens: payload.ens ?? null,
        since: payload.since ?? null,
        bands: payload.bands,
        signals: payload.signals,
        activeCategories: payload.activeCategories,
      },
    };
  } catch (err) {
    const reason = (err as Error).message;
    console.warn(`context lookup failed for ${input}: ${reason}`);
    return { status: "failed", reason };
  }
}

/** Accepts an address or an ENS name; the MCP resolves either. */
export async function lookupContext(input: string): Promise<ContextLookup> {
  const key = input.trim().toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.lookup;

  const lookup = await ask(key);
  // Failures are cached too, briefly: a stage full of people retrying a broken
  // address should not multiply into a stampede of sweeps.
  cache.set(key, { at: Date.now(), lookup });
  return lookup;
}

export async function closeContext(): Promise<void> {
  cache.clear();
  if (!clientPromise) return;
  const pending = clientPromise;
  clientPromise = null;
  await pending.then((c) => c.close()).catch(() => {});
}
