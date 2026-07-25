// GET  /world-id/context  what the browser needs to open the check
// POST /world-id/verify   the finished proof, checked by the Portal, exchanged
//                         for a session the browser can present to /offers
//
// Two routes rather than one because the signing key stays here. The browser gets
// a signature over a nonce; it never gets the thing that made it.

import type { Context } from "hono";
import {
  mintSession,
  SESSION_TTL_SECONDS,
  verifyWithPortal,
  worldIdConfig,
  worldIdReady,
} from "../world-id.js";

export function worldIdContextHandler(c: Context) {
  if (!worldIdReady()) {
    // Not an error the caller caused, and the UI says so rather than pretending
    // a step exists that cannot finish.
    return c.json({ error: "world_id_unconfigured" }, 503);
  }

  // Two audiences stand at a demo table: somebody holding a World App, and
  // somebody holding nothing. They need different environments, so the browser
  // may ask for one rather than the server picking for everybody. Anything
  // unrecognised falls through to the configured default.
  const asked = c.req.query("env")?.trim();
  const environment =
    asked === "production" || asked === "staging" || asked === "sandbox" ? asked : undefined;

  return c.json(worldIdConfig(Date.now, environment));
}

/**
 * A cheap ceiling on how often one caller may make us talk to the Portal.
 *
 * In memory, so per process and reset when the machine sleeps, which is the same
 * caveat the AgentKit quota carries and is stated for the same reason. It is not
 * a security control, it is a courtesy to the Portal and a brake on someone
 * hammering the one route here that makes an outbound call.
 */
const VERIFY_PER_MINUTE = 20;
const attempts = new Map<string, { count: number; windowStart: number }>();

function withinVerifyRate(caller: string, now = Date.now()): boolean {
  const window = 60_000;
  const seen = attempts.get(caller);
  if (!seen || now - seen.windowStart > window) {
    attempts.set(caller, { count: 1, windowStart: now });
    return true;
  }
  seen.count += 1;
  return seen.count <= VERIFY_PER_MINUTE;
}

export type VerifyReason =
  /** The proof carried no credential this gateway accepts. */
  | "credential_missing"
  /** The Portal looked and said no. */
  | "portal_refused"
  /** The proof was for another action, or its context had expired. */
  | "stale"
  /** We could not reach the Portal at all. */
  | "unreachable";

export function reasonFor(detail: string): VerifyReason {
  if (/no .* response in the proof/.test(detail)) return "credential_missing";
  if (/action|expire|too old/i.test(detail)) return "stale";
  if (/portal \d|portal said no/.test(detail)) return "portal_refused";
  return "unreachable";
}

export async function worldIdVerifyHandler(c: Context) {
  if (!worldIdReady()) {
    return c.json({ error: "world_id_unconfigured" }, 503);
  }

  const caller =
    c.req.header("fly-client-ip") ?? c.req.header("x-forwarded-for") ?? "local";
  if (!withinVerifyRate(caller)) {
    return c.json({ error: "too_many_attempts" }, 429);
  }

  const payload = await c.req.json().catch(() => null);
  if (!payload) {
    return c.json({ error: "proof_required" }, 400);
  }

  const result = await verifyWithPortal(payload);
  if (!result.ok) {
    // The full sentence is logged; a category comes back. The line between the
    // two is whether it helps forge the next attempt: "your proof did not
    // verify" does not, and a person standing at a demo needs to know which of
    // these four things happened rather than reading "something went wrong".
    console.warn(`world id proof rejected: ${result.detail}`);
    return c.json({ error: "proof_rejected", reason: reasonFor(result.detail) }, 400);
  }

  // The nullifier stays on this side. What the browser gets back says only that
  // somebody proved personhood, which check they did it with, and for how long
  // that stays true. Naming the check matters here: the whole point of the fix
  // that produced this line is that a person should be doing the low barrier one.
  return c.json({
    token: mintSession(result.nullifier),
    credential: result.credential,
    expiresInSeconds: SESSION_TTL_SECONDS,
  });
}
