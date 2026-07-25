// The credential axis, offline. These tests guard one property: nothing except a
// verified AgentKit header may say "world". A stand-in that could claim it would
// put a partner integration on screen that never ran.

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createMockVerifier,
  credentialLabel,
  NO_CREDENTIAL,
  pickVerifier,
} from "../src/world.js";

const RESOURCE = "http://localhost:3000/offers";

test("the mock verifier cannot produce a verified credential", async () => {
  const mock = createMockVerifier();

  const accepted = await mock.verify("dev:human-1", RESOURCE);
  assert.equal(accepted.status, "stand_in");

  // Exhaustive on purpose: whatever a caller sends, "verified" is unreachable.
  for (const header of ["dev:", "dev:world", "verified", "world", "", "{}"]) {
    const result = await mock.verify(header, RESOURCE);
    assert.notEqual(
      result.status,
      "verified",
      `${JSON.stringify(header)} must not reach verified through the mock`,
    );
  }
});

test("the mock refuses anything that is not a dev header", async () => {
  const result = await createMockVerifier().verify("garbage", RESOURCE);
  assert.equal(result.status, "missing");
  assert.match(result.detail ?? "", /dev:/);
});

test("no agent key means the stand-in, a key means real verification", () => {
  assert.equal(pickVerifier(false).kind, "mock");
  assert.equal(pickVerifier(true).kind, "world");
});

test("a missing credential is the default, and it is not an error", () => {
  assert.equal(NO_CREDENTIAL.status, "missing");
});

test("labels never promise World for a stand-in", () => {
  assert.doesNotMatch(credentialLabel({ status: "stand_in" }), /^verified/i);
  assert.match(credentialLabel({ status: "stand_in" }), /not World yet/i);
  assert.match(
    credentialLabel({ status: "verified", source: "world", humanId: "h" }),
    /verified by World/i,
  );
  assert.match(credentialLabel({ status: "missing" }), /no credential/i);
});

test("a humanId is never part of a label", () => {
  const label = credentialLabel({
    status: "verified",
    source: "world",
    humanId: "human-secret-id",
  });
  assert.doesNotMatch(label, /human-secret-id/);
});
