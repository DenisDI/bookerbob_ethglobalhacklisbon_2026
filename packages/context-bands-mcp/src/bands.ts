// Four independent bands and one repayment signal, with the reasoning behind
// every threshold.
//
// WHY FOUR AND NOT ONE. A single "activity" number collapses into "did more,
// gets more", which is a scoreboard: the wrong shape for a product that decides
// who carries risk between booking and a stay. Real underwriting asks separate
// questions. How long has this address existed. How broadly does it operate. At
// what size. And did borrowed money come back. Those answers can disagree, and
// the interesting cases are exactly the ones where they do: the busiest address
// we sampled has a real repayment record AND two liquidations behind it.
//
// WHAT A BAND IS NOT: proof that an address belongs to a person. The top account
// by position count in Aave v3 Ethereum has 87224 positions and zero deposits,
// and a CoW Protocol settlement contract reads as one of the busiest addresses
// on Ethereum. Bands describe behaviour. Personhood comes from a credential.
//
// Nothing here is a score, a rating or a ranking, and none of these values may
// be surfaced raw (specs/00-final-plan.md A.1).

import { counts } from "./freshness.js";
import { PAGE } from "./templates/index.js";
import type {
  Band,
  BandName,
  BandsResult,
  Category,
  NameRecord,
  RepaymentSignal,
  SourceResult,
} from "./types.js";

const DAY = 86_400;

/**
 * ACTIVITY — how much this address has done.
 *   T2 five actions in one category: a footprint that repeats rather than a
 *      single click.
 *   T3 twenty five actions across two or more categories: breadth of use.
 *   T4 a hundred in one category, which is also the page size, so above it we
 *      stop distinguishing instead of pretending to.
 */
const ACTIVITY_T2 = 5;
const ACTIVITY_T3_TOTAL = 25;
const ACTIVITY_T3_CATEGORIES = 2;
const ACTIVITY_T4 = PAGE;

/**
 * TENURE — how long the address has been visible, counting an ENS name's
 * registration date as well.
 *   Ninety days, a year, three years. Time is the one input nobody can buy
 *   retroactively, which is why it carries more weight than volume when
 *   deciding whether to defer settlement. Sampled addresses landed at ~2.6y,
 *   ~4.2y and same-day, so the bands separate them cleanly.
 */
const TENURE_T2 = 90 * DAY;
const TENURE_T3 = 365 * DAY;
const TENURE_T4 = 3 * 365 * DAY;

/**
 * BREADTH — distinct markets and pools touched.
 *   Measured because a wallet that used one market thirty times is a different
 *   risk from one that used thirty markets once. Sampled: 1 venue for a new
 *   address, 35 for an active trader, 86 for vitalik.eth.
 */
const BREADTH_T2 = 3;
const BREADTH_T3 = 10;
const BREADTH_T4 = 30;

/**
 * SCALE — USD moved across the pages we read.
 *   Banded, never printed. Deliberately coarse: the point is to tell $1k apart
 *   from $100k, not to publish a balance. Sampled: ~$1.4k, ~$84k, ~$101k, ~$784k.
 */
const SCALE_T2 = 1_000;
const SCALE_T3 = 25_000;
const SCALE_T4 = 250_000;

function step(value: number, t2: number, t3: number, t4: number): Band {
  if (value >= t4) return "T4";
  if (value >= t3) return "T3";
  if (value >= t2) return "T2";
  if (value > 0) return "T1";
  return "T0";
}

interface Totals {
  byCategory: Map<Category, { actions: number; saturated: boolean }>;
  firstSeen: number | null;
  lastSeen: number | null;
  venues: number;
  volumeUsd: number;
  borrowed: number;
  repaid: number;
  liquidations: number;
  usableSources: number;
}

