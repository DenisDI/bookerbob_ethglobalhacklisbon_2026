// What this agent paid just to be allowed to ask.
//
// Bot lane: gateway x402 ledger (Hedera testnet HBAR) via /x402/paid-offers.
// Display stays $0.01 units (one query = 0.01 HBAR). The HashScan link is the
// proof — without a settle receipt we do not claim "AND COUNTING".
// Backed lane: $0.

interface Props {
  usd: number;
  counting: boolean;
  /** Real Hedera testnet transfer on HashScan, when x402 settled. */
  paymentTxUrl?: string | null;
}

export function SpentCounter({ usd, counting, paymentTxUrl = null }: Props) {
  return (
    <div className="spent">
      <p className="spent__row">
        <span className="spent__label">spent:</span>
        <span className="spent__value">${usd.toFixed(2)}</span>
        <span className="spent__tail">
          {counting ? "AND COUNTING" : "NOTHING CHARGED"}
        </span>
      </p>
      {paymentTxUrl ? (
        <p className="spent__proof partner">
          <a href={paymentTxUrl} target="_blank" rel="noreferrer">
            last query paid on hedera · hashscan
          </a>
        </p>
      ) : null}
    </div>
  );
}
