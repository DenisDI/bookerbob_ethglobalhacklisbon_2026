// Adapter behaviour with the live source unreachable. Points at a closed local
// port so the fallback is exercised for real without touching the network.
// Shell env wins over .env, so these settings hold even on a configured machine.

process.env.BOOKER_MCP_URL = "http://127.0.0.1:1/mcp";
process.env.BOOKER_TOKEN = "not-a-real-token";
process.env.INVENTORY_SOURCE = "auto";
process.env.BOOKER_BOOKING_ENABLED = "false";

import assert from "node:assert/strict";
import { test } from "node:test";

const { createInventory } = await import("../src/inventory/index.js");

const query = {
  city: "Lisbon",
  checkin: "2026-08-14",
  checkout: "2026-08-17",
};

test("unreachable supplier falls back to the captured snapshot", async () => {
  const result = await createInventory().findAndPrebook(query);

  assert.equal(result.source, "cached");
  assert.ok(result.offers.length > 0, "the demo must still have rooms to show");
  assert.ok(result.capturedAt);
});

test("booking is refused and never reaches the network", async () => {
  const realFetch = globalThis.fetch;
  let touched = false;
  globalThis.fetch = (...args: Parameters<typeof fetch>) => {
    touched = true;
    return realFetch(...args);
  };

  try {
    await assert.rejects(
      () => createInventory().book(),
      /prebook-only|BOOKER_BOOKING_ENABLED/,
    );
  } finally {
    globalThis.fetch = realFetch;
  }

  assert.equal(touched, false, "a disabled booking must not open a connection");
});
