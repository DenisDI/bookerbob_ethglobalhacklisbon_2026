import { displayName, starsLabel } from "./offer-display";
import type { Offer } from "./types";

interface Props {
  offers: Offer[];
  limit?: number;
}

export function OfferList({ offers, limit = 4 }: Props) {
  const shown = offers.slice(0, limit);
  const rest = offers.length - shown.length;

  return (
    <div className="rooms">
      {shown.map((offer) => (
        <div key={offer.hotelId} className="rooms__row">
          <span className="rooms__name">{displayName(offer)}</span>
          <span className="rooms__stars">{starsLabel(offer.stars)}</span>
          <span className="rooms__price">${offer.perNightUsd.toFixed(2)}</span>
        </div>
      ))}
      {rest > 0 ? <p className="rooms__rest">and {rest} more</p> : null}
    </div>
  );
}
