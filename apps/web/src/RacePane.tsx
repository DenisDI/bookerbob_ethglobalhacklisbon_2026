// One competitor in the race. Both panes get the identical request; everything
// visible below the label is a consequence of who is behind it.
//
// Fixed order, top to bottom, and the head never reflows between states: lane
// tags and status, the counter, the standing row, the rail with its term and
// reason, the metering strip, the narration feed, then the rooms.
//
// Lane A is greyscale. Reaching for the accent in lane A means the design is
// wrong, not the token: colour is what says a real person is accountable.

import { ContextFile } from "./ContextFile";
import { NarrationFeed } from "./NarrationFeed";
import { OfferList, OfferSkeleton } from "./OfferList";
import { TheGraphMark, WorldMark } from "./PartnerMarks";
import { EmptyRail, SettlementRail } from "./SettlementRail";
import { SpentCounter } from "./SpentCounter";
import {
  inventoryLine,
  meterLine,
  paymentLine,
  roomsFootnote,
  termChip,
  TIER_CHIP,
} from "./terms-copy";
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
  /** The room present in both lanes, so the comparison has one anchor. */
  anchorHotelId?: string | null;
}

const STATUS: Record<PaneState["status"], string> = {
  idle: "READY",
  working: "THINKING",
  done: "ANSWERED",
  failed: "NO ANSWER",
};

function snapshotAge(capturedAt: string | null): string | null {
  if (!capturedAt) return null;
  const minutes = Math.round((Date.now() - new Date(capturedAt).getTime()) / 60000);
  if (minutes < 1) return "just now";
  return minutes < 90 ? `${minutes}m` : `${Math.round(minutes / 60)}h`;
}

export function RacePane({
  label,
  accent,
  state,
  reducedMotion,
  anchorHotelId = null,
}: Props) {
  const { data } = state;
  const context = data?.context ?? null;
  const paidQueries = Math.round(state.spentUsd * 100);

  return (
    <section className={`pane ${accent ? "pane--accent" : ""}`}>
      <header className="pane__head">
        <div className="pane__tags">
          <span className={`chip ${accent ? "chip--solid" : "chip--ash"}`}>
            {accent ? "LANE B" : "LANE A"}
          </span>
          <h2 className="pane__label label">{label}</h2>
          {accent ? (
            <span className="chip chip--accent partner">
              <WorldMark />
              CREDENTIAL PRESENT
            </span>
          ) : null}
          <span className="pane__spacer" />
          <span className="pane__status">
            <span
              className={`dot ${accent ? "" : "dot--ash"} ${
                state.status === "working" ? "pulse" : ""
              }`}
              aria-hidden="true"
            />
            {STATUS[state.status]}
          </span>
        </div>

        <SpentCounter usd={state.spentUsd} counting={state.spentUsd > 0} />

        <div className="pane__tags">
          <span className="label">STANDING</span>
          {context ? (
            <span className="partner pane__source">
              <TheGraphMark />
              <span className="label">the graph</span>
            </span>
          ) : null}
          <span className={`chip ${accent && data ? "chip--solid" : ""}`}>
            {data ? TIER_CHIP[data.terms.tier] : "NOT ASKED"}
          </span>
          {data ? <span className="reason">{data.reason}</span> : null}
        </div>

        {data ? (
          <>
            <SettlementRail
              checkin={data.checkin}
              checkout={data.checkout}
              // The hold carries the guest's own deadline; without one the top
              // room's supplier deadline is still a real date on the same axis.
              freeCancellationBefore={
                data.hold?.freeCancellationBefore ??
                data.offers[0]?.freeCancellationBefore ??
                null
              }
              payment={data.terms.payment}
              accent={accent}
            />
            <p className="pane__term">{paymentLine(data.terms.payment)}</p>
          </>
        ) : (
          <EmptyRail
            caption={
              state.status === "working" ? "asking the desk" : "nothing asked yet"
            }
          />
        )}
      </header>

      <div className={`meter ${accent ? "meter--accent" : ""}`}>
        <span className="meter__tag">x402</span>
        <span className="meter__line">{meterLine(accent)}</span>
        <span className="pane__spacer" />
        <span className="label">
          {accent ? "0 QUERIES" : `${paidQueries} QUERIES`}
        </span>
      </div>

      <div className="pane__feed">
        <NarrationFeed lines={data?.narration ?? []} instant={reducedMotion} />
      </div>

      <div className="pane__rooms">
        {state.status === "failed" ? (
          <div className="toast">
            <span className="dot dot--signal" aria-hidden="true" />
            <span className="speech">{state.error}</span>
          </div>
        ) : null}

        {state.status === "working" && !data ? <OfferSkeleton /> : null}

        {data ? (
          <>
            <p className="pane__count">
              <span className="label">
                {inventoryLine(data.terms, data.offers.length)}
              </span>
              <span className="badge">
                {data.source === "cached"
                  ? `CACHED SNAPSHOT · ${snapshotAge(data.capturedAt) ?? "earlier"}`
                  : "LIVE"}
              </span>
            </p>

            {context ? <ContextFile context={context} /> : null}

            {/* Both lanes show a list, always. The anchored room carries the
              * term chip in each of them, and that one traceable line is the
              * comparison. The finale card is its own beat below the race, not a
              * third thing competing inside a lane. */}
            <OfferList
              offers={data.offers}
              limit={data.terms.inventory === "basic" ? 3 : 5}
              anchorHotelId={anchorHotelId}
              term={termChip(data.terms.payment)}
              accent={accent}
              footnote={roomsFootnote(
                data.terms,
                data.offers.length,
                data.matchingCount,
              )}
            />
          </>
        ) : null}
      </div>
    </section>
  );
}
