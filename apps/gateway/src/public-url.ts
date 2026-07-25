// The URL a caller actually reached, which is not the URL the socket saw.
//
// This exists because of a bug that only appeared in production. An AgentKit
// credential is bound to the resource it was issued for, so the server has to
// compare against the same string the agent signed. `c.req.url` cannot supply
// it: @hono/node-server derives the scheme from the socket,
//
//   scheme = incoming.socket && incoming.socket.encrypted ? "https" : "http"
//
// and ignores X-Forwarded-Proto entirely. Behind Fly the TLS terminates at the
// edge, so the socket is plain and the gateway sees http://lisbonhack.world
// while every agent signs https://lisbonhack.world. Measured: the same wallet
// that verified locally was refused in production, and the credential silently
// became "missing" and the tier "bot".
//
// Spoofing the forwarded headers buys nothing: it only changes which resource we
// expect a signature over, and the signature still has to come from a wallet the
// AgentBook knows. LISBON2026_PUBLIC_URL is honoured first anyway, so the
// deployed answer never depends on a header at all.

import type { Context } from "hono";
import { env } from "./env.js";

function fromForwardedHeaders(c: Context): string | null {
  // Host, in descending order of what the caller actually typed. The request URL
  // is last because a proxy that rewrites the host is exactly the case this
  // function exists for, but its host is still better than nothing.
  const host =
    c.req.header("x-forwarded-host") ??
    c.req.header("host") ??
    new URL(c.req.url).host;
  if (!host) return null;

  // Fly sends a single value; other proxies chain them, first hop wins.
  const proto = (c.req.header("x-forwarded-proto") ?? "")
    .split(",")[0]
    ?.trim()
    .toLowerCase();
  if (proto !== "http" && proto !== "https") return null;

  return `${proto}://${host}`;
}

/**
 * Origin as the caller sees it: configured value, then proxy headers, then the
 * socket.
 *
 * `configured` is a parameter rather than a direct env read so the precedence can
 * be tested without a .env on disk deciding the outcome.
 */
export function publicOrigin(c: Context, configured: string = env.publicUrl): string {
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      // A malformed configured value must not take the gateway down.
    }
  }
  return fromForwardedHeaders(c) ?? new URL(c.req.url).origin;
}

/** The resource a credential must have been issued for. */
export function publicResource(c: Context, configured?: string): string {
  return `${publicOrigin(c, configured ?? env.publicUrl)}${new URL(c.req.url).pathname}`;
}
