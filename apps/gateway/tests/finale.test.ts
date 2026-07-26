// The finale must show the room that was held, at the price it was held for.
//
// This is the demo's whole claim: the same room, the same rate, different terms.
// It broke once already, when the lists were drawn from a local pool of invented
// hotels while the card showed the supplier's real hold, so the card said "the
// same rate the unbacked lane was quoted" beside two different numbers. The
// snapshot is one response, so the invariant is a property of the data, and this
// test keeps it that way through any future capture.

import assert from "node:assert/strict";
import { test } from "node:test";
import { fromFixture } from "../src/inventory/fixtures.js";

const QUERY = { city: "lisbon", checkin: "2026-08-14", checkout: "2026-08-17", adults: 2 };

test("the held hotel is in the list the lane was shown", () => {
  const result = fromFixture(QUERY);
  const hold = result.hold;

  assert.ok(hold, "the snapshot has a prebook, or there is no finale to show");
  assert.ok(hold.hotelId, "a hold has to say which hotel it is for");

  const shown = result.offers.find((o) => o.hotelId === hold.hotelId);
  assert.ok(shown, `held hotel ${hold.hotelId} is missing from the offers`);
});

test("the price in the finale is the price in the list", () => {
  const result = fromFixture(QUERY);
  const hold = result.hold!;
  const shown = result.offers.find((o) => o.hotelId === hold.hotelId)!;

  assert.equal(
    shown.perNightUsd,
    hold.perNightUsd,
    "the nightly rate on the card must be the one the list quoted",
  );
  assert.equal(
    shown.totalUsd,
    hold.totalUsd,
    "the stay total on the card must be the one the list quoted",
  );
});

test("the held hotel has the metadata the card needs", () => {
  const result = fromFixture(QUERY);
  const shown = result.offers.find((o) => o.hotelId === result.hold?.hotelId)!;

  // Not decoration: a card with no name and no photograph reads as a placeholder,
  // and the whole point is that this is a real property somebody could walk into.
  assert.ok(shown.name, "the held hotel needs a name");
  assert.ok(shown.photoUrl, "the held hotel needs a photograph");
});
