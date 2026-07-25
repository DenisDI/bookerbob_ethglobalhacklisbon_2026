// Wallet ownership axis, offline. Typed consent stays typed; only a matching
// linked wallet from a verified Privy session may say "verified".

import assert from "node:assert/strict";
import { test } from "node:test";
import { Hono } from "hono";
import {
  bindWalletConsent,
  contextAddress,
  isHexAddress,
  normalizeHex,
  parseBearerToken,
  publicWallet,
  resolveWalletConsent,
  walletsFromLinkedAccounts,
  type PrivySessionLookup,
} from "../src/privy.js";

const MINE = "0x62e2ceb6933a0747579f4f9f96d3253a7af0b237";
const OTHER = "0x646c5ba59f30cf73deea9b00e13aead674c6b07a";
const DID = "did:privy:test-user";

test("hex addresses normalise case-insensitively", () => {
  assert.equal(isHexAddress(MINE), true);
  assert.equal(isHexAddress("vitalik.eth"), false);
  assert.equal(normalizeHex(MINE.toUpperCase()), MINE.toLowerCase());
});

test("no address and no session is missing", () => {
  assert.deepEqual(bindWalletConsent(undefined, null), { status: "missing" });
  assert.deepEqual(bindWalletConsent("", null), { status: "missing" });
  assert.deepEqual(bindWalletConsent("   ", []), { status: "missing" });
});

test("typed address without a session stays typed", () => {
  assert.deepEqual(bindWalletConsent(MINE, null), { status: "typed" });
  assert.deepEqual(bindWalletConsent("vitalik.eth", null), { status: "typed" });
  assert.deepEqual(bindWalletConsent(MINE, []), { status: "typed" });
});

test("matching linked wallet makes ownership verified", () => {
  const consent = bindWalletConsent(MINE.toUpperCase(), [OTHER, MINE]);
  assert.equal(consent.status, "verified");
  if (consent.status === "verified") {
    assert.equal(normalizeHex(consent.address), normalizeHex(MINE));
  }
});

test("session that does not own the typed address stays typed", () => {
  assert.deepEqual(bindWalletConsent(MINE, [OTHER]), { status: "typed" });
  // ENS is never in Privy linked accounts as a string match.
  assert.deepEqual(bindWalletConsent("vitalik.eth", [MINE]), {
    status: "typed",
  });
});

test("session with no query address uses the primary linked wallet", () => {
  const consent = bindWalletConsent(undefined, [MINE, OTHER]);
  assert.deepEqual(consent, { status: "verified", address: MINE });
});

test("contextAddress prefers the typed query, else the verified wallet", () => {
  assert.equal(
    contextAddress("vitalik.eth", { status: "typed" }),
    "vitalik.eth",
  );
  assert.equal(
    contextAddress(undefined, { status: "verified", address: MINE }),
    MINE,
  );
  assert.equal(contextAddress(undefined, { status: "missing" }), undefined);
  assert.equal(
    contextAddress(`  ${MINE}  `, { status: "verified", address: OTHER }),
    MINE,
  );
});

test("publicWallet never invents verified", () => {
  assert.deepEqual(publicWallet({ status: "typed" }), { status: "typed" });
  assert.deepEqual(publicWallet({ status: "missing" }), { status: "missing" });
  assert.deepEqual(publicWallet({ status: "verified", address: MINE }), {
    status: "verified",
    address: MINE,
  });
});

test("Bearer parsing accepts only a real token", () => {
  assert.equal(parseBearerToken(undefined), null);
  assert.equal(parseBearerToken(""), null);
  assert.equal(parseBearerToken("Basic abc"), null);
  assert.equal(parseBearerToken("Bearer"), null);
  assert.equal(parseBearerToken("Bearer tok"), "tok");
  assert.equal(parseBearerToken("  bearer  tok.with.dots  "), "tok.with.dots");
});

test("linked_accounts keeps wallets and smart wallets, drops the rest", () => {
  assert.deepEqual(
    walletsFromLinkedAccounts([
      { type: "email", address: "a@b.c" },
      { type: "wallet", address: MINE },
      { type: "smart_wallet", address: OTHER },
      { type: "wallet", address: "not-an-address" },
      { type: "wallet" },
    ]),
    [MINE, OTHER],
  );
  assert.deepEqual(walletsFromLinkedAccounts(undefined), []);
});

