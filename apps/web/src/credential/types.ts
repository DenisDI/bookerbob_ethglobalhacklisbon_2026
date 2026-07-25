/**
 * World AgentKit / Selfie will own `verified`. Until then the race uses
 * `stand_in` — temporary glue, not a prize-complete proof of humanity.
 * Privy is a separate axis (consented wallet for Graph), not this credential.
 */
export type CredentialState =
  | { status: "missing" }
  | { status: "stand_in" }
  | { status: "verified"; source: "world" };

export function hasCredential(state: CredentialState): boolean {
  return state.status !== "missing";
}

export function credentialLabel(state: CredentialState): string {
  switch (state.status) {
    case "missing":
      return "no credential";
    case "stand_in":
      return "stand-in (not World yet)";
    case "verified":
      return `verified (${state.source})`;
  }
}
