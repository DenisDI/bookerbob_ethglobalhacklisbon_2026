// The finale is a booking, shown like a booking. Real photo, real name, real
// nightly rate, then the two facts that make it a BookerBob booking: the price
// is held, and the settlement is scheduled.
//
// scheduleUrl comes from /offers when earnsRateLock → Hedera ScheduleCreate.

import { displayName, starsLabel } from "./offer-display";
import type { Offer, PrebookHold } from "./types";

interface Props {
  offer: Offer;
  hold: PrebookHold;
  checkout: string;
  cached: boolean;
  scheduleUrl?: string;
}

export function HotelFinaleCard({
  offer,
  hold,
  checkout,
  cached,
  scheduleUrl,
}: Props) {
  return (
    <article className="finale">
      {offer.photoUrl ? (
        <img className="finale__photo" src={offer.photoUrl} alt="" loading="lazy" />
      ) : (
        <div className="finale__photo finale__photo--none" aria-hidden="true" />
      )}

      <div className="finale__body">
        <header className="finale__head">
          <h3 className="finale__name">{displayName(offer)}</h3>
          <span className="finale__stars">{starsLabel(offer.stars)}</span>
        </header>

        {offer.address ? <p className="finale__address">{offer.address}</p> : null}

        <p className="finale__rate">
          <span className="finale__amount">${hold.perNightUsd.toFixed(2)}</span>
          <span className="finale__per">a night</span>
          {cached ? <span className="badge">cached inventory</span> : null}
        </p>

        <dl className="finale__facts">
          <div>
            <dt>price held</dt>
            <dd className="mono">{hold.partnerOrderId}</dd>
          </div>
          <div>
            <dt>settlement scheduled</dt>
            <dd className="mono">
              {scheduleUrl ? (
                <a href={scheduleUrl} target="_blank" rel="noreferrer">
                  {checkout}
                </a>
              ) : (
                <span className="pending">{checkout}, not scheduled yet</span>
              )}
            </dd>
          </div>
          {hold.freeCancellationBefore ? (
            <div>
              <dt>free to cancel until</dt>
              <dd className="mono">{hold.freeCancellationBefore.slice(0, 10)}</dd>
            </div>
          ) : null}
        </dl>
      </div>
    </article>
  );
}
