// What is taking part in this request, and where each partner does its work.
//
// This replaces a temporary wire-debug strip that printed enum values, band codes
// and "temp wire view · design will replace" on the front of the page. Same data
// and the same honesty, read as three sentences instead: who is behind the agent,
// what context they carry, how the money settles. That is also the order the
// journey happens in.
//
// The partner mark sits at its own step and nowhere else, small enough that the
// step reads first and the logo second. Never a banner across the top.
//
// Colour rule holds. This strip describes the backed request, the one somebody is
// answerable for, so the accent is allowed once a step has actually done its work.
// A step still waiting is drawn in greys.

import type { ReactNode } from "react";
import { shortAddress } from "./auth";
import type { CredentialState } from "./credential";
import { HederaMark, TheGraphMark, WorldMark } from "./PartnerMarks";
import type { PaneState } from "./RacePane";
import { earnsSchedule } from "./terms-copy";

type WalletSnap = {
  ready: boolean;
  authenticated: boolean;
  address: string | null;
};

interface Props {
  wallet: WalletSnap;
  credential: CredentialState;
  addressField: string;
  backed: PaneState;
}

/**
 * waiting: not yet. working: in flight, so it may pulse. standin: present but
 * provisional, which is neither. done: it did its work. aside: not needed here.
 */
type Standing = "waiting" | "working" | "standin" | "done" | "aside";

interface Part {
  key: string;
  mark: ReactNode;
  partner: string;
  /** The question this step answers, in the guest's words. */
  role: string;
  line: string;
  state: Standing;
  href?: string | null;
  linkLabel?: string;
}

/**
 * Who is behind the agent.
 *
 * `verified` is only ever the gateway's word: it saw a signed header and the
 * AgentBook answer, and the browser cannot assert it. So a stand-in says it is a
 * stand-in rather than borrowing the credit.
 */
function whoStep(credential: CredentialState): Part {
  const base = {
    key: "world",
    mark: <WorldMark size={14} />,
    partner: "world",
    role: "who is behind the agent",
  };

  switch (credential.status) {
    case "verified":
      return { ...base, line: "a real person is behind this request", state: "done" };
    case "stand_in":
      // Present and it does move the terms, but it is not a proven person, so it
      // gets neither the settled colour nor the in-flight pulse.
      return {
        ...base,
        line: "a stand-in for now, so nothing here claims a real person",
        state: "standin",
      };
    case "missing":
      return {
        ...base,
        line: "nobody is standing behind this request",
        state: "waiting",
      };
  }
}

/** What context they carry. Bands, never a number, so this never prints one. */
function contextStep(props: Props): Part {
  const { wallet, addressField, backed } = props;
  const base = {
    key: "graph",
    mark: <TheGraphMark size={13} />,
    partner: "the graph",
    role: "what context they carry",
  };

  const who = addressField.trim() || wallet.address || "";
  const named = who.includes(".") ? who : who ? shortAddress(who) : "";

  if (backed.status === "working") {
    return {
      ...base,
      line: named ? `reading what ${named} has done` : "nothing to read this time",
      state: named ? "working" : "aside",
    };
  }

  if (backed.data?.context) {
    const since = backed.data.context.since;
    return {
      ...base,
      line: since
        ? `read ${named || "this wallet"}, active since ${since}`
        : `read ${named || "this wallet"} as bands`,
      state: "done",
    };
  }

  if (backed.status === "failed") {
    return { ...base, line: "could not reach the reader", state: "waiting" };
  }

  if (backed.data) {
    return {
      ...base,
      line: "no history to read, so the person alone sets the terms",
      state: "aside",
    };
  }

  return {
    ...base,
    line: named ? `ready to read ${named}` : "waiting for a wallet to read",
    state: "waiting",
  };
}

/** How the money settles. The scheduled payment and its link are the point. */
function settleStep(backed: PaneState): Part {
  const base = {
    key: "hedera",
    // A notch larger than the others: this mark is a filled disc with a cut-out
    // letter, so it needs the extra pixel to stop reading as a plain dot.
    mark: <HederaMark size={14} />,
    partner: "hedera",
    role: "how the money settles",
  };

  if (backed.status === "working") {
    return { ...base, line: "waiting on the terms", state: "working" };
  }

  const data = backed.data;

  if (data?.scheduleUrl) {
    return {
      ...base,
      line: "the payment is scheduled for checkout day",
      state: "done",
      href: data.scheduleUrl,
      linkLabel: "see the schedule",
    };
  }

  // The terms earned a deferred payment but no schedule came back. Honest gap,
  // not a spinner: the run is over, so nothing here may look still in flight.
  if (data && earnsSchedule(data.terms.payment)) {
    return {
      ...base,
      line: "these terms let the money wait, no schedule came back",
      state: "waiting",
    };
  }

  if (data) {
    return {
      ...base,
      line: "nothing to schedule: this stay is paid before it starts",
      state: "aside",
    };
  }

  return {
    ...base,
    line: "settles here once the terms let the money wait",
    state: "waiting",
  };
}

export function ParticipantsBand(props: Props) {
  const parts = [whoStep(props.credential), contextStep(props), settleStep(props.backed)];

  return (
    <aside className="taking-part" aria-label="what is taking part">
      <p className="taking-part__cap label">what is taking part</p>
      <ol className="taking-part__row">
        {parts.map((part) => (
          <li key={part.key} className={`part part--${part.state}`}>
            <p className="part__who">
              <span className="partner">
                {part.mark}
                <span className="part__name">{part.partner}</span>
              </span>
              <span className="part__role">{part.role}</span>
            </p>
            <p className="part__line speech">{part.line}</p>
            {part.href ? (
              <a
                className="part__link"
                href={part.href}
                target="_blank"
                rel="noreferrer"
              >
                {part.linkLabel} ↗
              </a>
            ) : null}
          </li>
        ))}
      </ol>
    </aside>
  );
}

/** Safe when Privy is not configured: no hook call on this path. */
export function ParticipantsBandGuest(props: Omit<Props, "wallet">) {
  return (
    <ParticipantsBand
      {...props}
      wallet={{ ready: true, authenticated: false, address: null }}
    />
  );
}
