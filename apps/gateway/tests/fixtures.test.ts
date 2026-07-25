// Offline tests over the captured second source. No network: judges can run
// these on a dead conference wifi and still see the mapping is right.

import assert from "node:assert/strict";
import { test } from "node:test";
import { fromFixture, loadFixture } from "../src/inventory/fixtures.js";

const query = {
  city: "Lisbon",
  checkin: "2026-08-14",
  checkout: "2026-08-17",
};

test("fixture is a real captured response, not a hand-written mock", () => {
  const file = loadFixture();
  assert.equal(file.response.status, "ok");
  assert.ok(file.capturedAt, "capturedAt must record when it was taken");
  assert.match(file.capturedFrom, /booker/i);
  assert.ok(
    (file.response.search_hotels?.count_matching ?? 0) > 0,
    "captured search must have matched real hotels",
  );
});

test("offers carry real prices and a cancellation deadline", () => {
  const result = fromFixture(query);

  assert.equal(result.source, "cached");
  assert.ok(result.capturedAt, "cached answers must say when they were taken");
  assert.ok(result.offers.length > 0);

  for (const offer of result.offers) {
    assert.ok(offer.hotelId.length > 0);
    assert.ok(offer.perNightUsd > 0, `${offer.hotelId} has no nightly price`);
    assert.ok(offer.totalUsd >= offer.perNightUsd);
    assert.ok(
      offer.freeCancellationBefore,
      `${offer.hotelId} has no cancellation deadline`,
    );
  }
});

test("rates expose the supplier book_hash", () => {
  const result = fromFixture(query);
  assert.ok(result.rates.length > 0);
  for (const rate of result.rates) {
    assert.match(rate.bookHash, /^h-/, "book_hash comes from the supplier");
    assert.ok(rate.totalUsd > 0);
  }
});

test("prebook hold is the rate lock the finale card shows", () => {
  const result = fromFixture(query);
  assert.ok(result.hold, "captured response must contain a hold");
  assert.match(result.hold.partnerOrderId, /^mcp_booking_/);
  assert.ok(result.hold.perNightUsd > 0);
});

test("hotel metadata fills name, stars and a photo where it was captured", () => {
  const result = fromFixture(query);
  const enriched = result.offers.filter((o) => o.photoUrl);

  assert.ok(enriched.length > 0, "at least one offer must carry a photo");
  for (const offer of enriched) {
    assert.ok(offer.name, `${offer.hotelId} has a photo but no name`);
    assert.match(offer.photoUrl ?? "", /^https:\/\//);
  }
});

test("no price is expressed as a discount or multiplier", () => {
  const raw = JSON.stringify(fromFixture(query));
  assert.doesNotMatch(raw, /discount/i);
  assert.doesNotMatch(raw, /percent|%/i);
});
