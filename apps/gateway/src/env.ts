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
   * "stand_in" runs the dev verifier, which can never claim World. Anything else,
   * including empty, runs real verification.
   *
   * Deliberately opt-out rather than opt-in. The first version keyed this off the
   * presence of LISBON2026_AGENT_PRIVATE_KEY, which is the AGENT's signing key: it
   * lives on the machine that makes requests and has no business on the server.
   * In production it was absent, so the gateway silently ran the stand-in and
   * refused every real credential. Verification itself needs no secret at all, so
   * the default is now the real thing and the stand-in has to be asked for.
   */
  credentialMode: str("LISBON2026_CREDENTIAL_MODE"),

  /**
   * World Chain RPC for the AgentBook lookup. Empty means viem's chain default,
   * which is a shared public endpoint: fine from a laptop, not something to rely
   * on from a datacentre IP. See src/world-chain.ts.
   */
  worldRpcUrl: str("LISBON2026_WORLD_RPC_URL"),

  /**
   * World ID Selfie Check. The app id and rp id are public, the signing key is
   * not: it signs the request context the browser carries, and World's own docs
   * put "never sign on the client" in bold. See src/world-id.ts.
   */
  worldAppId: str("LISBON2026_WORLD_APP_ID"),
  worldRpId: str("LISBON2026_WORLD_RP_ID"),
  worldSigningKey: str("LISBON2026_WORLD_SIGNING_KEY"),

  /** What the person is proving uniqueness for. One action, so one nullifier. */
  worldAction: str("LISBON2026_WORLD_ACTION", "bookerbob-terms"),

  /**
   * Which credential is asked for.
   *
   * Measured on 2026-07-25: the staging simulator refuses a selfie request with
   * `credential_unavailable`, because its simulated identity does not hold that
   * credential, and answers proof_of_human happily. So the default follows the
   * environment rather than the wish, and whichever one runs is named on screen
   * and in the response. Selfie Check needs sandbox or a real device; see
   * docs/FEEDBACK-selfie.md.
   */
  worldCredential: (() => {
    const environment = str("LISBON2026_WORLD_ENVIRONMENT", "staging");
    const fallback = environment === "staging" ? "proof_of_human" : "selfie";
    const v = str("LISBON2026_WORLD_CREDENTIAL", fallback);
    return v === "proof_of_human" || v === "passport" || v === "mnc" || v === "selfie"
      ? v
      : fallback;
  })() as "selfie" | "proof_of_human" | "passport" | "mnc",

  /**
   * staging drives the browser simulator, which is Phase A: a check that needs no
   * phone. Anything unrecognised falls back to staging rather than quietly
   * pointing a rehearsal at production.
   */
  worldEnvironment: (() => {
    const v = str("LISBON2026_WORLD_ENVIRONMENT", "staging");
    return v === "production" || v === "sandbox" ? v : "staging";
  })() as "production" | "staging" | "sandbox",

  /** Overridable so a test can point at a server it controls. */
  worldPortalUrl: str("LISBON2026_WORLD_PORTAL_URL", "https://developer.world.org"),

  /**
   * The origin callers actually reach, e.g. https://lisbonhack.world. Set it in
   * production: an AgentKit credential is bound to the resource it was issued
   * for, and behind a TLS-terminating proxy the server cannot work that out from
   * the socket. See src/public-url.ts.
   */
  publicUrl: str("LISBON2026_PUBLIC_URL"),

  /**
   * auto   live first, captured snapshot on failure (default)
   * live   live only, surface the failure
   * cached snapshot only — for rehearsals and the safety take, no live calls
   */
  inventorySource: (() => {
    const v = str("LISBON2026_INVENTORY_SOURCE", "auto");
    return v === "live" || v === "cached" ? v : "auto";
  })() as "auto" | "live" | "cached",

  /**
   * Privy server verify for "this is my wallet". App ID + secret required to
   * look up linked wallets after JWT check. JWKS URL defaults from app ID;
   * optional PEM verification key skips the JWKS fetch.
   */
  privyAppId: str("LISBON2026_PRIVY_APP_ID"),
  privyAppSecret: str("LISBON2026_PRIVY_APP_SECRET"),
  privyJwksUrl: str("LISBON2026_PRIVY_JWKS_URL"),
  privyJwtVerificationKey: str("LISBON2026_PRIVY_JWT_VERIFICATION_KEY"),
};

export const hasBookerCredentials = () => env.bookerToken.length > 0;
