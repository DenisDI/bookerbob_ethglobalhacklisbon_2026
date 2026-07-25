// Env access in one place. Values live in .env (gitignored); .env.example
// documents every key. Nothing sensitive is defaulted in code.
// Project secrets: LISBON2026_* prefix.

import { fileURLToPath } from "node:url";

// Loaded here rather than via a CLI flag so scripts, tests, and the server all
// see the same file regardless of cwd. Shell-provided vars keep precedence.
try {
  process.loadEnvFile(fileURLToPath(new URL("../../../.env", import.meta.url)));
} catch {
  // No .env is fine: fixtures-only runs need no credentials.
}

function str(name: string, fallback = ""): string {
  return process.env[name]?.trim() || fallback;
}

function int(name: string, fallback: number): number {
  const raw = process.env[name];
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

export const env = {
  gatewayPort: int("GATEWAY_PORT", 3000),

  /** Exact path matters: bare paths 301/405 and MCP clients do not replay POST. */
  bookerUrl: str(
    "LISBON2026_BOOKER_MCP_URL",
    "https://flexrep.xyz/mcp_travel/mcp",
  ),
  bookerToken: str("LISBON2026_BOOKER_TOKEN"),

  /**
   * The booker server disables book_hotel while we test so runs cannot leave
   * real reservations behind. Flip only when the service enables it AND real
   * bookings are intended.
   */
  bookingEnabled: str("LISBON2026_BOOKER_BOOKING_ENABLED") === "true",

  /** Overridable so tests can point at a fixture file of their own. */
  fixturesPath: str("LISBON2026_FIXTURES_PATH"),

  /**
   * Real World verification needs a registered agent wallet. Without the key the
   * gateway runs the stand-in verifier, which can never claim World.
   */
  agentKeyPresent: str("LISBON2026_AGENT_PRIVATE_KEY").length > 0,

  /**
   * auto   live first, captured snapshot on failure (default)
   * live   live only, surface the failure
   * cached snapshot only — for rehearsals and the safety take, no live calls
   */
  inventorySource: (() => {
    const v = str("LISBON2026_INVENTORY_SOURCE", "auto");
    return v === "live" || v === "cached" ? v : "auto";
  })() as "auto" | "live" | "cached",
};

export const hasBookerCredentials = () => env.bookerToken.length > 0;
