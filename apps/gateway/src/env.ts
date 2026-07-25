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

  /**
   * The agent's own signing key, read by GET /agent/offers and by nothing else.
   *
   * Everything else here says a server has no business holding this, and that
   * stays true for verification: checking a credential needs no secret, and
   * keying the verifier off this key's presence was a real bug we fixed. The
   * race lane is the one deliberate exception, because an agent that lives only
   * in a terminal cannot be shown to anybody watching the race. See
   * src/routes/agentOffers.ts.
   */
  agentPrivateKey: str("LISBON2026_AGENT_PRIVATE_KEY"),

  /**
   * What the person is proving uniqueness for. One action, so one nullifier.
   * Matches the action registered in the Developer Portal: a name the Portal has
   * not seen is created on the fly, which works but leaves the settings for it
   * somewhere nobody is looking.
   */
  worldAction: str("LISBON2026_WORLD_ACTION", "selfie-verify"),

  /**
   * Which credentials are accepted, in the order they are offered.
   *
   * This is a list because a single value got the product wrong. Measured first:
   * the staging simulator refuses a selfie request with `credential_unavailable`,
   * since its simulated identity does not hold one. The fix at the time was to
   * ask staging for proof_of_human instead, and that was the mistake, because
   * proof_of_human is the ORB credential: a real World App pointed at us then
   * said "Humans Only, visit an Orb", which is a barrier almost nobody clears and
   * the exact opposite of what Selfie Check is for.
   *
   * So we ask for either, selfie first. A person with a World App does the low
   * barrier check, a person who already has the orb credential is not turned
   * away, and the browser simulator still has something it can answer. Whichever
   * one actually ran is named on screen and in the response. See
   * docs/FEEDBACK-selfie.md.
   */
  worldCredentials: (() => {
    const known = ["selfie", "proof_of_human", "passport", "mnc"];
    const asked = str("LISBON2026_WORLD_CREDENTIAL")
      .split(",")
      .map((v) => v.trim())
      .filter((v) => known.includes(v));
    // Selfie first, on purpose: it is the one anybody with a World App can do.
    // proof_of_human stays as an alternative so a person who already has the
    // orb credential, and the browser simulator, are not turned away.
    return asked.length > 0 ? asked : ["selfie", "proof_of_human"];
  })() as ReadonlyArray<"selfie" | "proof_of_human" | "passport" | "mnc">,

  /**
   * production, confirmed with the World team on site.
   *
   * They reproduced what we were seeing and named it their bug: a person whose
   * World ID is orb verified completes Selfie Check on the web, and a person
   * without the orb completes it in World App but not on the web. Our integration
   * is the same code in both cases, so there is nothing on this side to fix and
   * nothing to route around.
   *
   * The simulator stays offered in the step for anybody who hits that bug,
   * /world-id/context?env=staging, labelled as a simulator, because that is what
   * it is. See docs/FEEDBACK-world.md.
   */
  worldEnvironment: (() => {
    const v = str("LISBON2026_WORLD_ENVIRONMENT", "production");
    return v === "staging" || v === "sandbox" ? v : "production";
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
