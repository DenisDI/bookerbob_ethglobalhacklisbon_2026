// The ask, repeated once, to both agents.
//
// This replaces a hardcoded "BOOK ME A HOTEL IN LISBON" set in the display face at
// hero size with chromatic fringing. It shouted a city the guest never chose and
// it was the loudest thing on the page, which put the emphasis on the request
// rather than on the two answers that are the point.
//
// Now it echoes what was actually typed, and then what the desk actually answered:
// the real window, the real night count, and the real city. The live booker honours
// the city; the captured snapshot answers with the city it really quoted. When those
// two differ the strip says so in plain words, because a search field that quietly
// ignored you is worse than no search field.

const MONTHS = [
  "jan", "feb", "mar", "apr", "may", "jun",
  "jul", "aug", "sep", "oct", "nov", "dec",
];

function shortDate(iso: string): string {
  const [, month, day] = iso.slice(0, 10).split("-");
  return `${Number(day)} ${MONTHS[Number(month) - 1] ?? month}`;
}

function year(iso: string): string {
  return iso.slice(0, 4);
}

export interface Answered {
  city: string;
  checkin: string;
  checkout: string;
  nights: number | null;
  source: "live" | "cached";
}

interface Props {
  /** What the guest typed. */
  asked: string;
  /** What the desk came back with, once it has. */
  answered: Answered | null;
}

export function SaidOnce({ asked, answered }: Props) {
  const typed = asked.trim();
  const said = answered?.city ?? typed;

  // Compared loosely on purpose: "lisbon" and "Lisbon" are the same ask, and only
  // a genuinely different city is worth a line of explanation.
  const swapped =
    answered !== null &&
    typed !== "" &&
    answered.city.trim().toLowerCase() !== typed.toLowerCase();

  const window = answered
    ? `${shortDate(answered.checkin)} to ${shortDate(answered.checkout)} ${year(answered.checkout)}`
    : null;

  return (
    <div className="saidonce">
      <p className="saidonce__cap label">the ask, said once to both agents</p>
      <p className="saidonce__text">
        book me a hotel in <span className="saidonce__city">{said || "a city"}</span>
      </p>
      {answered ? (
        <p className="saidonce__facts mono">
          {[window, answered.nights ? `${answered.nights} nights` : null]
            .filter(Boolean)
            .join(" · ")}
        </p>
      ) : (
        // Nothing has been asked yet, so this says how to ask. It names the real
        // control rather than describing one, and it goes away for good once the
        // race has run.
        <p className="saidonce__hint reason">
          nothing asked yet. press run both, and this same request goes to two
          agents at once: one with nobody behind it, one with a person behind it.
        </p>
      )}
      {swapped ? (
        <p className="saidonce__swap reason">
          {answered.source === "cached"
            ? `asked for ${typed}. the desk answered from a saved snapshot, and the snapshot holds ${answered.city}, so these are ${answered.city} rooms`
            : `asked for ${typed}. the desk answered with ${answered.city}`}
        </p>
      ) : null}
    </div>
  );
}
