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
import { env } from "./env.js";

export type Credential =
  | { status: "missing"; detail?: string }
  | { status: "stand_in" }
  | { status: "verified"; source: "world"; humanId: string };

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
  const agentBook = createAgentBookVerifier();

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
          // Not an error: the wallet simply is not registered in the AgentBook.
          return { status: "missing", detail: "agent wallet is not registered" };
        }

        if (!(await withinQuota(resourceUri, humanId))) {
          return { status: "missing", detail: "this human is asking too often" };
        }

        return { status: "verified", source: "world", humanId };
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
 * Real verification needs a registered agent wallet. Until the key is present
 * the stand-in is used, and nothing upgrades itself silently.
 *
 * Split from the environment read so the choice itself is testable without a
 * .env on disk deciding the outcome.
 */
export function pickVerifier(hasAgentKey: boolean): CredentialVerifier {
  return hasAgentKey ? createWorldVerifier() : createMockVerifier();
}

export function verifierFromEnv(): CredentialVerifier {
  return pickVerifier(env.agentKeyPresent);
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
