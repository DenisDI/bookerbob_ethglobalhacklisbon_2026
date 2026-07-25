// One competitor in the race. Both panes get the identical request; everything
// visible below the label is a consequence of who is behind it.

import { HotelFinaleCard } from "./HotelFinaleCard";
import { NarrationFeed } from "./NarrationFeed";
import { OfferList } from "./OfferList";
import { SettlementRail } from "./SettlementRail";
import { SpentCounter } from "./SpentCounter";
import { inventoryLine, paymentLine } from "./terms-copy";
import type { OffersResponse } from "./types";

export interface PaneState {
  status: "idle" | "working" | "done" | "failed";
  data: OffersResponse | null;
  error: string | null;
  spentUsd: number;
}

interface Props {
  label: string;
  accent: boolean;
  state: PaneState;
  reducedMotion: boolean;
}

export function RacePane({ label, accent, state, reducedMotion }: Props) {
  const { data } = state;

  return (
    <section className={`pane ${accent ? "pane--accent" : ""}`}>
      <header className="pane__head">
        <h2 className="pane__label">{label}</h2>
        <SpentCounter usd={state.spentUsd} counting={state.spentUsd > 0} />
      </header>

      {data ? (
        <>
          <SettlementRail
            checkin={data.checkin}
            checkout={data.checkout}
            freeCancellationBefore={data.hold?.freeCancellationBefore ?? null}
            payment={data.terms.payment}
            accent={accent}
          />
          <p className="pane__term">{paymentLine(data.terms.payment)}</p>
        </>
      ) : (
        <div className="rail rail--empty">
          <div className="rail__track" />
          <div className="rail__scale">
            <span>today</span>
            <span>checkout</span>
          </div>
          <p className="rail__caption">
            {state.status === "working" ? "asking the desk" : "nothing asked yet"}
          </p>
        </div>
      )}

      <div className="pane__feed">
        <NarrationFeed lines={data?.narration ?? []} instant={reducedMotion} />
      </div>

      {state.status === "failed" ? (
        <p className="pane__error">{state.error}</p>
      ) : null}

      {data ? (
        <div className="pane__rooms">
          <p className="pane__count">{inventoryLine(data.terms, data.offers.length)}</p>
          {data.hold && data.offers[0] ? (
            <HotelFinaleCard
              offer={data.offers[0]}
              hold={data.hold}
              checkout={data.checkout}
              cached={data.source === "cached"}
            />
          ) : (
            <OfferList offers={data.offers} />
          )}
        </div>
      ) : null}
    </section>
  );
}
