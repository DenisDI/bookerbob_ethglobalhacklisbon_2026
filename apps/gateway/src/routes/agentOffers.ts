// GET /agent/offers — the backed lane of the race, asked by a real agent.
//
// Everywhere else the browser can only ASSERT a credential and the gateway
// answers `stand_in`, which is honest but leaves the World integration invisible
// on the surface where the race is watched. This route closes that: the gateway
// signs an AgentKit header with our registered agent wallet, calls its own
// /offers with it, and the ordinary verification path takes over. Nothing here
// decides anything about the credential. The AgentBook lookup on World Chain
// does, exactly as it does for scripts/agent-with-credential.ts.
//
// A DELIBERATE EXCEPTION, STATED RATHER THAN HIDDEN. env.ts and world.ts both say
// the agent's signing key has no business on the server, and that is right: it
// belongs to the party doing the asking, and keying anything off its presence was
// a bug we already fixed once. This route breaks that rule on purpose, for one
// surface, because a race where the agent lives in a terminal cannot show a judge
// what it does. The key signs and is never read for any decision; verification
// still needs no secret at all.
//
// Two traps, both learned the hard way and both preserved from the script:
//   · domain is the HOSTNAME, no port, or validation fails on a domain mismatch;
//   · resourceUri must be the exact string publicResource(c) will produce, or the
//     credential is refused as issued for somewhere else.

import { createAgentkitClient, declareAgentkitExtension } from "@worldcoin/agentkit";
import type { Context } from "hono";
import { privateKeyToAccount } from "viem/accounts";
import { env } from "../env.js";
import { publicOrigin } from "../public-url.js";

/** World Chain: the AgentBook resolves there whatever chain signed. */
const CHAIN = "eip155:480";

/**
 * A fresh header per request, deliberately.
 *
 * The freshness window is five minutes and a nonce may be spent once, so a header
 * cached between takes would start failing mid-recording in a way that looks like
 * the integration broke. Signing costs milliseconds.
 */
export async function signAgentHeader(origin: string): Promise<string> {
  const account = privateKeyToAccount(env.agentPrivateKey as `0x${string}`);
  const resource = `${origin}/offers`;

  const client = createAgentkitClient({
    signer: {
      address: account.address,
      chainId: CHAIN,
      type: "eip191",
      signMessage: (message) => account.signMessage({ message }),
    },
  });

  const declared = declareAgentkitExtension({
    domain: new URL(origin).hostname,
    resourceUri: resource,
    statement: "book a room on behalf of the human backing this agent",
    network: CHAIN,
  });
  const base = Object.values(declared)[0];
  if (!base) throw new Error("agentkit extension was not declared");

  // declareAgentkitExtension is the SERVER half of the handshake and leaves these
  // empty, because in the x402 flow the server issues them in its 402 challenge.
  // A header-only client has to mint them, and the error when it does not is
  // "nonce: Required, issuedAt: Required", which does not say whose job they are.
  return client.createHeader({
    ...base,
    info: {
      ...base.info,
      nonce: crypto.randomUUID().replace(/-/g, ""),
      issuedAt: new Date().toISOString(),
    },
  });
}

export async function agentOffersHandler(c: Context) {
  if (!env.agentPrivateKey) {
    // Not a crash and not a silent downgrade to the stand-in: a lane that cannot
    // prove anything must say so rather than look like one that did.
    return c.json(
      {
        error: "agent_key_unset",
        message:
          "LISBON2026_AGENT_PRIVATE_KEY is required for the agent lane; the browser stand-in path still works",
      },
      501,
    );
  }

  const origin = publicOrigin(c);

  let header: string;
  try {
    header = await signAgentHeader(origin);
  } catch (err) {
    console.warn(`agent lane could not sign: ${(err as Error).message}`);
    return c.json({ error: "agent_signing_failed" }, 502);
  }

  const query = new URLSearchParams();
  const address = c.req.query("address")?.trim();
  const city = c.req.query("city")?.trim();
  if (address) query.set("address", address);
  if (city) query.set("city", city);
  // A credentialed request is never metered, and this one is about to be
  // credentialed for real. Saying so keeps the paywall out of the way even in the
  // moment between the request arriving and the header being read.
  query.set("metered", "false");

  const res = await fetch(`${origin}/offers?${query.toString()}`, {
    headers: { agentkit: header },
  });

  // Passed through as it came. What the credential says is the AgentBook's answer,
  // and this route has no opinion to add to it.
  return new Response(await res.text(), {
    status: res.status,
    headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
  });
}
