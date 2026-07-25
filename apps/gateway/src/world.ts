// World AgentKit: is there a real, unique human behind this agent?
//
// This is Plan A from specs/01-gateway.md: plain verification in front of the
// route, not a composition of two betas. An agent presents a signed `agentkit`
// header; we parse it, check it was issued for THIS resource, verify the
// signature, and look the wallet up in the AgentBook on World Chain. What comes
// back is an anonymous human identifier or nothing.
//
// THE ONE RULE THIS FILE ENFORCES: only a verified header may say "world".
// The browser can assert `?credential=1` and the mock can hand out a dev header,
// and both of those are `stand_in` forever. A stand-in that could call itself
// verified would put a partner integration on screen that never ran, which
// specs/00-final-plan.md F forbids naming.
//
// Verified against @worldcoin/agentkit 0.2.0 on 2026-07-25. Note for anyone
// following the spec: §E says createAgentBookVerifier lives in
// @worldcoin/agentkit-core and not in @worldcoin/agentkit. In 0.2.0 the latter
// re-exports the whole of the former, so one dependency is enough. See
// docs/FEEDBACK-world.md.

import {
  createAgentBookVerifier,
  InMemoryAgentKitStorage,
  parseAgentkitHeader,
  validateAgentkitMessage,
  verifyAgentkitSignature,
} from "@worldcoin/agentkit";
import type { Context, MiddlewareHandler } from "hono";
import { env } from "./env.js";
import { publicResource } from "./public-url.js";
import { probeWorldChain, worldRpcUrl } from "./world-chain.js";

/**
 * Where the personhood came from. Two different mechanisms answer two different
 * questions and must not collapse into one word: AgentKit proves an AGENT is
 * registered to a human, World ID proves a HUMAN is one. 00-final-plan D.1 wants
 * both combined in a single term decision, so the distinction is in the type
 * before there is a second source to distinguish.
 */
export type CredentialSource = "agentkit" | "world-id";

export type Credential =
  | { status: "missing"; detail?: string }
  | { status: "stand_in" }
  | { status: "verified"; source: CredentialSource; humanId: string };

export const NO_CREDENTIAL: Credential = { status: "missing" };

export interface CredentialVerifier {
  readonly kind: "world" | "mock";
  /** Never throws. A header that does not check out is simply no credential. */
  verify(header: string, resourceUri: string): Promise<Credential>;
}

/**
 * Anti-farming, not a perk.
 *
 * A credential removes the sybil problem, so the per-human quota exists to stop
 * one person minting endless agents against a live supplier, exactly the way a
 * rate limit does. It is deliberately generous: nothing about the demo should
 * ever hit it on stage.
 */
const QUOTA_PER_HUMAN = 500;

/**
 * In memory, so per process: with auto_stop_machines the gateway sleeps when
 * idle, and both the quota and the spent-nonce set start empty on the next wake.
 * Stated rather than implied. A shared store is the fix if this ever outgrows a
 * demo, and the SDK's own type comment warns about the same class of problem.
 */
const storage = new InMemoryAgentKitStorage();

async function withinQuota(endpoint: string, humanId: string): Promise<boolean> {
  try {
    return await storage.tryIncrementUsage(endpoint, humanId, QUOTA_PER_HUMAN);
  } catch {
    // A broken counter must not deny a real human their terms.
    return true;
  }
}

/**
 * Replay protection, handed to the SDK rather than bolted on after it: a nonce
 * may be spent once, and validateAgentkitMessage takes the check as an option so
 * a reused header fails validation instead of passing it and being caught later.
 */
const MAX_AGE_SECONDS = 300;

async function checkNonce(nonce: string): Promise<boolean> {
  if (!storage.hasUsedNonce || !storage.recordNonce) return true;
  try {
    if (await storage.hasUsedNonce(nonce)) return false;
    await storage.recordNonce(nonce);
    return true;
  } catch {
    // A broken store must not deny a real human their terms.
    return true;
  }
}

