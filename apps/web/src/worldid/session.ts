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

export function setWorldIdToken(next: string | null): void {
  token = next;
}

export function worldIdToken(): string | null {
  return token;
}
