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
// carries one line saying what opens it. Open a rung and it explains who does the
// work and how, which is where each partner gets a proper look at its own moment
// rather than a logo in a footer.
//
// FOUR RUNGS, because the terms engine really has four answers, and each of the
// three that are not the floor is somebody's technology doing something specific:
// World establishes a person, The Graph reads what that person has done, and
// Hedera is what lets the money actually wait.
//
// NOT A GATE. The engine takes these in any order and this component never
// pretends otherwise: rungs light from the terms the gateway actually returned,
// so connecting a wallet before proving personhood lights exactly what it earns
// and no more. It guides by saying what is worth the most next; it never blocks.

import { useEffect, useRef, useState, type ReactNode } from "react";
import { HederaMark, TheGraphMark, WorldMark } from "../PartnerMarks";
import type { Payment } from "../types";

/**
 * here    you are standing on it
 * reached passed, and kept
 * locked  real, readable, and a named step away
 * blocked the steps are done and the record behind them does not reach this rung
 */
type RungState = "here" | "reached" | "locked" | "blocked";

/** Big enough to read as the partner's mark, small enough not to be a banner. */
const MARK = 30;

interface Rung {
  key: string;
  /** The reward, and always the first thing read. */
  perk: string;
  /** What it costs, second. */
  ask: string;
  /** Shown only when the rung is not yet yours. */
  opens: string | null;
  mark: ReactNode | null;
  partner: string | null;
  state: RungState;
  details: ReactNode;
}

/** How high the gateway's answer already puts you. */
function level(payment: Payment | null): number {
  if (payment === "deposit") return 1;
  if (payment === "rate_lock_pay_later") return 2;
  if (payment === "pay_at_checkout") return 3;
  return 0;
}

export interface LadderInput {
  payment: Payment | null;
  personhood: boolean;
  wallet: boolean;
  /** Bands came back, so the history has actually been read. */
  contextRead: boolean;
}

interface Props extends LadderInput {
  /** The gateway's own words, shown only where a rung is out of reach. */
  reason: string | null;
  /** A real scheduled settlement, when there is one to open. */
  scheduleUrl?: string | null;
}

