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
import {
  AddressError,
  bandsFromResponses,
  looksLikeName,
  normaliseAddress,
} from "../src/service.js";
import { TEMPLATES } from "../src/templates/index.js";
import { emptyReading } from "../src/types.js";
import type { Reading, SourceResult, SubgraphManifest } from "../src/types.js";

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

test("every registry entry has a template and declares its role", () => {
  assert.ok(registry.length >= 6, "the demo needs several sources to be a registry");
  for (const entry of registry) {
    const template = TEMPLATES[entry.schemaType];
    assert.ok(template, `no template for ${entry.schemaType}`);
    assert.ok(
      entry.role === "activity" || entry.role === "naming",
      `${entry.name} must declare a role`,
    );
    if (entry.role === "activity") {
      assert.ok(entry.category, `${entry.name} needs a category`);
      assert.equal(template.kind, "activity");
    } else {
      assert.equal(template.kind, "naming");
    }
  }
});

test("retired sources keep their reason", () => {
  const retired = loadRetired() as Array<{ retired?: { reason?: string } }>;
  assert.ok(retired.length > 0, "dead ids are recorded, not deleted");
  for (const entry of retired) {
    assert.ok(entry.retired?.reason, "a retired source must say why");
  }
});

test("a long lending history with liquidations reads high but not clean", () => {
  const result = bandsOf("heavy");

  assert.equal(result.bands.activity, "T4");
  assert.ok(["T3", "T4"].includes(result.bands.tenure), result.bands.tenure);
  assert.equal(
    result.signals.repayment,
    "liquidated",
    "this address was liquidated twice and the signal must say so",
  );
});

test("a broad trader has breadth and scale but no credit history", () => {
  const result = bandsOf("broad");

  assert.ok(["T3", "T4"].includes(result.bands.breadth), result.bands.breadth);
  assert.ok(["T2", "T3", "T4"].includes(result.bands.scale), result.bands.scale);
  assert.equal(result.signals.repayment, "no_credit_history");
  assert.ok(result.activeCategories.includes("dex"));
});

test("vitalik.eth resolves to a long tenure through the ENS name", () => {
  const result = bandsOf("vitalik");

  assert.equal(result.bands.tenure, "T4", "a 2017 name is the oldest signal we have");
  assert.equal(result.bands.breadth, "T4");
  assert.equal(result.bands.scale, "T4");
  assert.ok(result.ens?.name.endsWith(".eth"), JSON.stringify(result.ens));
});

test("a same-day address is thin on every axis", () => {
  const result = bandsOf("faint");

  assert.equal(result.bands.tenure, "T1", "hours old, not months");
  assert.equal(result.bands.activity, "T1");
  assert.equal(result.signals.repayment, "no_credit_history");
});

test("an unused address reads T0 everywhere and is not an error", () => {
  const result = bandsOf("empty");

  assert.equal(result.bands.activity, "T0");
  assert.equal(result.bands.tenure, "T0");
  assert.equal(result.bands.breadth, "T0");
  assert.equal(result.bands.scale, "T0");
  assert.deepEqual(result.activeCategories, []);
  assert.equal(result.ens, null);
});

test("stale sources report unavailable rather than a lower band", () => {
  const stale = bandsOf("heavy", MAX_AGE_SECONDS + 60);

  for (const [name, band] of Object.entries(stale.bands)) {
    assert.equal(band, "unavailable", `${name} must not be read from stale data`);
  }
  assert.ok(stale.freshness.every((f) => f.status === "stale"));
});

test("one live source still decides when another is missing", () => {
  const f = fixture("heavy");
  const partial = { ...f.responses };
  delete partial["aave-v3-ethereum"];

  const result = bandsFromResponses(f.address, registry, partial, capturedClock(f));
  assert.notEqual(result.bands.activity, "unavailable");
  assert.ok(result.freshness.some((e) => e.status === "error"));
});

test("nothing but bands, categories and a name leaves the module", () => {
  const raw = JSON.stringify(bandsOf("heavy"));
  assert.doesNotMatch(raw, /amountUSD|volumeUsd|borrowed|repaid|venues|"actions"/i);
  assert.doesNotMatch(raw, /\$\d/);
});

