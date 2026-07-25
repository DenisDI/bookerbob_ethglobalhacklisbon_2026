// Privy access token → "this is my wallet" as a server fact.
//
// Product axes stay separate from World:
//   agentkit header  → who is behind the agent (personhood)
//   Authorization    → which wallet the caller proved they control (Privy)
//   ?address=        → what Graph should read (typed consent still works)
//
// Access tokens prove a Privy session (sub = DID). They do not carry wallet
// addresses, so after JWT verify we look the user up and bind ?address= to a
// linked wallet. Typing alone stays typed. Only a matching token makes it
// verified. Same honesty rule as world.ts: the browser cannot assert verified.

import {
  createRemoteJWKSet,
  importSPKI,
  jwtVerify,
  type JWTPayload,
} from "jose";

// jose v6 no longer exports KeyLike; SPKI import returns CryptoKey.
type SpkiKey = Awaited<ReturnType<typeof importSPKI>>;
import { env } from "./env.js";

export type WalletConsent =
  | { status: "missing" }
  | { status: "typed" }
  | { status: "verified"; address: string };

export const NO_WALLET: WalletConsent = { status: "missing" };

const HEX_ADDRESS = /^0x[a-f0-9]{40}$/;

export function normalizeHex(value: string): string {
  return value.trim().toLowerCase();
}

export function isHexAddress(value: string): boolean {
  return HEX_ADDRESS.test(normalizeHex(value));
}

/**
 * Pure bind: given a requested address and the wallets a verified session owns,
 * decide what the gateway may claim. Linked wallets null means no usable session
 * (absent token, bad token, or Privy not configured).
 */
export function bindWalletConsent(
  requestedAddress: string | undefined,
  linkedWallets: string[] | null,
): WalletConsent {
  const address = requestedAddress?.trim();
  if (!address) {
    // Session with no address still proves nothing about Graph context.
    if (linkedWallets && linkedWallets.length > 0) {
      return { status: "verified", address: linkedWallets[0]! };
    }
    return NO_WALLET;
  }

  if (linkedWallets && isHexAddress(address)) {
    const want = normalizeHex(address);
    const owned = linkedWallets.find((w) => normalizeHex(w) === want);
    if (owned) return { status: "verified", address: owned };
  }

  // Showcase ENS / someone else's 0x / token that does not match: still readable,
  // never "mine".
  return { status: "typed" };
}

export function publicWallet(consent: WalletConsent): {
  status: WalletConsent["status"];
  address?: string;
} {
  return consent.status === "verified"
    ? { status: "verified", address: consent.address }
    : { status: consent.status };
}

/** Address Graph should read: verified wallet when no query, else the query. */
export function contextAddress(
  requestedAddress: string | undefined,
  consent: WalletConsent,
): string | undefined {
  const typed = requestedAddress?.trim();
  if (typed) return typed;
  if (consent.status === "verified") return consent.address;
  return undefined;
}

export function privyConfigured(): boolean {
  return env.privyAppId.length > 0 && env.privyAppSecret.length > 0;
}

function jwksUrl(): string {
  if (env.privyJwksUrl) return env.privyJwksUrl;
  return `https://auth.privy.io/api/v1/apps/${env.privyAppId}/jwks.json`;
}

let remoteJwks: ReturnType<typeof createRemoteJWKSet> | null = null;
let cachedSpki: SpkiKey | null = null;

async function verificationKey(): Promise<
  SpkiKey | ReturnType<typeof createRemoteJWKSet>
> {
  if (env.privyJwtVerificationKey) {
    if (!cachedSpki) {
      // Dashboard "JWT verification key" is typically a PEM SPKI public key.
      cachedSpki = await importSPKI(env.privyJwtVerificationKey, "ES256");
    }
    return cachedSpki;
  }
  if (!remoteJwks) {
    remoteJwks = createRemoteJWKSet(new URL(jwksUrl()));
  }
  return remoteJwks;
}