function fakeLookup(
  opts: {
    configured?: boolean;
    sub?: string | null;
    wallets?: string[] | null;
    verifyCalls?: string[];
  } = {},
): PrivySessionLookup {
  const verifyCalls = opts.verifyCalls ?? [];
  return {
    configured: opts.configured ?? true,
    async verify(accessToken) {
      verifyCalls.push(accessToken);
      if (opts.sub === null) return null;
      return { sub: opts.sub ?? DID };
    },
    async wallets() {
      return opts.wallets === undefined ? [MINE] : opts.wallets;
    },
  };
}

test("resolve: no Authorization means typed when an address is present", async () => {
  const consent = await resolveWalletConsent(
    undefined,
    MINE,
    fakeLookup({ configured: true }),
  );
  assert.deepEqual(consent, { status: "typed" });
});

test("resolve: matching Bearer + linked wallet is verified", async () => {
  const calls: string[] = [];
  const consent = await resolveWalletConsent(
    `Bearer session-token`,
    MINE,
    fakeLookup({ wallets: [OTHER, MINE], verifyCalls: calls }),
  );
  assert.deepEqual(consent, { status: "verified", address: MINE });
  assert.deepEqual(calls, ["session-token"]);
});

test("resolve: rejected token falls back to typed, never verified", async () => {
  const consent = await resolveWalletConsent(
    "Bearer garbage",
    MINE,
    fakeLookup({ sub: null, wallets: [MINE] }),
  );
  assert.deepEqual(consent, { status: "typed" });
});

test("resolve: Privy unset skips verify and stays typed", async () => {
  const calls: string[] = [];
  const consent = await resolveWalletConsent(
    "Bearer session-token",
    MINE,
    fakeLookup({ configured: false, verifyCalls: calls }),
  );
  assert.deepEqual(consent, { status: "typed" });
  assert.deepEqual(calls, []);
});

test("resolve: Bearer alone, no address, uses primary linked wallet", async () => {
  const consent = await resolveWalletConsent(
    "Bearer session-token",
    undefined,
    fakeLookup({ wallets: [MINE, OTHER] }),
  );
  assert.deepEqual(consent, { status: "verified", address: MINE });
});

test("resolve: showcase ENS with a real session stays typed", async () => {
  const consent = await resolveWalletConsent(
    "Bearer session-token",
    "vitalik.eth",
    fakeLookup({ wallets: [MINE] }),
  );
  assert.deepEqual(consent, { status: "typed" });
});

/**
 * Same honesty rule as world middleware: the handler only sees what resolve
 * returns, and verified never appears without a matching session.
 */
function walletApp(lookup: PrivySessionLookup) {
  const app = new Hono();
  app.get("/offers", async (c) => {
    const consent = await resolveWalletConsent(
      c.req.header("authorization"),
      c.req.query("address"),
      lookup,
    );
    return c.json({
      wallet: publicWallet(consent),
      contextAddress: contextAddress(c.req.query("address"), consent),
    });
  });
  return app;
}

test("handler surface: typed query without Bearer", async () => {
  const res = await walletApp(fakeLookup()).request(
    `http://localhost/offers?address=${MINE}`,
  );
  assert.deepEqual(await res.json(), {
    wallet: { status: "typed" },
    contextAddress: MINE,
  });
});

test("handler surface: Bearer binds ownership on the wire", async () => {
  const res = await walletApp(fakeLookup({ wallets: [MINE] })).request(
    `http://localhost/offers?address=${MINE}`,
    { headers: { Authorization: "Bearer tok" } },
  );
  assert.deepEqual(await res.json(), {
    wallet: { status: "verified", address: MINE },
    contextAddress: MINE,
  });
});

test("handler surface: Bearer without address still exposes verified wallet", async () => {
  const res = await walletApp(fakeLookup({ wallets: [MINE] })).request(
    "http://localhost/offers",
    { headers: { Authorization: "Bearer tok" } },
  );
  assert.deepEqual(await res.json(), {
    wallet: { status: "verified", address: MINE },
    contextAddress: MINE,
  });
});

test("handler surface: mismatched address cannot claim verified", async () => {
  const res = await walletApp(fakeLookup({ wallets: [OTHER] })).request(
    `http://localhost/offers?address=${MINE}`,
    { headers: { Authorization: "Bearer tok" } },
  );
  const body = (await res.json()) as {
    wallet: { status: string };
  };
  assert.equal(body.wallet.status, "typed");
});
