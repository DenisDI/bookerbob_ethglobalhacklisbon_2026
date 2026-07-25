// Per-payer x402 totals for the race counters.
// In-memory on purpose: one Fly process, demo scale. Restarts clear the ledger.

export const QUERY_PRICE_USD = 0.01;

type Entry = { usd: number; queries: number; lastAt: string };

const byPayer = new Map<string, Entry>();

export function recordSpend(payer: string, usd = QUERY_PRICE_USD): Entry {
  const key = payer.trim().toLowerCase() || "unknown";
  const prev = byPayer.get(key) ?? { usd: 0, queries: 0, lastAt: "" };
  const next: Entry = {
    usd: Number((prev.usd + usd).toFixed(4)),
    queries: prev.queries + 1,
    lastAt: new Date().toISOString(),
  };
  byPayer.set(key, next);
  return next;
}

export function spentFor(payer?: string): {
  totalUsd: number;
  queries: number;
  payers: Record<string, Entry>;
} {
  if (payer?.trim()) {
    const key = payer.trim().toLowerCase();
    const e = byPayer.get(key) ?? { usd: 0, queries: 0, lastAt: "" };
    return {
      totalUsd: e.usd,
      queries: e.queries,
      payers: { [key]: e },
    };
  }
  let totalUsd = 0;
  let queries = 0;
  const payers: Record<string, Entry> = {};
  for (const [k, e] of byPayer) {
    payers[k] = e;
    totalUsd += e.usd;
    queries += e.queries;
  }
  return {
    totalUsd: Number(totalUsd.toFixed(4)),
    queries,
    payers,
  };
}
