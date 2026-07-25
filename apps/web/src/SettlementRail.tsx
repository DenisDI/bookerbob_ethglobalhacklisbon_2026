// The signature element: one shared timeline from today to checkout, with the
// stretch where the guest's money is tied up drawn on it.
//
// This is the product in a single glyph. Same room, same price, and the only
// thing that differs between the two agents is how much of this bar is filled.
// An unbacked agent pays everything before anyone holds a room, so its money is
// out for the whole span. A backed one settles at the end, so nothing is drawn
// until the last tick.

import { exposure, moneyMovesLabel } from "./terms-copy";
import type { Payment } from "./types";

interface Props {
  checkin: string;
  checkout: string;
  freeCancellationBefore: string | null;
  payment: Payment;
  accent: boolean;
}

function pct(from: number, to: number, at: number): number {
  if (to <= from) return 100;
  return Math.min(100, Math.max(0, ((at - from) / (to - from)) * 100));
}

export function SettlementRail({
  checkin,
  checkout,
  freeCancellationBefore,
  payment,
  accent,
}: Props) {
  const now = Date.now();
  const end = new Date(`${checkout}T12:00:00`).getTime();
  const held = exposure(payment);

  const ticks = [
    freeCancellationBefore
      ? { at: pct(now, end, new Date(freeCancellationBefore).getTime()), label: "free cancel" }
      : null,
    { at: pct(now, end, new Date(`${checkin}T12:00:00`).getTime()), label: "check in" },
  ].filter((t): t is { at: number; label: string } => t !== null);

  return (
    <div className={`rail ${accent ? "rail--accent" : ""}`}>
      <div className="rail__track">
        {held > 0 ? (
          <div
            className="rail__held"
            style={{ height: `${Math.round(held * 100)}%` }}
            aria-hidden="true"
          />
        ) : (
          <div className="rail__settle" aria-hidden="true" />
        )}

        {ticks.map((tick) => (
          <span
            key={tick.label}
            className="rail__tick"
            style={{ left: `${tick.at}%` }}
            title={tick.label}
            aria-hidden="true"
          />
        ))}
      </div>

      <div className="rail__marks" aria-hidden="true">
        {ticks.map((tick) => (
          <span
            key={tick.label}
            className="rail__mark"
            style={{ left: `${Math.min(88, Math.max(12, tick.at))}%` }}
          >
            {tick.label}
          </span>
        ))}
      </div>

      <div className="rail__scale">
        <span>today</span>
        <span>checkout</span>
      </div>

      <p className="rail__caption">{moneyMovesLabel(payment)}</p>
    </div>
  );
}