function aggregate(results: SourceResult[]): Totals {
  const totals: Totals = {
    byCategory: new Map(),
    firstSeen: null,
    lastSeen: null,
    venues: 0,
    volumeUsd: 0,
    borrowed: 0,
    repaid: 0,
    liquidations: 0,
    usableSources: 0,
  };

  for (const result of results) {
    // A stale or failed source contributes nothing, not zero. That difference is
    // the whole point of the freshness gate.
    if (!counts(result.freshness)) continue;
    if (!result.reading || !result.manifest.category) continue;

    totals.usableSources += 1;
    const reading = result.reading;
    const current = totals.byCategory.get(result.manifest.category) ?? {
      actions: 0,
      saturated: false,
    };
    totals.byCategory.set(result.manifest.category, {
      actions: current.actions + reading.actions,
      saturated: current.saturated || reading.saturated,
    });

    totals.firstSeen =
      reading.firstSeen && (!totals.firstSeen || reading.firstSeen < totals.firstSeen)
        ? reading.firstSeen
        : totals.firstSeen;
    totals.lastSeen =
      reading.lastSeen && (!totals.lastSeen || reading.lastSeen > totals.lastSeen)
        ? reading.lastSeen
        : totals.lastSeen;

    totals.venues += reading.venues;
    totals.volumeUsd += reading.volumeUsd;
    totals.borrowed += reading.borrowed;
    totals.repaid += reading.repaid;
    totals.liquidations += reading.liquidations;
  }

  return totals;
}

function activityBand(totals: Totals): Band {
  const entries = [...totals.byCategory.values()];
  if (entries.length === 0) return "unavailable";

  const active = entries.filter((t) => t.actions > 0);
  const total = entries.reduce((sum, t) => sum + t.actions, 0);
  const peak = entries.reduce((max, t) => Math.max(max, t.actions), 0);

  if (peak >= ACTIVITY_T4 || entries.some((t) => t.saturated)) return "T4";
  if (total >= ACTIVITY_T3_TOTAL && active.length >= ACTIVITY_T3_CATEGORIES) return "T3";
  if (peak >= ACTIVITY_T2) return "T2";
  if (total > 0) return "T1";
  return "T0";
}

function firstSeenAt(totals: Totals, ens: NameRecord | null): number | null {
  const earliest = [totals.firstSeen, ens?.createdAt ?? null].filter(
    (v): v is number => typeof v === "number" && v > 0,
  );
  return earliest.length ? Math.min(...earliest) : null;
}

function tenureBand(earliest: number | null, hasSources: boolean, now: number): Band {
  if (earliest === null) return hasSources ? "T0" : "unavailable";
  return step(Math.max(0, now - earliest), TENURE_T2, TENURE_T3, TENURE_T4);
}

/**
 * Borrowed money either came back or it did not. "no_credit_history" is not a
 * negative: most addresses have never borrowed, and the credential still earns
 * human terms on its own.
 */
function repaymentSignal(totals: Totals): RepaymentSignal {
  if (totals.liquidations > 0) return "liquidated";
  if (totals.borrowed > 0 && totals.repaid > 0) return "clean";
  return "no_credit_history";
}

export function computeBands(
  address: string,
  results: SourceResult[],
  nowSeconds: number,
  /** Set when the caller typed a name, so the record is already known. */
  knownName: NameRecord | null = null,
): BandsResult {
  const totals = aggregate(results);
  const ens =
    knownName ??
    results.find((r) => r.manifest.role === "naming" && counts(r.freshness))?.name ??
    null;

  const unavailable = totals.usableSources === 0;
  const earliest = firstSeenAt(totals, ens);
  const bands: Record<BandName, Band> = unavailable
    ? {
        activity: "unavailable",
        tenure: "unavailable",
        breadth: "unavailable",
        scale: "unavailable",
      }
    : {
        activity: activityBand(totals),
        tenure: tenureBand(earliest, true, nowSeconds),
        breadth: step(totals.venues, BREADTH_T2, BREADTH_T3, BREADTH_T4),
        scale: step(totals.volumeUsd, SCALE_T2, SCALE_T3, SCALE_T4),
      };

  return {
    address: address.toLowerCase(),
    ens,
    since:
      unavailable || earliest === null
        ? null
        : new Date(earliest * 1000).getUTCFullYear(),
    bands,
    signals: { repayment: repaymentSignal(totals) },
    activeCategories: [...totals.byCategory.entries()]
      .filter(([, t]) => t.actions > 0)
      .map(([category]) => category)
      .sort(),
    freshness: results.map((r) => r.freshness),
    source: "the-graph",
  };
}