function liveSource(reading: Reading, manifest: Partial<SubgraphManifest> = {}) {
  const full: SubgraphManifest = {
    name: "synthetic",
    schemaType: "uniswap-v3",
    subgraphId: "x",
    network: "mainnet",
    role: "activity",
    category: "dex",
    countStrategy: "entities",
    ...manifest,
  };
  const result: SourceResult = {
    manifest: full,
    reading,
    name: null,
    freshness: { subgraph: full.name, blockNumber: 1, ageSeconds: 10, status: "live" },
  };
  return result;
}

test("a saturated page is T4 without claiming precision", () => {
  const reading: Reading = { ...emptyReading("dex"), actions: 100, saturated: true, present: true };
  const result = computeBands("0x" + "ab".repeat(20), [liveSource(reading)], 1_800_000_000);
  assert.equal(result.bands.activity, "T4");
});

test("repayment is clean only when money went out and came back", () => {
  const now = 1_800_000_000;
  const base = { ...emptyReading("lending"), actions: 10, present: true };

  const clean = computeBands(
    "0x" + "ab".repeat(20),
    [liveSource({ ...base, borrowed: 5000, repaid: 4800 }, { category: "lending" })],
    now,
  );
  assert.equal(clean.signals.repayment, "clean");

  const caught = computeBands(
    "0x" + "ab".repeat(20),
    [liveSource({ ...base, borrowed: 5000, repaid: 4800, liquidations: 1 }, { category: "lending" })],
    now,
  );
  assert.equal(
    caught.signals.repayment,
    "liquidated",
    "one liquidation outranks a good repayment record",
  );

  const never = computeBands(
    "0x" + "ab".repeat(20),
    [liveSource(base, { category: "lending" })],
    now,
  );
  assert.equal(never.signals.repayment, "no_credit_history");
});

test("tenure comes from the oldest thing seen, including an ENS name", () => {
  const now = 1_800_000_000;
  const fourYearsAgo = now - 4 * 365 * 86_400;
  const reading: Reading = { ...emptyReading("dex"), actions: 3, present: true, firstSeen: now - 86_400 };

  const withoutName = computeBands("0x" + "ab".repeat(20), [liveSource(reading)], now);
  assert.equal(withoutName.bands.tenure, "T1", "one day old on activity alone");

  const withName = computeBands("0x" + "ab".repeat(20), [liveSource(reading)], now, {
    name: "old.eth",
    createdAt: fourYearsAgo,
  });
  assert.equal(withName.bands.tenure, "T4", "the name is older than the activity");
});

test("a typed name resolves to an address with its registration date", () => {
  const template = TEMPLATES.ens;
  assert.ok(template && template.kind === "naming");

  const f = JSON.parse(
    readFileSync(fileURLToPath(new URL("./fixtures/ens.json", import.meta.url)), "utf8"),
  ) as {
    forward: { response: unknown };
    junkReverse: { response: unknown };
  };

  const resolved = template.readForward(f.forward.response);
  assert.ok(resolved, "vitalik.eth must resolve");
  assert.equal(resolved.address, "0xd8da6bf26964af9d7eed9e03e53415d37aa96045");
  assert.equal(resolved.record.name, "vitalik.eth");
  assert.ok(
    (resolved.record.createdAt ?? 0) > 0 && (resolved.record.createdAt ?? 0) < 1_500_000_000,
    "the name predates 2017-07, which is the whole point of using it for tenure",
  );

  // Junk: every record on this address has an unresolvable label, so the right
  // answer is no name at all rather than an ancient one.
  assert.equal(
    template.readReverse(f.junkReverse.response),
    null,
    "bracketed labels must not become a name, or a burn address inherits 2017",
  );
});

test("a name that does not exist resolves to nothing, not to a guess", () => {
  const template = TEMPLATES.ens;
  assert.ok(template && template.kind === "naming");
  assert.equal(template.readForward({ domains: [] }), null);
  assert.equal(template.readForward({}), null);
});

test("addresses are normalised, names are recognised, junk is rejected", () => {
  assert.equal(
    normaliseAddress("0x62E2CEB6933A0747579F4F9F96D3253A7AF0B237"),
    "0x62e2ceb6933a0747579f4f9f96d3253a7af0b237",
  );
  assert.ok(looksLikeName("vitalik.eth"));
  assert.ok(!looksLikeName("0x62e2ceb6933a0747579f4f9f96d3253a7af0b237"));
  assert.throws(() => normaliseAddress("vitalik.eth"), AddressError);
  assert.throws(() => normaliseAddress("0x123"), AddressError);
});
