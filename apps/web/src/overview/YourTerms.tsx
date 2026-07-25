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

import { SettlementRail } from "../SettlementRail";
import { paymentLine } from "../terms-copy";
import type { OffersResponse } from "../types";

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

export function YourTerms({ data, refreshing, error, personhood, wallet }: Props) {
  const move = nextMove(data, personhood, wallet);

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
        <>
          <p className="yourterms__term">{paymentLine(data.terms.payment)}</p>
          <p className="yourterms__why reason">{data.reason}</p>

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

          {move ? <p className="yourterms__move">{move}</p> : null}
        </>
      ) : (
        <p className="yourterms__term yourterms__term--waiting">
          reading the desk for the first time
        </p>
      )}
    </aside>
  );
}