export function createWorldVerifier(): CredentialVerifier {
  // Our own RPC when configured. The SDK default is a shared public endpoint, and
  // lookupHuman turns any failure against it into a plain null.
  const agentBook = createAgentBookVerifier({ rpcUrl: worldRpcUrl() });

  return {
    kind: "world",
    async verify(header, resourceUri) {
      try {
        const payload = parseAgentkitHeader(header);

        // Bound to the resource, not issued in general: a credential minted for
        // some other endpoint is not a credential here. Freshness and replay are
        // checked in the same call.
        const validation = await validateAgentkitMessage(payload, resourceUri, {
          maxAge: MAX_AGE_SECONDS,
          checkNonce,
        });
        if (!validation.valid) {
          return { status: "missing", detail: validation.error ?? "message rejected" };
        }

        // Handles both EOA signatures and ERC-1271 smart wallets.
        const signature = await verifyAgentkitSignature(payload);
        if (!signature.valid || !signature.address) {
          return { status: "missing", detail: "signature did not verify" };
        }

        const humanId = await agentBook.lookupHuman(signature.address);
        if (!humanId) {
          // lookupHuman returns null for an unregistered wallet AND for every
          // failure on the way to asking, so the two get told apart here. One is
          // the caller's problem, the other is ours, and they were reported as
          // the same sentence until this check existed.
          const chain = await probeWorldChain();
          return {
            status: "missing",
            detail: chain.ok
              ? "agent wallet is not registered"
              : `world chain unreachable from this machine: ${chain.detail}`,
          };
        }

        if (!(await withinQuota(resourceUri, humanId))) {
          return { status: "missing", detail: "this human is asking too often" };
        }

        return { status: "verified", source: "agentkit", humanId };
      } catch (err) {
        return { status: "missing", detail: (err as Error).message };
      }
    },
  };
}

/**
 * Development stand-in, so the credential path can be exercised before a wallet
 * is registered. Accepts `dev:<anything>` and returns `stand_in`. There is no
 * branch in here that can produce `verified`, and that is the point.
 */
export function createMockVerifier(): CredentialVerifier {
  return {
    kind: "mock",
    async verify(header) {
      return header.startsWith("dev:")
        ? { status: "stand_in" }
        : { status: "missing", detail: "mock verifier only takes dev: headers" };
    },
  };
}

/**
 * Real verification by default; the stand-in only when asked for by name.
 *
 * This used to switch on whether LISBON2026_AGENT_PRIVATE_KEY was set, which was
 * wrong in a way that only production showed: that key belongs to the agent doing
 * the asking, not to the server doing the checking. It is in a local .env and
 * nowhere else, so the deployed gateway ran the stand-in and refused every real
 * credential while local runs verified fine. Checking a credential needs no
 * secret, so there is nothing to be missing.
 *
 * Split from the environment read so the choice itself is testable without a
 * .env on disk deciding the outcome.
 */
export function pickVerifier(mode: string): CredentialVerifier {
  return mode.trim() === "stand_in" ? createMockVerifier() : createWorldVerifier();
}

export function verifierFromEnv(): CredentialVerifier {
  return pickVerifier(env.credentialMode);
}

export function credentialLabel(credential: Credential): string {
  switch (credential.status) {
    case "missing":
      return "no credential";
    case "stand_in":
      return "stand-in, not World yet";
    case "verified":
      return "verified by World";
  }
}

/**
 * Credential resolution as middleware, deliberately, not inside a handler.
 *
 * specs/01-gateway.md puts this in front of the x402 paywall so a credentialed
 * request skips metering. If the decision lived in the offers handler, the
 * paywall and the handler would each have to work it out and agree. Now every
 * route reads one answer, and the routes that create a hold or move money can
 * refuse an anonymous caller without repeating the verification.
 *
 * No header means no work: nothing is parsed, nothing is looked up.
 */
const CREDENTIAL_KEY = "credential";

export function credentialMiddleware(
  verifier: CredentialVerifier = verifierFromEnv(),
): MiddlewareHandler {
  return async (c, next) => {
    const header = c.req.header("agentkit");

    if (header) {
      const presented = await verifier.verify(header, publicResource(c));

      // Logged, never returned: the reason a credential did not check out is
      // operator information, and telling a caller exactly which check it failed
      // is free help for forging the next one.
      if (presented.status === "missing" && presented.detail) {
        console.warn(`credential rejected (${verifier.kind}): ${presented.detail}`);
      }
      c.set(CREDENTIAL_KEY, presented);
    } else {
      c.set(CREDENTIAL_KEY, NO_CREDENTIAL);
    }

    await next();
  };
}

export function getCredential(c: Context): Credential {
  return (c.get(CREDENTIAL_KEY) as Credential | undefined) ?? NO_CREDENTIAL;
}

/**
 * Deferred settlement is the thing a credential underwrites, so the routes that
 * hold a room or move money refuse a caller nobody is accountable for. A
 * stand-in passes: it is the browser demo, and it is labelled as such everywhere.
 */
export function mayDeferSettlement(credential: Credential): boolean {
  return credential.status !== "missing";
}

/**
 * The only shape a credential may take on its way out of the gateway.
 *
 * Two things stay behind. `humanId` is anonymous but it is still somebody's
 * identifier and has no business on a screen. `detail` says which check failed,
 * which is operator information and free help for forging the next attempt: it
 * is logged instead. One function owns this so no route can leak either by
 * spreading the object.
 */
export function publicCredential(credential: Credential): {
  status: Credential["status"];
  source?: CredentialSource;
} {
  return credential.status === "verified"
    ? { status: "verified", source: credential.source }
    : { status: credential.status };
}
