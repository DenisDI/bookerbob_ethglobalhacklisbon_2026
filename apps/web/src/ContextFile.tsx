// The underwriting file, as the guest's agent sees it.
//
// Four axes, each a band and nothing finer. No balances, no counts, no dollar
// figures: a viewer learns that this wallet is old and broad, not what is in it.
// The one date shown is a year, which is coarse enough to say out loud.

import type { ContextBands, RepaymentSignal } from "./types";

const AXES: Array<{ key: keyof ContextBands["bands"]; label: string; asks: string }> = [
  { key: "tenure", label: "how long", asks: "time cannot be bought retroactively" },
  { key: "activity", label: "how much", asks: "a footprint that repeats" },
  { key: "breadth", label: "how broadly", asks: "one venue or thirty" },
  { key: "scale", label: "what size", asks: "banded, never printed" },
];

const STEPS = ["T0", "T1", "T2", "T3", "T4"] as const;

function filled(band: string): number {
  const at = STEPS.indexOf(band as (typeof STEPS)[number]);
  return at < 0 ? 0 : at;
}

const REPAYMENT_COPY: Record<RepaymentSignal, string> = {
  clean: "borrowed before and paid it back",
  borrowing_open: "still owes on something",
  liquidated: "has been caught short before",
  no_credit_history: "has never borrowed",
};

export function ContextFile({ context }: { context: ContextBands }) {
  return (
    <section className="file">
      <header className="file__head">
        <h3 className="file__name">{context.ens?.name ?? context.address}</h3>
        {context.since ? <span className="file__since">since {context.since}</span> : null}
      </header>

      <dl className="file__axes">
        {AXES.map((axis) => {
          const band = context.bands[axis.key];
          const unavailable = band === "unavailable";
          return (
            <div key={axis.key} className="axis" title={axis.asks}>
              <dt className="axis__label">{axis.label}</dt>
              <dd className="axis__value">
                <span className="axis__meter" aria-hidden="true">
                  {[1, 2, 3, 4].map((step) => (
                    <i
                      key={step}
                      className={
                        !unavailable && step <= filled(band) ? "on" : undefined
                      }
                    />
                  ))}
                </span>
                <span className="axis__band">{unavailable ? "no read" : band}</span>
              </dd>
            </div>
          );
        })}
      </dl>

      <p className="file__repayment">{REPAYMENT_COPY[context.signals.repayment]}</p>

      {context.activeCategories.length > 0 ? (
        <p className="file__where">active in {context.activeCategories.join(", ")}</p>
      ) : null}
    </section>
  );
}
