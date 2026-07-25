// Freshness gate: never be silently wrong.
//
// A stale subgraph must not contribute a band. A tier computed from month-old
// data looks identical to a correct one on screen, and underwrites a guest on a
// fiction — worse than admitting we do not know.

import type { FreshnessEntry, FreshnessStatus } from "./types.js";

/** Beyond this, a source stops counting. */
export const MAX_AGE_SECONDS = 24 * 60 * 60;

export interface MetaBlock {
  number?: number | string;
  timestamp?: number | string;
}

function toNumber(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

export function readFreshness(
  subgraph: string,
  data: unknown,
  nowSeconds: number,
): FreshnessEntry {
  const block = (data as { _meta?: { block?: MetaBlock } })?._meta?.block;
  const timestamp = toNumber(block?.timestamp);
  const blockNumber = toNumber(block?.number);

  if (timestamp === null) {
    return {
      subgraph,
      blockNumber,
      ageSeconds: null,
      status: "error",
      detail: "no _meta block in the response",
    };
  }

  const ageSeconds = Math.max(0, Math.round(nowSeconds - timestamp));
  const status: FreshnessStatus = ageSeconds > MAX_AGE_SECONDS ? "stale" : "live";

  return { subgraph, blockNumber, ageSeconds, status };
}

export function failedFreshness(subgraph: string, detail: string): FreshnessEntry {
  return { subgraph, blockNumber: null, ageSeconds: null, status: "error", detail };
}

/** Only a live source is allowed to move a band. */
export function counts(entry: FreshnessEntry): boolean {
  return entry.status === "live";
}
