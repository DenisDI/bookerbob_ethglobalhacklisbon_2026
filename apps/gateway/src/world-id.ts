// World ID Selfie Check: the browser half of personhood.
//
// AgentKit answers "is a human accountable for this AGENT". It cannot answer
// anything about a person sitting in front of a browser, because a browser cannot
// sign an agent header. This file is the other half: a person proves they are a
// person, and the gateway ends up holding an anonymous nullifier instead of an
// anonymous humanId. Same product axis, second source, which is what
// specs/00-final-plan.md D.1 asks for.
//
// The shape, verified against @worldcoin/idkit-core 4.2.2 and idkit-server 1.1.1
// rather than taken from prose:
//
//   signRequest({ signingKeyHex, action, ttl }) -> { sig, nonce, createdAt, expiresAt }
//   RpContext                                    = { rp_id, nonce, created_at, expires_at, signature }
//   IDKit result (v4)                            = { responses: [{ identifier, nullifier, issuer_schema_id, ... }] }
//   POST {portal}/api/v4/verify/{rp_id}          <- that result, forwarded as-is
//
// THE RULE, same as world.ts: the browser cannot assert a credential. It can only
// carry a proof to us, and only the Portal's answer turns it into one.

import { signRequest } from "@worldcoin/idkit-core/signing";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "./env.js";

/**
 * Issuer schema ids, from the SDK's own comment: 1=proof_of_human, 11=selfie,
 * 9303=passport, 9310=mnc. The credential asked for is configurable because
 * environments differ in what they can produce, so the check below has to follow
 * the request rather than assume one answer.
 */
export const SCHEMA_IDS: Record<string, number> = {
  proof_of_human: 1,
  selfie: 11,
  passport: 9303,
  mnc: 9310,
};

/** How long a signed request stays usable. Long enough to read the screen. */
const REQUEST_TTL_SECONDS = 300;

/** How long a completed check keeps its holder credentialled. */
const SESSION_TTL_SECONDS = 30 * 60;

export type RpContext = {
  rp_id: string;
  nonce: string;
  created_at: number;
  expires_at: number;
  signature: string;
};

export type WorldIdConfig = {
  appId: string;
  rpId: string;
  action: string;
  /** What the browser must ask for, so the widget and the check cannot disagree. */
  credential: string;
  environment: "production" | "staging" | "sandbox";
  rpContext: RpContext;
};

export function worldIdReady(): boolean {
  return Boolean(env.worldAppId && env.worldRpId && env.worldSigningKey);
}

/**
 * Everything the browser needs, and nothing it must not have.
 *
 * The signing key never appears here: what leaves is a signature over a nonce and
 * two timestamps. Signing on the client was the one thing World's own docs put in
 * bold, and it is the sort of shortcut that looks harmless in a demo.
 */
export function worldIdConfig(now: () => number = Date.now): WorldIdConfig {
  if (!worldIdReady()) throw new Error("world id is not configured");

  const signed = signRequest({
    signingKeyHex: env.worldSigningKey,
    action: env.worldAction,
    ttl: REQUEST_TTL_SECONDS,
  });

  return {
    appId: env.worldAppId,
    rpId: env.worldRpId,
    action: env.worldAction,
    credential: env.worldCredential,
    environment: env.worldEnvironment,
    rpContext: {
      rp_id: env.worldRpId,
      nonce: signed.nonce,
      // The SDK names these in camel case and the protocol in snake case, so the
      // rename happens once, here, instead of being got wrong in a component.
      created_at: signed.createdAt,
      expires_at: signed.expiresAt ?? Math.floor(now() / 1000) + REQUEST_TTL_SECONDS,
      signature: signed.sig,
    },
  };
}

export type PortalResult =
  | { ok: true; nullifier: string }
  | { ok: false; detail: string };

type IdkitResponseItem = {
  identifier?: unknown;
  nullifier?: unknown;
  issuer_schema_id?: unknown;
};

/**
 * The nullifier is read from the proof the caller sent, NOT from the Portal's
 * reply, and only after the Portal has said the proof holds. The Portal is the
 * authority on "is this real"; the payload is the authority on "who does it name".
 * Taking the identifier from a body we did not verify would be trusting the
 * answer to describe itself.
 */
export function credentialNullifier(
  payload: unknown,
  credential: string = env.worldCredential,
): string | null {
  if (typeof payload !== "object" || payload === null) return null;
  const responses = (payload as { responses?: unknown }).responses;
  if (!Array.isArray(responses)) return null;

  const schemaId = SCHEMA_IDS[credential];
  for (const item of responses as IdkitResponseItem[]) {
    if (typeof item !== "object" || item === null) continue;
    const wanted =
      (schemaId !== undefined && item.issuer_schema_id === schemaId) ||
      item.identifier === credential;
    if (!wanted) continue;
    if (typeof item.nullifier !== "string" || item.nullifier.length === 0) continue;
    return item.nullifier;
  }
  return null;
}

