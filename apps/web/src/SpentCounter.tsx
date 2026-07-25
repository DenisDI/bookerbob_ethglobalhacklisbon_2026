// What this agent paid just to be allowed to ask.
//
// Bot lane: gateway x402 ledger (Hedera testnet HBAR) via /x402/paid-offers.
// Display stays $0.01 units (one query = 0.01 HBAR). Backed lane: $0.
//
// The design asks for creeping third and fourth decimals, incrementing every
// 140ms, and adds "cap the creep so they never roll to $0.15 mid-shot". That is
// digits we do not have, tuned for the camera, so the big typography is kept and
// the number stays the real one. A zero on the backed lane is the win, not a
// disabled state, and it is never greyed out.

interface Props {
  usd: number;
  counting: boolean;
}

export function SpentCounter({ usd, counting }: Props) {
  return (
    <p className="spent">
      <span className="spent__label">spent:</span>
      <span className="spent__value">${usd.toFixed(2)}</span>
      <span className="spent__tail">
        {counting ? "AND COUNTING" : "NOTHING CHARGED"}
      </span>
    </p>
  );
}
