// The handoff into the race.
//
// This used to be two blocks doing overlapping jobs: a strip reading "THE RACE ·
// ONE PROMPT · TWO AGENTS · REC", and under it the ask repeated at display size,
// which was the third time the same sentence appeared between the headline and
// the lanes. A reader arriving at two dense columns had been told what the
// request was three times and what the columns were never.
//
// One block now, and it answers the only question a first-time reader actually
// has here: what am I about to look at. It names the two sides in the order they
// appear on screen, so the eye knows which column is which before it starts
// reading numbers, and it carries the ask once, compactly, as a fact rather than
// as a headline.

const MONTHS = [
  "jan", "feb", "mar", "apr", "may", "jun",
  "jul", "aug", "sep", "oct", "nov", "dec",
];

function shortDate(iso: string): string {
  const [, month, day] = iso.slice(0, 10).split("-");
  return `${Number(day)} ${MONTHS[Number(month) - 1] ?? month}`;
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
  /** Who was picked to stand behind the right lane, in the words of the card. */
  backedWho: string | null;
}

export function RaceLeadIn({ asked, answered, backedWho }: Props) {
  const typed = asked.trim();
  const said = answered?.city ?? typed;

  // Compared loosely on purpose: "lisbon" and "Lisbon" are the same ask, and only
  // a genuinely different city is worth a line of explanation.
  const swapped =
    answered !== null &&
    typed !== "" &&
    answered.city.trim().toLowerCase() !== typed.toLowerCase();

  const facts = answered
    ? [
        `${shortDate(answered.checkin)} to ${shortDate(answered.checkout)} ${answered.checkout.slice(0, 4)}`,
        answered.nights ? `${answered.nights} nights` : null,
      ].filter(Boolean)
    : [];

  return (
    <section className="leadin">
      <p className="leadin__cap label">the race</p>
      <h2 className="leadin__title">
        two agents get the same request at the same moment
      </h2>

      {/* Named in the order they sit on screen, so the eye can place each column
        * before it starts reading numbers out of it. */}
      <ol className="leadin__sides">
        <li className="leadin__side">
          <span className="leadin__where label">on the left</span>
          <span className="leadin__who">nobody behind it</span>
          <span className="leadin__what">
            pays to ask, and pays for the whole stay before anyone holds a room
          </span>
        </li>
        <li className="leadin__side leadin__side--accent">
          <span className="leadin__where label">on the right</span>
          <span className="leadin__who">
            {backedWho ? `${backedWho}, behind it` : "a real person behind it"}
          </span>
          <span className="leadin__what">
            asks for free, and the money waits as far as their record allows
          </span>
        </li>
      </ol>

      <p className="leadin__ask mono">
        {`book me a hotel in ${said || "a city"}`}
        {facts.length ? ` · ${facts.join(" · ")}` : ""}
      </p>

      {swapped ? (
        <p className="leadin__swap reason">
          {answered.source === "cached"
            ? `asked for ${typed}. the desk answered from a saved snapshot, and the snapshot holds ${answered.city}, so these are ${answered.city} rooms`
            : `asked for ${typed}. the desk answered with ${answered.city}`}
        </p>
      ) : null}
    </section>
  );
}
