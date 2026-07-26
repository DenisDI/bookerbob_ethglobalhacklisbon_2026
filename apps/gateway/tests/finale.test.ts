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

// The card's claim, in one line: "the same room, the same rate the unbacked lane
// was quoted". That is only true if the room the desk held is in the short list
// the lane actually saw, so the trim is not allowed to drop it.
test("the held room survives the trim, whatever the tier sees", async () => {
  const { withHeldRoom } = await import("../src/routes/offers.js");
  const offers = [
    { hotelId: "a", name: "A", stars: 3, address: null, perNightUsd: 10, totalUsd: 30, freeCancellationBefore: null, photoUrl: "a.jpg" },
    { hotelId: "b", name: "B", stars: 3, address: null, perNightUsd: 20, totalUsd: 60, freeCancellationBefore: null, photoUrl: "b.jpg" },
    { hotelId: "c", name: "C", stars: 3, address: null, perNightUsd: 30, totalUsd: 90, freeCancellationBefore: null, photoUrl: "c.jpg" },
  ];
  const hold = { partnerOrderId: "x", hotelId: "c", roomName: null, totalUsd: 90, perNightUsd: 30, freeCancellationBefore: null };

  const shown = withHeldRoom(offers, hold, 2);
  assert.equal(shown.length, 2, "the tier still sees only what it is owed");
  assert.ok(shown.some((o) => o.hotelId === "c"), "the held room is in the list");

  // The ordinary case, where it was already there, is left exactly alone.
  assert.deepEqual(withHeldRoom(offers, { ...hold, hotelId: "a" }, 2), offers.slice(0, 2));
  assert.deepEqual(withHeldRoom(offers, null, 2), offers.slice(0, 2));
});

test("a room nobody can name or picture is not shown", () => {
  const result = fromFixture(QUERY);
  for (const offer of result.offers) {
    assert.ok(offer.name, `${offer.hotelId} has no name and would draw as "None"`);
    assert.ok(offer.photoUrl, `${offer.hotelId} has no photograph and would draw as a grey box`);
  }
});
