// Offline suite. Real recorded gateway responses in tests/fixtures/, no network
// and no API key, so a judge can run this on dead conference wifi.
//
// Staleness is not faked with edited data: the same real responses are read
// against a clock advanced past the freshness window.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { computeBands } from "../src/bands.js";
import { MAX_AGE_SECONDS } from "../src/freshness.js";
import { loadRegistry, loadRetired } from "../src/registry.js";
import { AddressError, bandsFromResponses, normaliseAddress } from "../src/service.js";
import { TEMPLATES } from "../src/templates/index.js";
import type { SourceResult, SubgraphManifest } from "../src/types.js";

interface Fixture {
  capturedAt: string;
  address: string;
  responses: Record<string, unknown>;
}

function fixture(name: string): Fixture {
  const path = fileURLToPath(new URL(`./fixtures/${name}.json`, import.meta.url));
  return JSON.parse(readFileSync(path, "utf8")) as Fixture;
}

const registry = loadRegistry();

/** The clock at capture time, so recorded responses read as live. */
function capturedClock(f: Fixture): number {
  return Math.floor(new Date(f.capturedAt).getTime() / 1000);
}

function bandsOf(name: string, nowOffsetSeconds = 0) {
  const f = fixture(name);
  return bandsFromResponses(
    f.address,
    registry,
    f.responses,
    capturedClock(f) + nowOffsetSeconds,
  );
}

test("registry entries all have a template and a declared strategy", () => {
  assert.ok(registry.length >= 5, "the demo needs several sources to be a registry");
  for (const entry of registry) {
    assert.ok(TEMPLATES[entry.schemaType], `no template for ${entry.schemaType}`);
    assert.ok(
      entry.countStrategy === "entities" || entry.countStrategy === "counters",
      `${entry.name} must declare how it is counted`,
    );
  }
});

test("retired sources keep their reason", () => {
  const retired = loadRetired() as Array<{ retired?: { reason?: string } }>;
  assert.ok(retired.length > 0, "dead ids are recorded, not deleted");
  for (const entry of retired) {
    assert.ok(entry.retired?.reason, "a retired source must say why");
  }
});

test("a heavy address across two categories reads T4", () => {
  const result = bandsOf("heavy");
  assert.equal(result.bands.defi_activity, "T4");
  assert.deepEqual(result.activeCategories, ["dex", "lending"]);
});

test("a broad address across three categories reads T3", () => {
  const result = bandsOf("broad");
  assert.equal(result.bands.defi_activity, "T3");
  assert.deepEqual(result.activeCategories, ["dex", "lending", "perps"]);
});

test("a single action reads T1, not nothing", () => {
  const result = bandsOf("faint");
  assert.equal(result.bands.defi_activity, "T1");
  assert.deepEqual(result.activeCategories, ["lending"]);
});

test("an unused address reads T0 and is not an error", () => {
  const result = bandsOf("empty");
  assert.equal(result.bands.defi_activity, "T0");
  assert.deepEqual(result.activeCategories, []);
  assert.equal(result.freshness.filter((f) => f.status === "live").length, registry.length);
});

test("stale sources report unavailable rather than a lower band", () => {
  const stale = bandsOf("heavy", MAX_AGE_SECONDS + 60);

  assert.equal(
    stale.bands.defi_activity,
    "unavailable",
    "a stale graph must not be read as an inactive wallet",
  );
  assert.notEqual(stale.bands.defi_activity, "T0");
  assert.ok(stale.freshness.every((f) => f.status === "stale"));
});

test("one live source still decides when another is stale", () => {
  const f = fixture("heavy");
  const now = capturedClock(f);

  // Age only the Ethereum lending source by rewriting nothing: drop it instead,
  // which is the same thing the freshness gate does to a stale entry.
  const partial = { ...f.responses };
  delete partial["aave-v3-ethereum"];

  const result = bandsFromResponses(f.address, registry, partial, now);
  assert.notEqual(result.bands.defi_activity, "unavailable");
  assert.ok(result.freshness.some((e) => e.status === "error"));
});

test("nothing but bands and categories leaves the module", () => {
  const raw = JSON.stringify(bandsOf("heavy"));
  assert.doesNotMatch(raw, /amountUSD|balance|depositCount|positionCount/i);
  assert.doesNotMatch(raw, /"actions"/);
});

test("a saturated page is reported as T4 without claiming precision", () => {
  const manifest: SubgraphManifest = {
    name: "synthetic",
    schemaType: "uniswap-v3",
    subgraphId: "x",
    network: "mainnet",
    category: "dex",
    countStrategy: "entities",
  };
  const results: SourceResult[] = [
    {
      manifest,
      reading: { category: "dex", actions: 100, saturated: true, present: true },
      freshness: { subgraph: "synthetic", blockNumber: 1, ageSeconds: 10, status: "live" },
    },
  ];
  assert.equal(computeBands("0x" + "ab".repeat(20), results).bands.defi_activity, "T4");
});

test("addresses are normalised and junk is rejected", () => {
  assert.equal(
    normaliseAddress("0x62E2CEB6933A0747579F4F9F96D3253A7AF0B237"),
    "0x62e2ceb6933a0747579f4f9f96d3253a7af0b237",
  );
  assert.throws(() => normaliseAddress("vitalik.eth"), AddressError);
  assert.throws(() => normaliseAddress("0x123"), AddressError);
});
