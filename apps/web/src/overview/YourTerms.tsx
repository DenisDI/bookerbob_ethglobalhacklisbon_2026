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

/** What the reader could still do, given what the desk just said. */
function nextMove(
  data: OffersResponse | null,
  personhood: boolean,
  wallet: boolean,
): string | null {
  if (!data) return null;

  // Nothing is extended on trust without someone answerable, however rich the
  // history behind the address. That is the engine's first branch, and it is the
  // most useful thing this panel can say to someone who has connected a wallet
  // and watched nothing happen.
  if (data.terms.payment === "prepay_100") {
    return personhood
      ? "these are the terms for a request nobody is answerable for"
      : wallet
        ? "your history is read and it is not being counted yet, because nobody is answerable for this request. prove you are a person and it starts to count."
        : "prove you are a person and the whole stay stops having to be paid up front";
  }

  if (data.terms.payment === "deposit") {
    return wallet
      ? "your wallet is connected. what is there is not yet enough to hold a price against."
      : "connect a wallet and whatever it has done can be read, which is what moves a deposit to a held price";
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

      {error && !data ? (
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
