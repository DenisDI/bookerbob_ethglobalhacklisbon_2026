/**
 * The session a finished Selfie Check leaves behind, held in memory only.
 *
 * Not localStorage. A credential that outlives the tab would sit on a shared demo
 * laptop waiting for the next person to be mistaken for the one who verified, and
 * "somebody proved they were a person here once" is not the claim this makes.
 *
 * The token itself is opaque: it is an HMAC the gateway minted over a nullifier
 * it kept. The browser cannot read who it names, which is the point.
 */

let token: string | null = null;
let expiresAt = 0;

export function setWorldIdToken(next: string | null, expiresInSeconds = 0): void {
  token = next;
  expiresAt = next ? Date.now() + expiresInSeconds * 1000 : 0;
}

/**
 * Expiry is enforced here as well as on the server, so the two cannot disagree.
 *
 * The gateway stops believing a session after half an hour and answers `missing`.
 * A screen that kept saying "personhood proved" past that point would be
 * describing something that is no longer true, which is the one thing this
 * product does not do.
 */
export function worldIdToken(now = Date.now()): string | null {
  if (token && now >= expiresAt) setWorldIdToken(null);
  return token;
}

export function worldIdExpiresAt(): number {
  return expiresAt;
}
