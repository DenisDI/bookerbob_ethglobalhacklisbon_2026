// Your terms right now, and the one thing standing between you and better ones.
//
// This panel is the spine of the page. It is on screen from the first paint,
// before anything has been connected, and it never unmounts: the whole argument
// is that these terms move as proof is added, and a panel that appears only once
// there is something good to say cannot show movement.
//
// Everything here comes from the gateway's own answer. The term is translated
// from the payment enum by terms-copy, and the explanation is the gateway's
// `reason` string verbatim rather than a sentence we compose from the tier, so
// the panel cannot drift away from the engine that decided it.
//
// Never a tier ladder and never a table. The tier is felt through the term and
// the exposure glyph, which is the same rule the race lanes follow.

import { TheGraphMark, WorldMark } from "../PartnerMarks";
import { SettlementRail } from "../SettlementRail";
import { TIER_CHIP, yourExposureLine, yourTermsLine } from "../terms-copy";
import type { OffersResponse, Payment } from "../types";

/** The four answers the engine has, in the order they get better. */
const STEPS: Payment[] = [
  "prepay_100",
  "deposit",
  "rate_lock_pay_later",
  "pay_at_checkout",
];

/**
 * What is worth doing next, in the ladder's words.
 *
 * The reward leads and the step follows, the same way every rung reads, so the
 * panel and the ladder can never describe one state two different ways. A wallet
 * that has been read and has not paid off yet is a nudge with one step left in
 * it, not a lecture about how the engine works.
 */
function nextMove(
  data: OffersResponse | null,
  personhood: boolean,
  wallet: boolean,
): string | null {
  if (!data) return null;

  if (data.terms.payment === "prepay_100") {
    if (personhood) return null;
    return wallet
      ? "keep the rest of the stay: your history is read, and proving a person is the one step that cashes it in"
      : "leave a deposit instead of the whole stay: prove a person is behind the booking";
  }

  if (data.terms.payment === "deposit") {
    // Connected and read, and it did not reach a held price. The gateway's own
    // reason is already on screen above this line, so this does not repeat it and
    // it does not ask for a step that has been taken.
    return wallet
      ? null
      : "hold the price instead of leaving a deposit: connect a wallet and let your history be read";
  }

  return null;
}

interface Props {
  data: OffersResponse | null;
  /** In flight. The previous answer stays on screen underneath. */
  refreshing: boolean;
  error: string | null;
  personhood: boolean;
  wallet: boolean;
}

/**
 * What is plugged in, and what each one is still waiting for.
 *
 * The panel was a paragraph of prose about a state, and the state itself was the
 * thing nobody could see. These are the three inputs the engine actually reads,
 * each either in or not, so "what have I connected and what did it get me" is
 * answered by looking rather than by reading.
 */
function Inputs({
  personhood,
  wallet,
  walletProved,
  contextRead,
}: {
  personhood: boolean;
  wallet: boolean;
  /** The gateway checked a Privy token against the linked wallets, and it matched. */
  walletProved: boolean;
  contextRead: boolean;
}) {
  const rows = [
    {
      key: "person",
      mark: <WorldMark size={15} />,
      name: "a person",
      on: personhood,
      state: personhood ? "proved" : "not yet",
    },
    {
      // No mark. The wallet is Privy's step and Privy has no mark in the
      // package, and borrowing another partner's logo for it would credit the
      // wrong company for the work.
      key: "wallet",
      mark: null,
      name: "a wallet",
      on: wallet,
      // An address can arrive by being typed, which is a supported way to look
      // somebody up and not the same claim as connecting one. Only the gateway
      // can tell them apart, so the word comes from its answer and not from the
      // field being non-empty.
      state: wallet ? (walletProved ? "connected" : "typed") : "not yet",
    },
    {
      key: "standing",
      mark: <TheGraphMark size={14} />,
      name: "their history",
      on: contextRead,
      state: contextRead ? "read as bands" : wallet ? "nothing to read" : "needs a wallet",
    },
  ];

  return (
    <ul className="yt-in">
      {rows.map((row) => (
        <li key={row.key} className={`yt-in__row ${row.on ? "is-on" : ""}`}>
          <span className="yt-in__mark partner">{row.mark}</span>
          <span className="yt-in__name">{row.name}</span>
          <span className="yt-in__state">{row.state}</span>
        </li>
      ))}
    </ul>
  );
}

