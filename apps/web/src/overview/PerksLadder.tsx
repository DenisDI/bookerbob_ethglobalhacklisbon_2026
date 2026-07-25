// What you get, and what it costs you, in that order.
//
// The overview used to open with "nothing below is required and the order does
// not matter", which is true and useless: it describes the mechanism instead of
// offering anything, and it hid the only thing a reader wants, which is what the
// next step is worth. This is the page's main element and it is on screen before
// any answer comes back, so the destination is visible from a standing start.
//
// Reward first on every rung, action second. A locked rung still shows its reward
// in full, because a prize you cannot read is not a reason to do anything, and it
// carries one line saying what opens it.
//
// NOT A GATE. The engine takes these in any order and this component never
// pretends otherwise: rungs light from the terms the gateway actually returned,
// so connecting a wallet before proving personhood lights exactly what it earns
// and no more. It guides by saying what is worth the most next; it never blocks.

import type { ReactNode } from "react";
import { TheGraphMark, WorldMark } from "../PartnerMarks";
import type { Payment } from "../types";

/**
 * here    you are standing on it
 * reached passed, and kept
 * locked  real, readable, and one named step away
 * blocked the step is done and the history behind it does not reach this rung
 */
type RungState = "here" | "reached" | "locked" | "blocked";

interface Rung {
  key: string;
  /** The reward, and always the first thing read. */
  perk: string;
  /** What it costs, second. */
  ask: string;
  /** Shown only when the rung is not yet yours. */
  opens: string | null;
  mark: ReactNode | null;
  state: RungState;
}

/** How high the gateway's answer already puts you. */
function level(payment: Payment | null): number {
  if (payment === "deposit") return 1;
  if (payment === "rate_lock_pay_later" || payment === "pay_at_checkout") return 2;
  return 0;
}

export interface LadderInput {
  payment: Payment | null;
  personhood: boolean;
  wallet: boolean;
  /** Bands came back, so the history has actually been read. */
  contextRead: boolean;
}

export function rungs({
  payment,
  personhood,
  wallet,
  contextRead,
}: LadderInput): Rung[] {
  const at = level(payment);

  // The top rung is the only one that can be earned and still refused: both
  // proofs can be in and the record behind them simply not reach it. Saying
  // "connect a wallet" to someone whose wallet is already connected and read is
  // the one way this component could lie.
  const topOpens =
    personhood && wallet && contextRead
      ? null
      : !personhood && !wallet
        ? "prove a person and connect a wallet to open this"
        : personhood
          ? "connect a wallet to open this"
          : "prove a person to open this: your history is already read";

  return [
    {
      key: "prepay",
      perk: "pay the whole stay up front",
      ask: "nothing to prove, and nothing held back",
      opens: null,
      mark: null,
      state: at === 0 ? "here" : "reached",
    },
    {
      key: "deposit",
      perk: "leave a deposit, and keep the rest",
      ask: "prove a person is behind the booking",
      opens: at >= 1 ? null : "prove a person to open this",
      mark: <WorldMark size={13} />,
      state: at === 1 ? "here" : at > 1 ? "reached" : "locked",
    },
    {
      key: "hold",
      perk: "hold the price now, and let the money wait",
      ask: "let your history be read as bands",
      opens: at >= 2 ? null : topOpens,
      mark: <TheGraphMark size={12} />,
      state:
        at === 2
          ? "here"
          : personhood && wallet && contextRead
            ? "blocked"
            : "locked",
    },
  ];
}

interface Props extends LadderInput {
  /** The gateway's own words, shown only where a rung is out of reach. */
  reason: string | null;
}

export function PerksLadder(props: Props) {
  const steps = rungs(props);

  return (
    <section className="ladder" aria-label="what you get">
      <ol className="ladder__rows">
        {steps.map((rung) => (
          <li key={rung.key} className={`rung rung--${rung.state}`}>
            <p className="rung__perk">{rung.perk}</p>
            <p className="rung__ask">
              {rung.mark ? (
                <span className="rung__mark partner">{rung.mark}</span>
              ) : null}
              {rung.ask}
            </p>

            {rung.state === "here" ? (
              <p className="rung__flag label">you are here</p>
            ) : null}

            {rung.state === "locked" && rung.opens ? (
              <p className="rung__opens">{rung.opens}</p>
            ) : null}

            {/* Earned the steps and the record still does not reach it. The
              * gateway's sentence, not ours, because this is the one place the
              * page could quietly promise something it cannot deliver. */}
            {rung.state === "blocked" ? (
              <p className="rung__opens">{props.reason ?? "not from this history"}</p>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