function buildRungs(props: Props): Rung[] {
  const { payment, personhood, wallet, contextRead, reason, scheduleUrl } = props;
  const at = level(payment);
  const proofsIn = personhood && wallet && contextRead;

  // The state that could quietly lie: asking for a step already taken. A wallet
  // that has been read says so, and only the missing half is requested.
  const historyOpens = !personhood
    ? wallet
      ? "prove a person to open this: your history is already read"
      : "prove a person and connect a wallet to open this"
    : "connect a wallet to open this";

  const rungs: Array<Omit<Rung, "state">> = [
    {
      key: "prepay",
      perk: "pay the whole stay up front",
      ask: "nothing to prove, and nothing held back",
      opens: null,
      mark: null,
      partner: null,
      details: (
        <p className="rung__text">
          a stranger gets the room at the same nightly rate as everyone else. what
          a stranger does not get is time: the desk asks for the whole stay before
          it holds anything, because there is nobody to come back to if the guest
          never arrives.
        </p>
      ),
    },
    {
      key: "deposit",
      perk: "leave a deposit, and keep the rest",
      ask: "prove a person is behind the booking",
      opens: at >= 1 ? null : "prove a person to open this",
      mark: <WorldMark size={MARK} />,
      partner: "world",
      details: (
        <>
          <p className="rung__text">
            two ways to prove a person, and both open the same deposit. the desk
            does not care which one it was told by.
          </p>
          <ul className="rung__ways">
            <li>
              <span className="rung__way">selfie check</span>
              <span className="rung__waynote">
                a person proves themselves, here in the browser, and it proves a
                person rather than which person.
              </span>
            </li>
            <li>
              <span className="rung__way">agentkit</span>
              <span className="rung__waynote">
                a person stands behind an agent and signs for it, so the agent
                books on their standing instead of as a stranger.
              </span>
            </li>
          </ul>
          <p className="rung__text">
            one engine either way. you at a keyboard and an agent working for you
            are the same claim as far as the desk is concerned: somebody real is
            answerable for this booking.
          </p>
        </>
      ),
    },
    {
      key: "hold",
      perk: "your history opens better terms",
      ask: "let a connected wallet be read as bands",
      opens: at >= 2 ? null : historyOpens,
      mark: <TheGraphMark size={MARK} />,
      partner: "the graph",
      details: (
        <>
          <p className="rung__text">
            a connected wallet is read as coarse bands and never as numbers. no
            balances, no counts, nothing anyone could shop for. it is an
            underwriting signal, in the way a landlord asks how long you have been
            at your last address.
          </p>
          <dl className="rung__bands">
            <div>
              <dt>been around, with some depth and breadth</dt>
              <dd>the price can be held for you</dd>
            </div>
            <div>
              <dt>a long record, clean, and real size behind it</dt>
              <dd>nothing moves until you arrive</dd>
            </div>
          </dl>
          <p className="rung__text">
            time is the part that cannot be bought back later, which is most of
            what this is measuring.
          </p>
        </>
      ),
    },
    {
      key: "checkout",
      perk: "the price holds, and the money waits",
      ask: "let the payment be scheduled instead of taken",
      opens: at >= 3 ? null : "a long, clean record opens this",
      mark: <HederaMark size={MARK} />,
      partner: "hedera",
      details: (
        <>
          <p className="rung__text">
            a held price has to be paid eventually, and this is how it waits. the
            payment is scheduled on hedera the moment the room is held, so it is
            already arranged before anyone owes anything, and it runs when you
            arrive rather than today.
          </p>
          <p className="rung__text">
            that is also the rail an agent pays on. the desk is not taking an
            agent's word that the money will come: the transaction exists up
            front, and it can be read by anyone.
          </p>
          {scheduleUrl ? (
            <p className="rung__link">
              <a href={scheduleUrl} target="_blank" rel="noreferrer">
                open your scheduled payment on hashscan
              </a>
            </p>
          ) : (
            <p className="rung__text rung__text--quiet">
              reach these terms and the schedule appears here, with a link to the
              transaction itself.
            </p>
          )}
        </>
      ),
    },
  ];

  return rungs.map((rung, idx) => {
    let state: RungState;
    if (idx < at) state = "reached";
    else if (idx === at) state = "here";
    else if (proofsIn && idx === at + 1) state = "blocked";
    else state = "locked";
    return { ...rung, state, opens: state === "locked" ? rung.opens : null };
  }).map((rung) =>
    rung.state === "blocked"
      ? { ...rung, opens: reason ?? "not from this history" }
      : rung,
  );
}

export function PerksLadder(props: Props) {
  const steps = buildRungs(props);
  const [open, setOpen] = useState<string | null>(null);
  const [shown, setShown] = useState(false);
  const boxRef = useRef<HTMLElement>(null);

  // Everything is on screen immediately when motion is not wanted. No observer,
  // no transitions, no waiting for a scroll that may never come.
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (reduced) {
      setShown(true);
      return;
    }
    const node = boxRef.current;
    if (!node) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [reduced]);

  return (
    <section
      ref={boxRef}
      className={`ladder ${shown ? "is-in" : ""} ${reduced ? "is-still" : ""}`}
      aria-label="what you get"
    >
      <ol className="ladder__rows">
        {steps.map((rung, idx) => {
          const isOpen = open === rung.key;
          return (
            <li
              key={rung.key}
              className={`rung rung--${rung.state} ${isOpen ? "is-open" : ""}`}
              style={{ ["--i" as string]: String(idx) }}
            >
              <button
                type="button"
                className="rung__head"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : rung.key)}
              >
                {rung.mark ? (
                  <span
                    className={`rung__mark rung__mark--${rung.key}`}
                    aria-hidden="true"
                  >
                    {rung.mark}
                  </span>
                ) : null}

                <span className="rung__body">
                  <span className="rung__perk">{rung.perk}</span>
                  <span className="rung__ask">{rung.ask}</span>

                  {rung.state === "here" ? (
                    <span className="rung__flag label">you are here</span>
                  ) : null}
                  {rung.opens ? (
                    <span className="rung__opens">{rung.opens}</span>
                  ) : null}
                </span>

                <span className="rung__more" aria-hidden="true">
                  {isOpen ? "less" : "more"}
                </span>
              </button>

              {isOpen ? (
                <div className="rung__details">
                  {rung.partner ? (
                    <p className="rung__partner label">{rung.partner}</p>
                  ) : null}
                  {rung.details}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