/**
 * What the Portal actually said, read defensively.
 *
 * An empty or unparseable body from a 2xx is treated as acceptance, because the
 * Portal has already answered with a success status and inventing a refusal from
 * silence would fail real people. An explicit `success: false`, at either level,
 * is a refusal.
 */
export function parsePortalVerdict(
  text: string,
  credential: string = env.worldCredential,
): { accepted: boolean; detail: string } {
  if (!text.trim()) return { accepted: true, detail: "empty body on a success status" };

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return { accepted: true, detail: "unreadable body on a success status" };
  }
  if (typeof body !== "object" || body === null) {
    return { accepted: true, detail: "unexpected body on a success status" };
  }

  const { success, results, detail, code } = body as {
    success?: unknown;
    results?: unknown;
    detail?: unknown;
    code?: unknown;
  };

  const said = (fallback: string) =>
    [code, detail].filter((v) => typeof v === "string").join(": ") || fallback;

  if (success === false) return { accepted: false, detail: said("success was false") };

  if (Array.isArray(results)) {
    const asked = (results as { identifier?: unknown; success?: unknown; detail?: unknown }[]).find(
      (r) => r?.identifier === credential,
    );
    if (asked && asked.success === false) {
      return {
        accepted: false,
        detail:
          typeof asked.detail === "string"
            ? asked.detail
            : `${credential} response failed`,
      };
    }
  }

  return { accepted: true, detail: "accepted" };
}

/** Never throws: a proof that does not check out is simply not a credential. */
export async function verifyWithPortal(
  payload: unknown,
  fetchImpl: typeof fetch = fetch,
  credential: string = env.worldCredential,
): Promise<PortalResult> {
  if (!worldIdReady()) return { ok: false, detail: "world id is not configured" };

  const nullifier = credentialNullifier(payload, credential);
  if (!nullifier) {
    return { ok: false, detail: `no ${credential} response in the proof` };
  }

  try {
    const res = await fetchImpl(`${env.worldPortalUrl}/api/v4/verify/${env.worldRpId}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      // Forwarded as-is. The Portal defines this shape and any field we
      // "helpfully" rewrote would be a field we broke.
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });

    const text = await res.text().catch(() => "");
    if (!res.ok) {
      return { ok: false, detail: `portal ${res.status}: ${text.slice(0, 300)}` };
    }

    // The status code is not the answer on its own. A refusal we measured came
    // back as `{"success":false,"code":"all_verifications_failed","results":[
    // {"identifier":"selfie","success":false,...}]}`, so the body carries a
    // verdict of its own and a 200 with success:false must not read as a pass.
    // Per-response too: a request can carry several credentials and only the
    // selfie one decides anything here.
    const verdict = parsePortalVerdict(text, credential);
    if (!verdict.accepted) {
      return { ok: false, detail: `portal said no: ${verdict.detail}` };
    }

    return { ok: true, nullifier };
  } catch (err) {
    return { ok: false, detail: (err as Error).message };
  }
}

/**
 * A completed check, carried by the browser on later requests.
 *
 * Stateless on purpose. Fly stops the machine when idle and there are two of
 * them, so a session held in memory would evaporate exactly the way the AgentKit
 * quota does, and the guest would be un-verified halfway through a demo. An HMAC
 * over the signing key we already need means any machine can read what any other
 * machine issued, with no store and no new secret.
 */
function sessionKey(): Buffer {
  return createHmac("sha256", "bookerbob-world-id-session")
    .update(env.worldSigningKey)
    .digest();
}

function sign(body: string): string {
  return createHmac("sha256", sessionKey()).update(body).digest("base64url");
}

export function mintSession(nullifier: string, now: () => number = Date.now): string {
  const expiresAt = Math.floor(now() / 1000) + SESSION_TTL_SECONDS;
  const body = Buffer.from(`${nullifier}.${expiresAt}`, "utf8").toString("base64url");
  return `${body}.${sign(body)}`;
}

export type SessionRead =
  | { status: "valid"; nullifier: string; expiresAt: number }
  | { status: "invalid"; detail: string };

export function readSession(token: string, now: () => number = Date.now): SessionRead {
  const cut = token.lastIndexOf(".");
  if (cut <= 0) return { status: "invalid", detail: "malformed session token" };

  const body = token.slice(0, cut);
  const presented = Buffer.from(token.slice(cut + 1), "base64url");
  const expected = Buffer.from(sign(body), "base64url");

  // Constant time, because comparing a MAC with === leaks how much of it matched.
  if (
    presented.length !== expected.length ||
    !timingSafeEqual(presented, expected)
  ) {
    return { status: "invalid", detail: "session signature does not verify" };
  }

  const [nullifier, expiry] = Buffer.from(body, "base64url").toString("utf8").split(".");
  const expiresAt = Number(expiry);
  if (!nullifier || !Number.isFinite(expiresAt)) {
    return { status: "invalid", detail: "malformed session payload" };
  }
  if (Math.floor(now() / 1000) > expiresAt) {
    return { status: "invalid", detail: "session expired" };
  }

  return { status: "valid", nullifier, expiresAt };
}

export { SESSION_TTL_SECONDS };
