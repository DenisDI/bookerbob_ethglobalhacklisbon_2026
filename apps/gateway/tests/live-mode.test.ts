// LISBON2026_INVENTORY_SOURCE=live must fail loudly rather than quietly serving
// the snapshot — otherwise a broken supplier looks like a working demo. Env is
// set before any import because the test runner gives each file its own process.

process.env.LISBON2026_BOOKER_MCP_URL = "http://127.0.0.1:1/mcp";
process.env.LISBON2026_BOOKER_TOKEN = "not-a-real-token";
process.env.LISBON2026_INVENTORY_SOURCE = "live";

import assert from "node:assert/strict";
import { test } from "node:test";

const { createInventory, InventoryUnavailableError } = await import(
  "../src/inventory/index.js"
);

test("live-only mode refuses to fall back", async () => {
  await assert.rejects(
    () =>
      createInventory().findAndPrebook({
        city: "Lisbon",
        checkin: "2026-08-14",
        checkout: "2026-08-17",
      }),
    (err: Error) => {
      assert.ok(err instanceof InventoryUnavailableError);
      assert.match(err.message, /LISBON2026_INVENTORY_SOURCE=live/);
      return true;
    },
  );
});
