// One query template per schema type, selected by the manifest. Adding a
// subgraph that speaks a schema we already know needs no code at all; adding a
// new schema means one file here and nothing else.
//
// Every template returns the same normalised reading, so bands.ts never learns
// which protocol or schema the numbers came from.

import type { Category, CategoryReading, SchemaType } from "../types.js";

/**
 * Page size for entity reads. Also the ceiling of what a band can distinguish:
 * a saturated page means "at least this many", never "exactly this many".
 */
export const PAGE = 100;

export interface QueryTemplate {
  query: string;
  variables(address: string): Record<string, unknown>;
  read(data: unknown, category: Category): CategoryReading;
}

function len(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

function num(value: unknown): number {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}

/**
 * Messari lending (Aave v3 deployments).
 *
 * Counted from entity lists on purpose. The Account action counters in these
 * deployments read 0 for every address, verified on 2026-07-25 against an
 * account holding a real $1463.67 deposit whose depositCount was still 0. The
 * lists themselves are correct.
 *
 * positionCount is populated but deliberately unused: the top account by
 * positionCount has 87224 positions and zero deposits, and known router
 * contracts rank high, so it measures "appears in positions" rather than
 * "did something".
 */
const messariLending: QueryTemplate = {
  query: `query Lending($a: ID!) {
  account(id: $a) {
    id
    deposits(first: ${PAGE}) { id }
    withdraws(first: ${PAGE}) { id }
    borrows(first: ${PAGE}) { id }
    repays(first: ${PAGE}) { id }
    liquidates(first: ${PAGE}) { id }
    liquidations(first: ${PAGE}) { id }
  }
  _meta { block { number timestamp } }
}`,
  variables: (address) => ({ a: address }),
  read(data, category) {
    const account = (data as { account?: Record<string, unknown> | null }).account;
    if (!account) return { category, actions: 0, saturated: false, present: false };

    const lists = [
      "deposits",
      "withdraws",
      "borrows",
      "repays",
      "liquidates",
      "liquidations",
    ].map((key) => len(account[key]));

    return {
      category,
      actions: lists.reduce((sum, n) => sum + n, 0),
      saturated: lists.some((n) => n >= PAGE),
      present: true,
    };
  },
};

/**
 * Messari perpetual futures (GMX Arbitrum).
 *
 * Read from counters, which this deployment does maintain. Long and short
 * position counts are a breakdown of openPositionCount, so summing all three
 * would triple count; collateral in and out are sub-events of managing a
 * position and are left out for the same reason.
 */
const messariPerps: QueryTemplate = {
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
    const account = (data as { account?: Record<string, unknown> | null }).account;
    if (!account) return { category, actions: 0, saturated: false, present: false };

    const actions = [
      "openPositionCount",
      "closedPositionCount",
      "depositCount",
      "withdrawCount",
      "swapCount",
      "liquidateCount",
      "liquidationCount",
    ].reduce((sum, key) => sum + num(account[key]), 0);

    // Counters are exact, so nothing is truncated here.
    return { category, actions, saturated: false, present: true };
  },
};

/**
 * Uniswap V3, the canonical deployment. Not a Messari schema: there is no
 * Account entity, so the address is reached through Swap.origin (the EOA that
 * sent the swap) and Position.owner (liquidity positions).
 */
const uniswapV3: QueryTemplate = {
  query: `query Dex($a: Bytes!) {
  swaps(first: ${PAGE}, where: { origin: $a }, orderBy: timestamp, orderDirection: desc) { id }
  positions(first: ${PAGE}, where: { owner: $a }) { id }
  _meta { block { number timestamp } }
}`,
  variables: (address) => ({ a: address }),
  read(data, category) {
    const d = data as { swaps?: unknown; positions?: unknown };
    const swaps = len(d.swaps);
    const positions = len(d.positions);

    return {
      category,
      actions: swaps + positions,
      saturated: swaps >= PAGE || positions >= PAGE,
      present: swaps + positions > 0,
    };
  },
};

export const TEMPLATES: Record<SchemaType, QueryTemplate> = {
  "messari-lending": messariLending,
  "messari-perps": messariPerps,
  "uniswap-v3": uniswapV3,
};
