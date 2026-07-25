// Rooms at the current terms.
//
// The room that appears in BOTH lanes carries a small red anchor square and the
// term chip, in both lists. Two chips on one traceable line is the whole
// comparison: same room, same nightly rate, different term. A chip on every row
// would be noise.

import { displayName, starsLabel } from "./offer-display";
import type { Offer } from "./types";

interface Props {
  offers: Offer[];
  limit?: number;
  /** The room present in both lanes, so the comparison has one anchor. */
  anchorHotelId?: string | null;
  /** Short term label, shown only on the anchored row. */
  term?: string;
  /** Accent the chip: only ever true on the backed lane. */
  accent?: boolean;
  footnote?: string | null;
}

export function OfferList({
  offers,
  limit = 5,
  anchorHotelId = null,
  term,
  accent = false,
  footnote,
}: Props) {
  const shown = offers.slice(0, limit);

  return (
    <div className="rooms">
      {shown.map((offer) => {
        const anchored = offer.hotelId === anchorHotelId;
        return (
          <div key={offer.hotelId} className="offer">
            <span className="offer__name">
              {anchored ? <i className="offer__anchor" aria-hidden="true" /> : null}
              <span>{displayName(offer)}</span>
              {offer.stars ? (
                <span className="offer__stars">{starsLabel(offer.stars)}</span>
              ) : null}
            </span>
            <span className="offer__rate mono">${offer.perNightUsd.toFixed(2)}</span>
            {anchored && term ? (
              <span className={`chip ${accent ? "chip--accent" : ""} offer__term`}>
                {term}
              </span>
            ) : (
              <span />
            )}
          </div>
        );
      })}

      {footnote ? <p className="offer__foot">{footnote}</p> : null}
    </div>
  );
}

/** The working twin: shimmer on the name cell only, never a spinner. */
export function OfferSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="rooms" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skel">
          <span />
          <span />
          <span />
        </div>
      ))}
    </div>
  );
}
