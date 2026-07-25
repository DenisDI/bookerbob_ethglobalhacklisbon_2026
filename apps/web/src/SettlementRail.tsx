// The signature glyph: one shared timeline from today to checkout, drawn the same
// way in both lanes. The hatched stretch is where the guest's money is
// encumbered.
//
// Hatching, not a solid fill, on purpose. A solid bar reads as a progress meter,
// "more is better". Diagonal hatching reads as an encumbrance, the struck-through
// column in a paper ledger, and needs no legend.
//
//   prepay          hatched edge to edge, full height
//   deposit         dashed and reversible until free cancel, hatched after at 30%
//   pay later       an empty axis and one solid mark at the far right
//
// Tick positions are computed from the real dates. The tokens carry the fixture's
// percentages only as a fallback, and are never hardcoded over a live date.

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

  const freeCancelAt = freeCancellationBefore
    ? pct(now, end, new Date(freeCancellationBefore).getTime())
    : null;
  const checkInAt = pct(now, end, new Date(`${checkin}T12:00:00`).getTime());

  const held = exposure(payment);
  const deposit = held > 0 && held < 1;

  // The deposit band starts at the free-cancel tick, so the CSS reads the real
  // percentage from here rather than the token default.
  const style = freeCancelAt !== null
    ? ({ "--rail-tick-free-cancel": `${freeCancelAt}%` } as React.CSSProperties)
    : undefined;

  return (
    <div className={`rail ${accent ? "rail--accent" : ""}`} style={style}>
      <div className="rail__track">
        {held === 1 ? <div className="rail__held" aria-hidden="true" /> : null}

        {deposit ? (
          <>
            {freeCancelAt !== null ? (
              <div className="rail__reversible" aria-hidden="true" />
            ) : null}
            <div className="rail__held rail__held--deposit" aria-hidden="true" />
          </>
        ) : null}

        {held === 0 ? <div className="rail__settle" aria-hidden="true" /> : null}

        {freeCancelAt !== null ? (
          <span
            className="rail__tick"
            style={{ left: `${freeCancelAt}%` }}
            aria-hidden="true"
          />
        ) : null}
        <span
          className="rail__tick"
          style={{ left: `${checkInAt}%` }}
          aria-hidden="true"
        />
      </div>

      <div className="rail__scale" aria-hidden="true">
        <span style={{ left: 0 }}>TODAY</span>
        {freeCancelAt !== null ? (
          <span style={{ left: `${freeCancelAt}%`, transform: "translateX(-50%)" }}>
            FREE CANCEL
          </span>
        ) : null}
        {/* The tick always sits on the true date; its label is dropped when it
          * would collide with CHECKOUT, because two overlapping words read as a
          * rendering bug and the tick alone still carries the position. */}
        {checkInAt <= 78 ? (
          <span style={{ left: `${checkInAt}%`, transform: "translateX(-50%)" }}>
            CHECK IN
          </span>
        ) : null}
        <span style={{ right: 0 }}>CHECKOUT</span>
      </div>

      <p className="reason">{moneyMovesLabel(payment)}</p>
    </div>
  );
}

/** Idle and working twins: the same axis with nothing claimed on it yet. */
export function EmptyRail({ caption }: { caption: string }) {
  return (
    <div className="rail rail--empty">
      <div className="rail__track" />
      <div className="rail__scale" aria-hidden="true">
        <span style={{ left: 0 }}>TODAY</span>
        <span style={{ right: 0 }}>CHECKOUT</span>
      </div>
      <p className="reason">{caption}</p>
    </div>
  );
}
