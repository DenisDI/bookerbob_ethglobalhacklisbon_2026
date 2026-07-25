// One template per schema type, selected by the manifest. Adding a subgraph that
// speaks a known schema needs no code; a new schema means one entry here.
//
// Templates return a normalised Reading, so bands.ts never learns which protocol
// or schema produced the numbers.

import { emptyReading } from "../types.js";
import type { Category, NameRecord, Reading } from "../types.js";

/**
 * Page size for entity reads, and the ceiling of what a band can distinguish: a
 * saturated page means "at least this many", never "exactly this many".
 */
export const PAGE = 100;

export interface ActivityTemplate {
  kind: "activity";
  query: string;
  variables(address: string): Record<string, unknown>;
  read(data: unknown, category: Category): Reading;
}

export interface NamingTemplate {
  kind: "naming";
  /** address -> name, for display and for tenure. */
  reverseQuery: string;
  reverseVariables(address: string): Record<string, unknown>;
  readReverse(data: unknown): NameRecord | null;
  /** name -> address, so a judge can type words instead of hex. */
  forwardQuery: string;
  forwardVariables(name: string): Record<string, unknown>;
  readForward(data: unknown): { address: string; record: NameRecord } | null;
}

export type Template = ActivityTemplate | NamingTemplate;

type Row = Record<string, unknown>;

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? (value as Row[]) : [];
}

function num(value: unknown): number {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}

function usd(list: Row[]): number {
  return list.reduce((sum, row) => sum + num(row.amountUSD), 0);
}

function stamp(list: Row[]): number | null {
  const first = list[0];
  return first ? num(first.timestamp) || null : null;
}

function oldest(...values: Array<number | null>): number | null {
  const usable = values.filter((v): v is number => typeof v === "number" && v > 0);
  return usable.length ? Math.min(...usable) : null;
}

function newest(...values: Array<number | null>): number | null {
  const usable = values.filter((v): v is number => typeof v === "number" && v > 0);
  return usable.length ? Math.max(...usable) : null;
}

/**
 * Messari lending (Aave v3 deployments).
 *
 * Counted from entity lists on purpose: the Account action counters in these
 * deployments read 0 for every address, verified on 2026-07-25 against an
 * account holding a real $1463.67 deposit whose depositCount was still 0.
 *
 * positionCount is populated but deliberately unused. The top account by that
 * field has 87224 positions and zero deposits, and router contracts rank high,
 * so it measures "appears in positions" rather than "did something".
 *
 * `liquidates` is acting AS a liquidator. `liquidations` is being liquidated.
 * Only the second one is a risk signal about this address, and confusing them
 * would invert the meaning.
 */
const messariLending: ActivityTemplate = {
  kind: "activity",
  query: `query Lending($a: ID!) {
  account(id: $a) {
    id
    firstDeposit: deposits(first: 1, orderBy: timestamp, orderDirection: asc) { timestamp }
    lastDeposit: deposits(first: 1, orderBy: timestamp, orderDirection: desc) { timestamp }
    firstBorrow: borrows(first: 1, orderBy: timestamp, orderDirection: asc) { timestamp }
    lastBorrow: borrows(first: 1, orderBy: timestamp, orderDirection: desc) { timestamp }
    deposits(first: ${PAGE}, orderBy: timestamp, orderDirection: desc) { amountUSD }
    withdraws(first: ${PAGE}) { id }
    borrows(first: ${PAGE}, orderBy: timestamp, orderDirection: desc) { amountUSD }
    repays(first: ${PAGE}, orderBy: timestamp, orderDirection: desc) { amountUSD }
    liquidates(first: ${PAGE}) { id }
    liquidations(first: ${PAGE}) { id }
    positions(first: 50) { market { id } }
  }
  _meta { block { number timestamp } }
}`,
  variables: (address) => ({ a: address }),
  read(data, category) {
    const account = (data as { account?: Row | null }).account;
    if (!account) return emptyReading(category);

    const deposits = rows(account.deposits);
    const withdraws = rows(account.withdraws);
    const borrows = rows(account.borrows);
    const repays = rows(account.repays);
    const liquidates = rows(account.liquidates);
    const liquidations = rows(account.liquidations);
    const positions = rows(account.positions);

    const lists = [deposits, withdraws, borrows, repays, liquidates, liquidations];
    const venues = new Set(
      positions
        .map((p) => (p.market as Row | undefined)?.id)
        .filter((id): id is string => typeof id === "string"),
    );

    return {
      category,
      actions: lists.reduce((sum, list) => sum + list.length, 0),
      saturated: lists.some((list) => list.length >= PAGE),
      present: true,
      firstSeen: oldest(
        stamp(rows(account.firstDeposit)),
        stamp(rows(account.firstBorrow)),
      ),
      lastSeen: newest(
        stamp(rows(account.lastDeposit)),
        stamp(rows(account.lastBorrow)),
      ),
      volumeUsd: usd(deposits) + usd(borrows),
      venues: venues.size,
      borrowed: usd(borrows),
      repaid: usd(repays),
      liquidations: liquidations.length,
    };
  },
};

