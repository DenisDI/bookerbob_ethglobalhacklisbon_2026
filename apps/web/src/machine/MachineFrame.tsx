// The primitives the machine view is built from: one frame of the exchange, and
// the typed rows inside it.
//
// Mono everywhere, because in this view every single thing on screen is a machine
// fact. That is not a style choice carried over from the human view, it is the
// same rule applied to a screen where the rule covers everything.
//
// Colour still means accountability. A frame on the path where a real person is
// answerable takes the accent; the metered path stays in greys. So the fork in the
// handshake is visible before a field is read, exactly as it is between the two
// lanes of the race.

import type { ReactNode } from "react";
import { HederaMark, TheGraphMark, WorldMark } from "../PartnerMarks";
import type { Direction, Field, PartnerKey, Provenance } from "./wire";

/**
 * x402 has no logo in the handoff package, and inventing one would be worse than
 * not drawing one. Its name in mono IS its mark at this size, and on a screen that
 * is entirely mono the protocol's own token reads as native rather than as a
 * missing image.
 */
export function X402Mark() {
  return <span className="mark-x402">x402</span>;
}

const MARKS: Record<PartnerKey, ReactNode> = {
  x402: <X402Mark />,
  world: <WorldMark size={13} />,
  graph: <TheGraphMark size={12} />,
  hedera: <HederaMark size={13} />,
};

const ARROW: Record<Direction, string> = { out: "→", in: "←" };

interface FrameProps {
  /** Position in the handshake, so the order is readable out of context. */
  step: string;
  direction: Direction;
  title: string;
  /** HTTP status, when this frame is a response. */
  status?: string;
  provenance: Provenance;
  /** True on the path where a real person stands behind the request. */
  accountable?: boolean;
  /** The partner whose protocol moment this frame is. */
  partner?: PartnerKey;
  children: ReactNode;
}

export function Frame({
  step,
  direction,
  title,
  status,
  provenance,
  accountable = false,
  partner,
  children,
}: FrameProps) {
  return (
    <li className={`frame ${accountable ? "frame--accountable" : ""}`}>
      {/* The gutter carries the thread: numbered nodes on one vertical line, so
        * five frames read as one conversation rather than five panels. */}
      <div className="frame__gutter" aria-hidden="true">
        <span className="frame__no">{step}</span>
      </div>

      <div className="frame__box">
        <header className="frame__head">
          <span className="frame__dir" aria-hidden="true">
            {ARROW[direction]}
          </span>
          <h3 className="frame__title">{title}</h3>
          {status ? (
            // 402 is a branch in this product and is drawn like one. Only a 5xx is
            // a failure, and only a failure takes the system mark.
            <span
              className={`frame__status ${
                status.startsWith("5") ? "frame__status--error" : ""
              }`}
            >
              {status}
            </span>
          ) : null}
          {partner ? (
            <span className="frame__partner partner">{MARKS[partner]}</span>
          ) : null}
          <span className="pane__spacer" />
          <span className="frame__actor">
            {direction === "out" ? "agent → gateway" : "gateway → agent"}
          </span>
          <span className={`frame__prov frame__prov--${provenance}`}>
            {provenance}
          </span>
        </header>
        <div className="frame__body">{children}</div>
      </div>
    </li>
  );
}

/** The literal line on the wire, when there is one worth printing verbatim. */
export function Wire({ children }: { children: ReactNode }) {
  return <p className="wire">{children}</p>;
}

/**
 * Typed rows. The third column is the field's domain, not a description: what a
 * machine is allowed to expect in that slot. It is the part that makes this a
 * schema a reader can trust rather than a sample they have to generalise from.
 */
export function Fields({
  rows,
  caption,
}: {
  rows: Field[];
  caption?: string;
}) {
  if (rows.length === 0) {
    return (
      <>
        {caption ? <p className="fields__cap">{caption}</p> : null}
        <p className="fields__none">none</p>
      </>
    );
  }

  return (
    <>
      {caption ? <p className="fields__cap">{caption}</p> : null}
      <dl className="fields">
        {rows.map((row) => (
          <div key={row.k} className="fld">
            <dt className="fld__k">{row.k}</dt>
            <dd
              className={`fld__v ${row.accent ? "fld__v--accent" : ""} ${
                row.withheld ? "fld__v--withheld" : ""
              }`}
            >
              {row.v}
            </dd>
            <dd className="fld__d">{row.d ? `# ${row.d}` : ""}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}

/** A titled block inside a frame, for a response with several typed sections. */
export function Section({
  title,
  partner,
  children,
}: {
  title: string;
  partner?: PartnerKey;
  children: ReactNode;
}) {
  return (
    <section className="msection">
      <header className="msection__head">
        {partner ? (
          <span className="msection__mark partner">{MARKS[partner]}</span>
        ) : null}
        <h4 className="msection__title">{title}</h4>
      </header>
      {children}
    </section>
  );
}

/**
 * The fork. Two ways out of one challenge, drawn side by side because a machine
 * reading the 402 genuinely has both open to it, and the choice between them is
 * the product.
 */
export function Branch({
  options,
}: {
  options: Array<{
    key: string;
    label: string;
    note: string;
    partner: PartnerKey;
    accountable: boolean;
    rows: Field[];
  }>;
}) {
  return (
    <div className="branch">
      {options.map((option) => (
        <div
          key={option.key}
          className={`branch__opt ${
            option.accountable ? "branch__opt--accountable" : ""
          }`}
        >
          <header className="branch__head">
            <span className="partner">{MARKS[option.partner]}</span>
            <h4 className="branch__label">{option.label}</h4>
          </header>
          <p className="branch__note">{option.note}</p>
          <Fields rows={option.rows} />
        </div>
      ))}
    </div>
  );
}
