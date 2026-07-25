// Bands, and the reasoning behind every threshold.
//
// Output is coarse on purpose. A consumer gets "T3, active in lending and dex"
// and never a balance, a count, or a dollar figure: the point is to underwrite
// risk terms, not to publish someone's portfolio.
//
// WHAT A BAND IS NOT: proof that the address belongs to a person. The top
// account by position count in Aave v3 Ethereum has 87224 positions and zero
// deposits, and a CoW Protocol settlement contract reads as one of the busiest
// addresses on the network. Bands describe what an address did. Personhood is a
// separate axis and comes from a credential, never from here.

import { counts } from "./freshness.js";
import { PAGE } from "./templates/index.js";
import type {
  Band,
  BandsResult,
  Category,
  FreshnessEntry,
  SourceResult,
} from "./types.js";

/**
 * Thresholds, calibrated against live data on 2026-07-25 rather than guessed:
 *
 *   T1  the address appears at all. "Was here", nothing more.
 *   T2  five actions inside one category. The first point where a footprint is
 *       repeated rather than incidental. A wallet with 9 lending positions and
 *       17 actions lands here.
 *   T3  twenty five actions across two or more categories. Requires breadth,
 *       which is what makes deferred settlement underwritable: someone who has
 *       borrowed and traded has more to lose from defaulting than someone who
 *       clicked once. The sampled mid wallet (17 lending + 2 dex = 19 across
 *       two categories) deliberately does NOT reach it.
 *   T4  a hundred actions in a single category. That is also the page size, so
 *       above it we stop distinguishing instead of pretending to.
 */
const T2_ACTIONS_IN_CATEGORY = 5;
const T3_TOTAL_ACTIONS = 25;
const T3_CATEGORIES = 2;
const T4_ACTIONS_IN_CATEGORY = PAGE;

interface CategoryTotal {
  actions: number;
  saturated: boolean;
}

function aggregate(results: SourceResult[]): Map<Category, CategoryTotal> {
  const totals = new Map<Category, CategoryTotal>();

  for (const result of results) {
    // A stale or failed source contributes nothing, not zero: the difference is
    // the whole point of the freshness gate.
    if (!counts(result.freshness) || !result.reading) continue;

    const current = totals.get(result.manifest.category) ?? {
      actions: 0,
      saturated: false,
    };
    totals.set(result.manifest.category, {
      actions: current.actions + result.reading.actions,
      saturated: current.saturated || result.reading.saturated,
    });
  }

  return totals;
}

function bandFor(totals: Map<Category, CategoryTotal>): Band {
  const entries = [...totals.values()];
  if (entries.length === 0) return "unavailable";

  const active = [...totals.entries()].filter(([, t]) => t.actions > 0);
  const total = entries.reduce((sum, t) => sum + t.actions, 0);
  const peak = entries.reduce((max, t) => Math.max(max, t.actions), 0);
  const saturated = entries.some((t) => t.saturated);

  if (peak >= T4_ACTIONS_IN_CATEGORY || saturated) return "T4";
  if (total >= T3_TOTAL_ACTIONS && active.length >= T3_CATEGORIES) return "T3";
  if (peak >= T2_ACTIONS_IN_CATEGORY) return "T2";
  if (total > 0) return "T1";
  return "T0";
}

export function computeBands(
  address: string,
  results: SourceResult[],
): BandsResult {
  const totals = aggregate(results);

  const activeCategories = [...totals.entries()]
    .filter(([, t]) => t.actions > 0)
    .map(([category]) => category)
    .sort();

  return {
    address: address.toLowerCase(),
    bands: { defi_activity: bandFor(totals) },
    activeCategories,
    freshness: results.map((r): FreshnessEntry => r.freshness),
    source: "the-graph",
  };
}