export function YourTerms({ data, refreshing, error, personhood, wallet }: Props) {
  const move = nextMove(data, personhood, wallet);
  const contextRead = Boolean(data?.context);
  const at = data ? STEPS.indexOf(data.terms.payment) : -1;
  // Somebody is answerable. This is the one condition the accent is allowed to
  // follow, and every coloured thing in the panel follows it together.
  const backed = Boolean(data) && data!.terms.payment !== "prepay_100";

  return (
    <aside className={`yourterms ${refreshing ? "is-refreshing" : ""}`}>
      <header className="yourterms__head">
        <span className="label">your terms right now</span>
        {refreshing ? (
          <span className="yourterms__working label">asking the desk</span>
        ) : null}
      </header>

      {/* A 402 is not a failure and it is not the desk being unreachable. It is
        * the desk charging for an anonymous question, which is the product's own
        * argument arriving before the page has said it. Read as a dead end it
        * looks broken; read correctly it is the first rung explaining itself. */}
      {error && !data && error.includes("402") ? (
        <>
          <p className="yourterms__term">an anonymous question is metered here</p>
          <p className="yourterms__why reason">
            the desk charges a stranger to ask, and asks for the whole stay before
            it holds anything
          </p>
          <p className="yourterms__move">
            stop paying to ask and stop paying the stay up front: prove a person is
            behind the booking
          </p>
        </>
      ) : error && !data ? (
        <p className="yourterms__term">
          i cannot reach the desk and i have nothing written down
        </p>
      ) : data ? (
        // Keyed on the term: when it changes, this whole block is a new element
        // rather than an edited one, so the entrance plays instead of the text
        // quietly swapping under the reader.
        <div
          className={`yourterms__body ${backed ? "is-backed" : "is-bot"}`}
          key={data.terms.payment}
        >
          {/* The level, as a shape rather than as a sentence. Four segments for
            * the engine's four answers, filled to the one you are on, so a step
            * that moves the terms is visible from across the room. */}
          <div className="yt-level" aria-hidden="true">
            {STEPS.map((_, idx) => (
              <i key={idx} className={idx <= at ? "is-on" : undefined} />
            ))}
          </div>

          {/* The same standing chip the race lanes use, so one label means one
            * thing across the product. Filled either way, because a stranger's
            * standing is a real answer and not an empty slot: ash for nobody
            * behind the booking, accent the moment somebody is. */}
          <p className="yt-tierrow">
            <span className={`chip ${backed ? "chip--solid" : "chip--ash"}`}>
              {TIER_CHIP[data.terms.tier]}
            </span>
          </p>

          <p className="yourterms__term">{yourTermsLine(data.terms.payment)}</p>
          <p className="yourterms__why reason">{data.reason}</p>

          <Inputs
            personhood={personhood}
            wallet={wallet}
            walletProved={data?.wallet?.status === "verified"}
            contextRead={contextRead}
          />

          {/* The rail is the signature glyph and it is not self-explanatory. A
            * hatched bar over a timeline says nothing on its own about whose
            * money it is, how much of it, or when. */}
          <div className="yourterms__rail">
            <p className="yourterms__railcap label">
              your money, from today to checkout
            </p>
            <SettlementRail
              checkin={data.checkin}
              checkout={data.checkout}
              freeCancellationBefore={
                data.hold?.freeCancellationBefore ??
                data.offers[0]?.freeCancellationBefore ??
                null
              }
              payment={data.terms.payment}
              accent={data.terms.payment !== "prepay_100"}
            />
            <p className="yourterms__held">
              <span className="yourterms__hatch" aria-hidden="true" />
              {yourExposureLine(data.terms.payment)}
            </p>
          </div>

          {move ? (
            <p className="yourterms__move">
              <span className="yourterms__next label">next</span>
              {move}
            </p>
          ) : (
            <p className="yourterms__move yourterms__move--top">
              <span className="yourterms__next label">top of the ladder</span>
              nothing else to prove: this is the best the desk offers anyone.
            </p>
          )}
        </div>
      ) : (
        <p className="yourterms__term yourterms__term--waiting">
          reading the desk for the first time
        </p>
      )}
    </aside>
  );
}
