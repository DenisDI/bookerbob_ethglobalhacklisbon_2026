// Selfie Check, offline. Two properties matter here and nothing else does.
//
// The signing key never leaves the server, and a session is a credential only
// because THIS gateway signed it. Everything a browser sends is a claim; the
// Portal and an HMAC are what turn one into a fact.
//
// The Portal itself is not mocked into looking done: what only a network can
// settle goes in docs/FEEDBACK-selfie.md, measured, not simulated.

import assert from "node:assert/strict";
import { test } from "node:test";
import { Hono } from "hono";
import {
  mintSession,
  parsePortalVerdict,
  readSession,
  credentialNullifier,
  verifyWithPortal,
  worldIdConfig,
  worldIdReady,
} from "../src/world-id.js";
import { combine, credentialMiddleware, createMockVerifier, getCredential } from "../src/world.js";
import { env } from "../src/env.js";

const NULLIFIER = "0x9ab3f00d";

// The suite needs a configured gateway; .env supplies it locally and CI sets the
// same three values. Without them these tests would be asserting about nothing.
const configured = worldIdReady();

test("a request context is signed and carries no key", { skip: !configured }, () => {
  const config = worldIdConfig();

  assert.equal(config.rpId, env.worldRpId);
  assert.equal(config.appId, env.worldAppId);
  assert.match(config.rpContext.signature, /^0x[0-9a-f]+$/i);
  assert.ok(config.rpContext.nonce.length > 0);
  assert.ok(config.rpContext.expires_at > config.rpContext.created_at);

  // The one mistake this whole file exists to prevent.
  const serialised = JSON.stringify(config);
  assert.doesNotMatch(serialised, new RegExp(env.worldSigningKey.replace(/^0x/, "")));
  assert.doesNotMatch(serialised, /signingKey/i);
});

test("two contexts never reuse a nonce", { skip: !configured }, () => {
  assert.notEqual(worldIdConfig().rpContext.nonce, worldIdConfig().rpContext.nonce);
});

test("the nullifier comes from the asked credential, not from any response", () => {
  assert.deepEqual(
    credentialNullifier(
      {
        responses: [
          { identifier: "passport", nullifier: "0xnope", issuer_schema_id: 9303 },
          { identifier: "selfie", nullifier: NULLIFIER, issuer_schema_id: 11 },
        ],
      },
      ["selfie"],
    ),
    { nullifier: NULLIFIER, credential: "selfie" },
  );
  // Schema id alone is enough: the identifier is a label, 11 is the credential.
  assert.deepEqual(
    credentialNullifier({ responses: [{ nullifier: NULLIFIER, issuer_schema_id: 11 }] }, ["selfie"]),
    { nullifier: NULLIFIER, credential: "selfie" },
  );
});

// The product rule behind the list: a real World App answered "Humans Only,
// visit an Orb" while we asked only for proof_of_human. Selfie comes first so
// the low barrier is what a person is offered, and the orb credential is still
// accepted from anyone who already has it.
test("either credential counts, and the first one asked for wins", () => {
  const both = ["selfie", "proof_of_human"];

  assert.deepEqual(
    credentialNullifier({ responses: [{ identifier: "proof_of_human", nullifier: "0xorb", issuer_schema_id: 1 }] }, both),
    { nullifier: "0xorb", credential: "proof_of_human" },
    "somebody who already did the orb is not turned away",
  );
  assert.deepEqual(
    credentialNullifier({ responses: [{ identifier: "selfie", nullifier: NULLIFIER, issuer_schema_id: 11 }] }, both),
    { nullifier: NULLIFIER, credential: "selfie" },
  );
  assert.deepEqual(
    credentialNullifier(
      {
        responses: [
          { identifier: "proof_of_human", nullifier: "0xorb", issuer_schema_id: 1 },
          { identifier: "selfie", nullifier: NULLIFIER, issuer_schema_id: 11 },
        ],
      },
      both,
    ),
    { nullifier: NULLIFIER, credential: "selfie" },
    "preference order decides, not the order the proof happens to list",
  );
});

