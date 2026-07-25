// What this agent has paid just to be allowed to ask.
//
// The number is derived from the number of metered queries, one cent each,
// because the x402 paywall is not wired yet. When it lands this reads the
// gateway's own tally instead of counting locally.

interface Props {
  usd: number;
  counting: boolean;
}

export function SpentCounter({ usd, counting }: Props) {
  return (
    <p className="spent">
      <span className="spent__label">spent</span>
      <span className="spent__value">${usd.toFixed(2)}</span>
      {counting ? <span className="spent__tail">and counting</span> : null}
    </p>
  );
}
