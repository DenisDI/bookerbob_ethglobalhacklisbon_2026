// The finale is a booking, shown like a booking. A bone card on a near-black
// page, the only inversion in the product, which is why it lands.
//
// Order of loudness: name, seal, price, terms. On a screen whose whole argument is
// that the price did not change, a giant price would be a lie, so the rate sits
// third.
//
// scheduleUrl comes from /offers when earnsRateLock triggers a Hedera
// ScheduleCreate. Without it the settlement row says so and keeps its layout;
// never a bare tx id, either the open HashScan page or the honest gap.
//
// Two honest departures from the drawing. The seal shows the hold reference we
// actually have (partnerOrderId); the package sketched a supplier book_hash,
// which the gateway does not send to the browser. And check-in / check-out show
// dates without clock times, because dates are what the supplier gives us.

import { HederaMark } from "./PartnerMarks";
import { displayName, starsLabel } from "./offer-display";
import type { Offer, PrebookHold } from "./types";

interface Props {
  offer: Offer;
  hold: PrebookHold;
  checkin: string;
  checkout: string;
  nights: number | null;
  matchingCount: number | null;
  city: string;
  /** ENS name or address of the consented wallet, when there is one. */
  bookedFor: string | null;
  /**
   * Who did the booking on this surface.
   *
   * The race is two agents and "agent for vitalik.eth" is the literal truth
   * there. The overview is a person at a keyboard, and telling them an ai agent
   * acted on their behalf is a small lie about the one thing the card exists to
   * report. Same card, same data, the actor named correctly.
   */
  bookedBy?: "agent" | "person";
  cached: boolean;
  scheduleUrl?: string | null;
}

function shortRef(reference: string): string {
  return reference.length > 18
    ? `${reference.slice(0, 12)}…${reference.slice(-4)}`
    : reference;
}

const MONTHS = [
  "jan", "feb", "mar", "apr", "may", "jun",
  "jul", "aug", "sep", "oct", "nov", "dec",
];

function humanDate(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split("-");
  return `${Number(day)} ${MONTHS[Number(month) - 1] ?? month} ${year}`;
}

export function HotelFinaleCard({
  offer,
  hold,
  checkin,
  checkout,
  nights,
  matchingCount,
  city,
  bookedFor,
  bookedBy = "agent",
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
        <div className="finale__top">
          <div className="finale__ident">
            {offer.address ? <p className="finale__address">{offer.address}</p> : null}
            <h3 className="finale__name">{displayName(offer)}</h3>
            <p className="finale__sub">
              {[
                offer.stars ? starsLabel(offer.stars) : null,
                hold.roomName,
                `${humanDate(checkin)} to ${humanDate(checkout)}`,
                nights ? `${nights} nights` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>

          <div className="finale__seal">
            <b>
              RATE
              <br />
              LOCKED
            </b>
            <span className="finale__seal-ref mono">{shortRef(hold.partnerOrderId)}</span>
          </div>
        </div>

        <div className="finale__rate">
          <span className="finale__amount">${hold.perNightUsd.toFixed(2)}</span>
          <span className="finale__per">
            / night · the same room, the same rate the unbacked lane was quoted
          </span>
          {cached ? <span className="badge">CACHED INVENTORY</span> : null}
        </div>

        <div className="finale__facts">
          <div>
            <span className="k">CHECK-IN</span>
            <span className="v">{humanDate(checkin)}</span>
          </div>
          <div>
            <span className="k">CHECK-OUT</span>
            <span className="v">{humanDate(checkout)}</span>
          </div>
          <div>
            <span className="k">BOOKED BY</span>
            <span className="v">
              {bookedBy === "person"
                ? (bookedFor ?? "you")
                : bookedFor
                  ? `agent for ${bookedFor}`
                  : "an agent"}
            </span>
          </div>
          <div>
            <span className="k">CARD ON FILE</span>
            <span className="v">not required</span>
          </div>
          <div>
            <span className="k">TOTAL, STAY</span>
            <span className="v mono">${hold.totalUsd.toFixed(2)}</span>
          </div>
          <div>
            <span className="k">ROOMS MATCHING</span>
            <span className="v">
              {matchingCount ?? "several"} in {city}
            </span>
          </div>
        </div>

        <div className="finale__terms">
          <div>
            <span className="k">PRICE HELD</span>
            <span className="v mono">{shortRef(hold.partnerOrderId)}</span>
          </div>
          <div>
            <span className="k">FREE TO CANCEL UNTIL</span>
            <span className="v">
              {hold.freeCancellationBefore
                ? humanDate(hold.freeCancellationBefore)
                : "not cancellable"}
            </span>
          </div>
          {/* The peak of the whole story, so it is the one cell on this card that
            * is allowed to be louder than its neighbours: a real room, a real
            * hold, and a real payment already scheduled for a day in the future. */}
          <div className="finale__settle">
            <span className="partner">
              <HederaMark size={14} />
              <span className="k">SETTLEMENT SCHEDULED</span>
            </span>
            {scheduleUrl ? (
              <a
                className="v finale__link"
                href={scheduleUrl}
                target="_blank"
                rel="noreferrer"
              >
                {humanDate(checkout)} ↗ hashscan
              </a>
            ) : (
              <span className="v finale__pending">
                {humanDate(checkout)}, not scheduled yet
              </span>
            )}
          </div>
        </div>

        <div className="finale__quote">
          <span className="finale__quote-num mono">01</span>
          <span>
            {bookedBy === "person"
              ? "a real hotel room, locked at this rate. no card on file, no money moved yet."
              : "an ai agent just locked a real hotel room on its own. no card on file, no money moved yet."}
          </span>
        </div>
      </div>
    </article>
  );
}