test("a proof without a selfie in it names nobody", () => {
  assert.equal(credentialNullifier({ responses: [] }, ["selfie"]), null);
  assert.equal(
    credentialNullifier({ responses: [{ identifier: "passport", nullifier: "0x1", issuer_schema_id: 9303 }] }, ["selfie"]),
    null,
  );
  assert.equal(credentialNullifier({ responses: "not an array" }, ["selfie"]), null);
  assert.equal(credentialNullifier(null, ["selfie"]), null);
  assert.equal(
    credentialNullifier({ responses: [{ identifier: "selfie", issuer_schema_id: 11 }] }, ["selfie"]),
    null,
    "a selfie response with no nullifier proves nothing",
  );
});

test("the portal is asked before anything is believed", { skip: !configured }, async () => {
  const calls: { url: string; body: unknown }[] = [];
  const payload = { responses: [{ identifier: "selfie", nullifier: NULLIFIER, issuer_schema_id: 11 }] };

  const result = await verifyWithPortal(
    payload,
    (async (url: string, init: RequestInit) => {
      calls.push({ url: String(url), body: JSON.parse(String(init.body)) });
      return new Response('{"success":true}', { status: 200 });
    }) as unknown as typeof fetch,
    ["selfie"],
  );

  assert.equal(result.ok, true);
  assert.equal(result.ok && result.nullifier, NULLIFIER);
  assert.match(calls[0]!.url, new RegExp(`/api/v4/verify/${env.worldRpId}$`));
  assert.deepEqual(calls[0]!.body, payload, "the proof is forwarded as-is, never rewritten");
});

test("a portal refusal is a refusal, however plausible the proof looked", { skip: !configured }, async () => {
  const result = await verifyWithPortal(
    { responses: [{ identifier: "selfie", nullifier: NULLIFIER, issuer_schema_id: 11 }] },
    (async () => new Response("proof invalid", { status: 400 })) as unknown as typeof fetch,
    ["selfie"],
  );

  assert.equal(result.ok, false);
  assert.match(result.ok === false ? result.detail : "", /400/);
});

// Measured against the live Portal on 2026-07-25 with a made-up proof. The body
// is quoted from that run, not invented, and it is the reason a 200 alone is not
// treated as a pass.
test("the portal's verdict lives in the body, not only in the status", () => {
  const measured =
    '{"success":false,"code":"all_verifications_failed","detail":"All proof verifications failed.",' +
    '"results":[{"identifier":"selfie","success":false,"code":"verification_failed",' +
    '"detail":"execution reverted (unknown custom error)"}]}';

  assert.equal(parsePortalVerdict(measured, "selfie").accepted, false);
  assert.match(parsePortalVerdict(measured, "selfie").detail, /all_verifications_failed/);

  // A per-response refusal counts even when the envelope says nothing.
  assert.equal(
    parsePortalVerdict('{"results":[{"identifier":"selfie","success":false,"detail":"nope"}]}', "selfie")
      .accepted,
    false,
  );
  // Another credential failing is not this credential failing.
  assert.equal(
    parsePortalVerdict('{"results":[{"identifier":"passport","success":false}]}', "selfie").accepted,
    true,
  );
});

test("silence on a success status is not turned into a refusal", () => {
  // Refusing a real person because a body was empty would be our bug, not theirs.
  assert.equal(parsePortalVerdict("", "selfie").accepted, true);
  assert.equal(parsePortalVerdict("not json", "selfie").accepted, true);
  assert.equal(parsePortalVerdict('{"success":true}', "selfie").accepted, true);
});

// The signing key is a parameter, so these run everywhere. Before that they sat
// behind `skip: !configured` and a CI without keys would have gone green on a
// broken module.
const KEY = "0x" + "ab".repeat(32);

