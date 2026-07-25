// Second inventory source: a snapshot of a real booker response captured
// during the event (specs/00-final-plan.md A.3). Not a mock — same payload,
// same mapping, served when the live service is slow or unreachable so the
// demo never dies on stage. Responses are tagged "cached" for the UI badge.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { env } from "../env.js";
import type { InventoryQuery, InventoryResult } from "../types.js";
import {
  type RawFindAndPrebook,
  type RawHotelInfo,
  toHold,
  toOffers,
  toRates,
} from "./map.js";

export interface FixtureFile {
  capturedAt: string;
  capturedFrom: string;
  query: InventoryQuery;
  response: RawFindAndPrebook;
  hotelInfo: Record<string, RawHotelInfo>;
}

const DEFAULT_PATH = fileURLToPath(
  new URL("../../../../fixtures/lisbon.json", import.meta.url),
);

export function fixturePath(): string {
  return env.fixturesPath || DEFAULT_PATH;
}

export function loadFixture(path = fixturePath()): FixtureFile {
  return JSON.parse(readFileSync(path, "utf8")) as FixtureFile;
}

/**
 * Static hotel metadata (name, stars, photos) from the snapshot. Separate from
 * prices on purpose: it is safe to reuse for a live result, because it does not
 * change between capture and demo — unlike a rate.
 */
export function fixtureHotelInfo(path = fixturePath()): Map<string, RawHotelInfo> {
  try {
    return new Map(Object.entries(loadFixture(path).hotelInfo ?? {}));
  } catch {
    return new Map();
  }
}

export function fromFixture(
  query: InventoryQuery,
  path = fixturePath(),
): InventoryResult {
  const file = loadFixture(path);
  const raw = file.response;
  const info = new Map(Object.entries(file.hotelInfo ?? {}));

  // The captured window is what was really quoted; reporting the requested
  // dates over cached prices would be a quiet lie.
  return {
    city: file.query.city,
    checkin: file.query.checkin,
    checkout: file.query.checkout,
    nights: raw.request?.nights ?? null,
    matchingCount: raw.search_hotels?.count_matching ?? null,
    offers: toOffers(raw, info),
    rates: toRates(raw),
    hold: toHold(raw),
    summary: raw.summary ?? null,
    source: "cached",
    capturedAt: file.capturedAt,
  };
}
