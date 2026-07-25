#!/usr/bin/env -S npx tsx
// Captures the in-event second inventory source: one real booker response plus
// the hotel metadata behind it, written verbatim to fixtures/lisbon.json.
// Required by specs/00-final-plan.md A.3 — the snapshot is real supplier data,
// never hand-authored.
//
//   npm run capture:fixtures

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { captureRaw } from "../apps/gateway/src/inventory/booker.js";
import { demo } from "../apps/gateway/src/demo.config.js";

const OUT = fileURLToPath(new URL("../fixtures/lisbon.json", import.meta.url));

const query = {
  city: demo.city,
  checkin: demo.checkin,
  checkout: demo.checkout,
  adults: demo.adults,
  topN: demo.captureTopN,
};

const started = Date.now();
console.log(`capturing ${query.city} ${query.checkin} -> ${query.checkout} ...`);

const { response, hotelInfo } = await captureRaw(query);

// get_hotel_info currently crashes server-side on its cache-expiry check
// ("can't subtract offset-naive and offset-aware datetimes"), so a run can come
// back without photos. Keep whatever a previous capture already proved out
// rather than overwriting good metadata with nothing.
const previous: Record<string, Record<string, unknown>> = existsSync(OUT)
  ? (JSON.parse(readFileSync(OUT, "utf8")).hotelInfo ?? {})
  : {};

const mergedInfo = Object.fromEntries(
  Object.entries(hotelInfo).map(([id, info]) => {
    const fresh = info as Record<string, unknown>;
    const kept = previous[id];
    return [id, Object.keys(fresh).length > 0 ? fresh : (kept ?? {})];
  }),
);

const missing = Object.entries(mergedInfo)
  .filter(([, info]) => Object.keys(info).length === 0)
  .map(([id]) => id);
if (missing.length) {
  console.warn(`no hotel metadata for: ${missing.join(", ")}`);
}

const file = {
  capturedAt: new Date().toISOString(),
  capturedFrom: "flexrep booker MCP find_and_prebook_hotel + get_hotel_info",
  note: "Real supplier response captured during ETHGlobal Lisbon 2026. Prices and the prebook hold were valid at capture time; the hold itself expires in minutes upstream.",
  query,
  response,
  hotelInfo: mergedInfo,
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(file, null, 2)}\n`);

const hotels = Object.keys(hotelInfo).length;
console.log(
  `wrote ${OUT} (${hotels} hotels, ${Math.round((Date.now() - started) / 100) / 10}s)`,
);