export async function verifyAccessToken(
  accessToken: string,
): Promise<JWTPayload | null> {
  if (!privyConfigured()) return null;
  const opts = { issuer: "privy.io", audience: env.privyAppId };
  try {
    // Split branches so jose's two jwtVerify overloads stay distinct.
    const { payload } = env.privyJwtVerificationKey
      ? await jwtVerify(accessToken, await verificationKey() as SpkiKey, opts)
      : await jwtVerify(
          accessToken,
          await verificationKey() as ReturnType<typeof createRemoteJWKSet>,
          opts,
        );
    if (typeof payload.sub !== "string" || !payload.sub) return null;
    return payload;
  } catch (err) {
    console.warn(
      `privy access token rejected: ${(err as Error).message ?? "verify failed"}`,
    );
    return null;
  }
}

type PrivyLinkedAccount = {
  type?: string;
  address?: string;
};

type PrivyUserResponse = {
  id?: string;
  linked_accounts?: PrivyLinkedAccount[];
};

/** Extract hex wallets from a Privy user payload. Pure, so tests own the shape. */
export function walletsFromLinkedAccounts(
  accounts: PrivyLinkedAccount[] | undefined,
): string[] {
  const wallets: string[] = [];
  for (const account of accounts ?? []) {
    if (
      (account.type === "wallet" || account.type === "smart_wallet") &&
      typeof account.address === "string" &&
      isHexAddress(account.address)
    ) {
      wallets.push(account.address);
    }
  }
  return wallets;
}

/** Wallets linked to a Privy DID. Empty array = session ok, no wallet yet. */
export async function fetchLinkedWallets(userDid: string): Promise<string[] | null> {
  if (!privyConfigured()) return null;
  const basic = Buffer.from(
    `${env.privyAppId}:${env.privyAppSecret}`,
    "utf8",
  ).toString("base64");

  try {
    const res = await fetch(
      `https://auth.privy.io/api/v1/users/${encodeURIComponent(userDid)}`,
      {
        headers: {
          Authorization: `Basic ${basic}`,
          "privy-app-id": env.privyAppId,
        },
      },
    );
    if (!res.ok) {
      console.warn(`privy user lookup failed: ${res.status}`);
      return null;
    }
    const body = (await res.json()) as PrivyUserResponse;
    return walletsFromLinkedAccounts(body.linked_accounts);
  } catch (err) {
    console.warn(
      `privy user lookup error: ${(err as Error).message ?? "fetch failed"}`,
    );
    return null;
  }
}

export function parseBearerToken(authorization: string | undefined): string | null {
  if (!authorization) return null;
  const m = /^Bearer\s+(\S+)/i.exec(authorization.trim());
  return m?.[1] ?? null;
}

/**
 * How resolveWalletConsent talks to Privy. Production uses JWT + user API;
 * tests inject a fake so ownership rules stay offline.
 */
export type PrivySessionLookup = {
  configured: boolean;
  verify(accessToken: string): Promise<{ sub: string } | null>;
  wallets(userDid: string): Promise<string[] | null>;
};

const liveLookup: PrivySessionLookup = {
  get configured() {
    return privyConfigured();
  },
  async verify(accessToken) {
    const claims = await verifyAccessToken(accessToken);
    return typeof claims?.sub === "string" ? { sub: claims.sub } : null;
  },
  wallets: fetchLinkedWallets,
};

/**
 * Resolve wallet consent for a request. Never throws: a broken Privy path
 * falls back to typed/missing the same way a rejected AgentKit header does.
 */
export async function resolveWalletConsent(
  authorization: string | undefined,
  requestedAddress: string | undefined,
  lookup: PrivySessionLookup = liveLookup,
): Promise<WalletConsent> {
  const token = parseBearerToken(authorization);
  let linked: string[] | null = null;

  if (token && lookup.configured) {
    const claims = await lookup.verify(token);
    if (claims?.sub) {
      linked = await lookup.wallets(claims.sub);
    }
  } else if (token && !lookup.configured) {
    console.warn(
      "privy Authorization present but LISBON2026_PRIVY_APP_ID/SECRET unset; treating as typed",
    );
  }

  return bindWalletConsent(requestedAddress, linked);
}
