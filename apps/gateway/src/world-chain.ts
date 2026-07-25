// Is World Chain reachable from this machine at all?
//
// This exists because of a hole in the SDK. createAgentBookVerifier().lookupHuman
// catches every error and returns null, so a rate-limited RPC, a blocked egress
// and a genuinely unregistered wallet all come back as the same answer: "not
// registered". Locally that is invisible, because the default RPC
// (worldchain-mainnet.g.alchemy.com/public, viem's chain default) answers a
// laptop happily. From a datacentre it may not.
//
// So we ask the chain a question of our own. A raw eth_blockNumber over fetch
// keeps this dependency-free, and the answer separates "your wallet is not in the
// AgentBook" from "this machine cannot see the AgentBook", which are different
// problems with different owners.

import { env } from "./env.js";

/** viem's default for chain 480. Overridable because a public endpoint is a shared one. */
const DEFAULT_RPC = "https://worldchain-mainnet.g.alchemy.com/public";

export function worldRpcUrl(): string {
  return env.worldRpcUrl || DEFAULT_RPC;
}

export interface ChainProbe {
  ok: boolean;
  /** Block height when reachable, so a stuck endpoint is visible too. */
  block: number | null;
  detail?: string;
  checkedAt: string;
}

const TIMEOUT_MS = 2_000;

export async function probeWorldChain(
  url: string = worldRpcUrl(),
  now: () => string = () => new Date().toISOString(),
): Promise<ChainProbe> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_blockNumber", params: [] }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!res.ok) {
      // 429 is the one we expect from a shared endpoint asked from a datacentre.
      return { ok: false, block: null, detail: `rpc http ${res.status}`, checkedAt: now() };
    }

    const body = (await res.json()) as { result?: string; error?: { message?: string } };
    if (body.error || typeof body.result !== "string") {
      return {
        ok: false,
        block: null,
        detail: body.error?.message ?? "rpc returned no block",
        checkedAt: now(),
      };
    }

    return { ok: true, block: Number.parseInt(body.result, 16), checkedAt: now() };
  } catch (err) {
    return { ok: false, block: null, detail: (err as Error).message, checkedAt: now() };
  }
}

/**
 * Cached, and refreshed off the request path.
 *
 * /health is what Fly polls every 15 seconds with a 2 second timeout, so it must
 * never wait on a network call that is itself the thing being questioned. The
 * first call reports null and starts a check; later calls report the last answer.
 */
const TTL_MS = 60_000;
let cached: ChainProbe | null = null;
let refreshing = false;
let lastRefresh = 0;

export function worldChainStatus(): ChainProbe | null {
  const age = Date.now() - lastRefresh;
  if (!refreshing && (cached === null || age > TTL_MS)) {
    refreshing = true;
    lastRefresh = Date.now();
    void probeWorldChain()
      .then((probe) => {
        cached = probe;
      })
      .finally(() => {
        refreshing = false;
      });
  }
  return cached;
}