/**
 * Messari perpetual futures (GMX Arbitrum). Read from counters, which this
 * deployment does maintain, unlike the lending ones.
 *
 * Long and short position counts are a breakdown of openPositionCount, so
 * summing all three would triple count. There is no per-account USD aggregate
 * and no timestamp on the account, so this source contributes activity and
 * presence but not tenure, volume or venues.
 */
const messariPerps: ActivityTemplate = {
  kind: "activity",
  query: `query Perps($a: ID!) {
  account(id: $a) {
    id
    openPositionCount
    closedPositionCount
    depositCount
    withdrawCount
    swapCount
    liquidateCount
    liquidationCount
  }
  _meta { block { number timestamp } }
}`,
  variables: (address) => ({ a: address }),
  read(data, category) {
    const account = (data as { account?: Row | null }).account;
    if (!account) return emptyReading(category);

    const actions = [
      "openPositionCount",
      "closedPositionCount",
      "depositCount",
      "withdrawCount",
      "swapCount",
      "liquidateCount",
      "liquidationCount",
    ].reduce((sum, key) => sum + num(account[key]), 0);

    return {
      ...emptyReading(category),
      actions,
      // Counters are exact here, so nothing is truncated.
      saturated: false,
      present: true,
      liquidations: num(account.liquidationCount),
    };
  },
};

/**
 * Uniswap V3, canonical deployment. Not a Messari schema: no Account entity, so
 * the address is reached through Swap.origin (the EOA that sent the swap) and
 * Position.owner (liquidity positions).
 */
const uniswapV3: ActivityTemplate = {
  kind: "activity",
  query: `query Dex($a: Bytes!) {
  first: swaps(first: 1, where: { origin: $a }, orderBy: timestamp, orderDirection: asc) { timestamp }
  swaps(first: ${PAGE}, where: { origin: $a }, orderBy: timestamp, orderDirection: desc) {
    timestamp amountUSD pool { id }
  }
  positions(first: ${PAGE}, where: { owner: $a }) { id pool { id } }
  _meta { block { number timestamp } }
}`,
  variables: (address) => ({ a: address }),
  read(data, category) {
    const d = data as { first?: unknown; swaps?: unknown; positions?: unknown };
    const swaps = rows(d.swaps);
    const positions = rows(d.positions);
    if (swaps.length + positions.length === 0) return emptyReading(category);

    const venues = new Set(
      [...swaps, ...positions]
        .map((row) => (row.pool as Row | undefined)?.id)
        .filter((id): id is string => typeof id === "string"),
    );

    return {
      category,
      actions: swaps.length + positions.length,
      saturated: swaps.length >= PAGE || positions.length >= PAGE,
      present: true,
      firstSeen: stamp(rows(d.first)),
      lastSeen: stamp(swaps),
      volumeUsd: usd(swaps),
      venues: venues.size,
      borrowed: 0,
      repaid: 0,
      liquidations: 0,
    };
  },
};

/** ENS. A name is not activity, so this template only resolves and dates names. */
const ens: NamingTemplate = {
  kind: "naming",
  reverseQuery: `query NameOf($a: String!) {
  domains(first: 5, where: { resolvedAddress: $a }, orderBy: createdAt, orderDirection: asc) {
    name createdAt
  }
  _meta { block { number timestamp } }
}`,
  reverseVariables: (address) => ({ a: address }),
  readReverse(data) {
    // Oldest usable name wins: it is the one that carries tenure.
    //
    // Junk has to be filtered first. The subgraph returns names whose label
    // preimage it does not know as "acompany.[5b27bed6...].eth". Those are
    // undisplayable, and placeholder addresses collect them by the dozen: the
    // burn-style address 0x1111...1111 carries two dating from 2017, which would
    // have handed it three decades of tenure it never earned.
    const usable = rows((data as { domains?: unknown }).domains).filter(
      (row) => typeof row.name === "string" && !row.name.includes("["),
    );
    const first = usable[0];
    if (!first || typeof first.name !== "string") return null;
    return { name: first.name, createdAt: num(first.createdAt) || null };
  },
  forwardQuery: `query AddressOf($n: String!) {
  domains(first: 1, where: { name: $n }) {
    name createdAt resolvedAddress { id }
  }
  _meta { block { number timestamp } }
}`,
  forwardVariables: (name) => ({ n: name.toLowerCase() }),
  readForward(data) {
    const first = rows((data as { domains?: unknown }).domains)[0];
    const resolved = (first?.resolvedAddress as Row | undefined)?.id;
    if (!first || typeof resolved !== "string" || typeof first.name !== "string") {
      return null;
    }
    return {
      address: resolved.toLowerCase(),
      record: { name: first.name, createdAt: num(first.createdAt) || null },
    };
  },
};

export const TEMPLATES: Record<string, Template> = {
  "messari-lending": messariLending,
  "messari-perps": messariPerps,
  "uniswap-v3": uniswapV3,
  ens,
};
