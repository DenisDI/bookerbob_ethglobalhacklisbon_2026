// The probe exists to tell two different failures apart, so these tests are about
// exactly that: an unreachable chain must never be reported the way an
// unregistered wallet is. The SDK collapses both into null, which is how a
// rate-limited RPC in production reads as "your wallet is not registered".

import assert from "node:assert/strict";
import { test } from "node:test";
import { probeWorldChain } from "../src/world-chain.js";

const AT = () => "2026-07-25T00:00:00.000Z";

/** A fetch that never touches the network. */
function stubFetch(handler: () => Response | Promise<Response>) {
  const real = globalThis.fetch;
  globalThis.fetch = (async () => handler()) as typeof fetch;
  return () => {
    globalThis.fetch = real;
  };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

test("a block height means the chain is reachable", async () => {
  const restore = stubFetch(() => json({ jsonrpc: "2.0", id: 1, result: "0x1f4ee1c" }));
  try {
    const probe = await probeWorldChain("http://rpc.invalid", AT);
    assert.equal(probe.ok, true);
    assert.equal(probe.block, 0x1f4ee1c);
    assert.equal(probe.checkedAt, AT());
  } finally {
    restore();
  }
});

test("a rate limit is reported as a rate limit, not as a wallet problem", async () => {
  const restore = stubFetch(() => json({ error: "slow down" }, 429));
  try {
    const probe = await probeWorldChain("http://rpc.invalid", AT);
    assert.equal(probe.ok, false);
    assert.equal(probe.block, null);
    assert.match(probe.detail ?? "", /429/);
    assert.doesNotMatch(probe.detail ?? "", /registered/i);
  } finally {
    restore();
  }
});

test("a JSON-RPC error carries its own message through", async () => {
  const restore = stubFetch(() =>
    json({ jsonrpc: "2.0", id: 1, error: { message: "method not supported" } }),
  );
  try {
    const probe = await probeWorldChain("http://rpc.invalid", AT);
    assert.equal(probe.ok, false);
    assert.match(probe.detail ?? "", /method not supported/);
  } finally {
    restore();
  }
});

test("a refused connection is a failed probe, never a throw", async () => {
  const restore = stubFetch(() => {
    throw new Error("connect ECONNREFUSED");
  });
  try {
    const probe = await probeWorldChain("http://rpc.invalid", AT);
    assert.equal(probe.ok, false);
    assert.match(probe.detail ?? "", /ECONNREFUSED/);
  } finally {
    restore();
  }
});

test("a body without a result is not treated as reachable", async () => {
  const restore = stubFetch(() => json({ jsonrpc: "2.0", id: 1 }));
  try {
    const probe = await probeWorldChain("http://rpc.invalid", AT);
    assert.equal(probe.ok, false);
    assert.equal(probe.block, null);
  } finally {
    restore();
  }
});
