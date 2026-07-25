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

  return c.json(worldIdConfig());
}

export async function worldIdVerifyHandler(c: Context) {
  if (!worldIdReady()) {
    return c.json({ error: "world_id_unconfigured" }, 503);
  }

  const payload = await c.req.json().catch(() => null);
  if (!payload) {
    return c.json({ error: "proof_required" }, 400);
  }

  const result = await verifyWithPortal(payload);
  if (!result.ok) {
    // Logged in full, returned as one word. Same rule as a rejected credential:
    // which check failed is operator information.
    console.warn(`world id proof rejected: ${result.detail}`);
    return c.json({ error: "proof_rejected" }, 400);
  }

  // The nullifier stays on this side. What the browser gets back says only that
  // somebody proved personhood, and for how long that stays true.
  return c.json({
    token: mintSession(result.nullifier),
    expiresInSeconds: SESSION_TTL_SECONDS,
  });
}
