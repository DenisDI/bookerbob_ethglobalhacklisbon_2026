// The underwriter's file, as the guest's agent sees it.
//
// Four independent axes, each a separate question about risk, and they are
// allowed to contradict each other: the busiest wallet does not get the best
// terms. Each axis is a segmented meter of four cells, never a bar, never a
// number, never a percentage. No balances, no counts, no dollar figures. The one
// date shown is a year, which is coarse enough to say out loud.
//
// Stale data is worse than absent, so an unreadable axis reads "no read" with an
// empty meter and never zeros dressed up as a reading.

import { TheGraphMark } from "./PartnerMarks";
import type { Band, ContextBands, RepaymentSignal } from "./types";

const AXES: Array<{
  key: keyof ContextBands["bands"];
  label: string;
  asks: string;
}> = [
  { key: "tenure", label: "HOW LONG", asks: "time cannot be bought retroactively" },
  { key: "activity", label: "HOW MUCH", asks: "a footprint that repeats" },
  { key: "breadth", label: "HOW BROADLY", asks: "one venue or thirty" },
  { key: "scale", label: "WHAT SIZE", asks: "banded, never printed" },
];

const STEPS = ["T0", "T1", "T2", "T3", "T4"] as const;

function filled(band: Band): number {
  const at = STEPS.indexOf(band as (typeof STEPS)[number]);
  return at < 0 ? 0 : at;
}

/** Plain words per axis, so a viewer never has to know what T3 means. */
function note(key: string, band: Band, since: number | null): string {
  if (band === "unavailable") return "no read";
  if (band === "T0") return key === "tenure" ? "first seen today" : "nothing yet";

  switch (key) {
    case "tenure":
      return since ? `since ${since}` : "recent";
    case "activity":
      return band === "T4" ? "heavy" : band === "T3" ? "steady" : "some";
    case "breadth":
      return band === "T4" ? "everywhere" : band === "T3" ? "many places" : "a few";
    default:
      return band === "T4" ? "large" : band === "T3" ? "mid" : "small";
  }
}

const REPAYMENT_COPY: Record<RepaymentSignal, string> = {
  clean: "borrowed before and paid it back",
  borrowing_open: "still owes on something",
  liquidated: "has been caught short before",
  no_credit_history: "has never borrowed",
};

function shortHex(address: string | null): string {
  if (!address) return "this wallet";
  return address.length > 12
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : address;
}

export function ContextFile({ context }: { context: ContextBands }) {
  const unreadable = Object.values(context.bands).every((b) => b === "unavailable");

  return (
    <section className="ctx">
      <header className="ctx__head">
        <span className="partner">
          <TheGraphMark />
          <span className="label">the graph</span>
        </span>
        <h3 className="ctx__name mono">
          {context.ens?.name ?? shortHex(context.address)}
        </h3>
        {context.since ? (
          <span className="ctx__since label">since {context.since}</span>
        ) : null}
      </header>

      <dl className="ctx__axes">
        {AXES.map((axis) => {
          const band = context.bands[axis.key];
          const cells = band === "unavailable" ? 0 : filled(band);
          return (
            <div key={axis.key} className="axis" title={axis.asks}>
              <div className="axis__head">
                <dt className="label">{axis.label}</dt>
                <dd
                  className={`axis__note ${band === "unavailable" ? "axis__note--noread" : ""}`}
                >
                  {note(axis.key, band, context.since)}
                </dd>
              </div>
              <div className="axis__meter" aria-hidden="true">
                {[1, 2, 3, 4].map((step) => (
                  <i key={step} className={step <= cells ? "on" : undefined} />
                ))}
              </div>
            </div>
          );
        })}
      </dl>

      <p className="ctx__repayment speech">
        {unreadable
          ? "no tier claimed: context signal unavailable"
          : REPAYMENT_COPY[context.signals.repayment]}
      </p>

      {context.activeCategories.length > 0 ? (
        <p className="ctx__where reason">
          active in {context.activeCategories.join(", ")}
        </p>
      ) : null}
    </section>
  );
}