test("a session round-trips, and only ours does", () => {
  const token = mintSession(NULLIFIER, Date.now, KEY);
  const read = readSession(token, Date.now, KEY);

  assert.equal(read.status, "valid");
  assert.equal(read.status === "valid" && read.nullifier, NULLIFIER);

  // Anyone can send the header. Only a signature this gateway made verifies.
  const [body] = token.split(".");
  for (const forged of [
    `${body}.deadbeef`,
    `${Buffer.from(`0xsomeone-else.${2 ** 40}`, "utf8").toString("base64url")}.${token.split(".")[1]}`,
    "nonsense",
    "",
  ]) {
    assert.equal(
      readSession(forged, Date.now, KEY).status,
      "invalid",
      `${forged.slice(0, 24)} must not verify`,
    );
  }
});

test("an expired session stops being a credential", () => {
  const token = mintSession(NULLIFIER, () => 1_000_000_000_000, KEY);
  const muchLater = () => 1_000_000_000_000 + 31 * 60 * 1000;

  assert.equal(readSession(token, muchLater, KEY).status, "invalid");
  assert.match(
    (readSession(token, muchLater, KEY) as { detail: string }).detail,
    /expired/,
  );
});

// The hole this guard closes: the session key is derived from the World signing
// key, so without one it derived from the empty string, which is a constant
// anybody can recompute from the source. A forged header then read as verified,
// which opens the settlement routes and switches off the x402 paywall.
test("a gateway with no key believes nobody", () => {
  const real = mintSession(NULLIFIER, Date.now, KEY);
  assert.equal(readSession(real, Date.now, null).status, "invalid");

  // Exactly the forgery the old code accepted: a token signed with the empty key.
  assert.throws(() => mintSession(NULLIFIER, Date.now, null), /not configured/);
  assert.equal(readSession("anything.at.all", Date.now, null).status, "invalid");
});

test("a session signed with another key is not our session", () => {
  const other = mintSession(NULLIFIER, Date.now, "0x" + "cd".repeat(32));
  assert.equal(readSession(other, Date.now, KEY).status, "invalid");
});

// D.1: two proofs, one decision.
test("either proof alone is a credential", () => {
  const agentkit = { status: "verified", source: "agentkit", humanId: "h" } as const;
  const worldId = { status: "verified", source: "world-id", humanId: NULLIFIER } as const;

  assert.deepEqual(combine(agentkit, { status: "missing" }), agentkit);
  assert.deepEqual(combine({ status: "missing" }, worldId), worldId);
});

test("when both pass, neither is dropped", () => {
  const both = combine(
    { status: "verified", source: "agentkit", humanId: "h" },
    { status: "verified", source: "world-id", humanId: NULLIFIER },
  );

  assert.equal(both.status === "verified" && both.source, "agentkit");
  assert.deepEqual(both.status === "verified" && both.sources, ["agentkit", "world-id"]);
});

test("a stand-in survives an absent world id, and nothing invents a credential", () => {
  assert.deepEqual(combine({ status: "stand_in" }, { status: "missing" }), { status: "stand_in" });
  assert.deepEqual(combine({ status: "missing" }, { status: "missing" }), { status: "missing" });
});

test("the middleware reads a session header into the credential", { skip: !configured }, async () => {
  const app = new Hono();
  app.use("*", credentialMiddleware(createMockVerifier()));
  app.get("/offers", (c) => c.json(getCredential(c)));

  const good = await app.request("http://localhost/offers", {
    headers: { "world-id": mintSession(NULLIFIER) },
  });
  assert.deepEqual(await good.json(), {
    status: "verified",
    source: "world-id",
    humanId: NULLIFIER,
  });

  const forged = await app.request("http://localhost/offers", {
    headers: { "world-id": "not.a.session" },
  });
  assert.deepEqual(await forged.json(), { status: "missing" });
});
