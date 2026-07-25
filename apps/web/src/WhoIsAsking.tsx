// Who stands behind the booking, as a choice you make before you press anything.
//
// THE PROBLEM THIS SOLVES. The page ran a race between two agents and offered
// three chips labelled with wallet jargon: "vitalik.eth", "long-time borrower",
// "first-day wallet". A visitor had no way to know what pressing one would do, so
// the result, when it arrived, was not an answer to a question they had asked.
// Nothing on screen said what to expect, which meant nothing on screen could
// confirm the product worked.
//
// Each option now says who that person is and what their booking will look like,
// in that order, before it is pressed. Then it is pressed and the lanes show
// exactly that. The prediction is the demo: a judge who reads a card, clicks, and
// watches the terms land where the card said has verified the underwriting engine
// without being told a single thing about how it works.
//
// NOT A PLAN CHOOSER. These are people, not products, and the outcome is a
// consequence of who they are rather than something bought. So they are written as
// short sketches with one consequence each, never a feature grid with matching
// rows, and no option is better than another to buy: they cost the same. The rate
// sheet is identical down every path and the only thing that moves is when the
// money does.
//
// Every expectation below was read off the live gateway on 2026-07-25 rather than
// written from the terms matrix, so a card that stops being true is a card that
// stops matching the engine, and that is the point of a demo.

export interface Scenario {
  key: string;
  /** What gets sent as the consented address. Empty means none is shared. */
  input: string;
  /** Who this is, in a person's words. */
  who: string;
  /** The one fact about them that decides it. */
  sketch: string;
  /** What their booking looks like. Verified against the live gateway. */
  expect: string;
}

export const SCENARIOS: Scenario[] = [
  {
    key: "new",
    input: "0x646c5ba59f30cf73deea9b00e13aead674c6b07a",
    who: "someone brand new",
    sketch: "a real person, but a wallet only days old. nothing to read yet.",
    expect: "every room, and a deposit now with the rest left until later",
  },
  {
    key: "caught-short",
    input: "0x62e2ceb6933a0747579f4f9f96d3253a7af0b237",
    who: "someone who has been caught short",
    sketch: "years of real activity, and a loan that once went against them.",
    expect: "every room, the price held today and settled nearer the stay",
  },
  {
    key: "long-record",
    input: "vitalik.eth",
    who: "someone with a long clean record",
    sketch: "around since 2017, has borrowed and paid it back, still active.",
    expect: "every room, and nothing at all moves until checkout",
  },
];

interface Props {
  /** The address currently in play, so a picked card can show as picked. */
  value: string;
  onPick(input: string): void;
  disabled: boolean;
}

export function WhoIsAsking({ value, onPick, disabled }: Props) {
  return (
    <section className="who">
      <div className="who__cap">
        <h2 className="who__title">who stands behind the booking</h2>
        {/* The sentence that makes the whole race readable. Without it, two lanes
          * of results are two unexplained columns. */}
        <p className="who__lede">
          one lane always runs with nobody behind it, so there is something to
          compare against. pick who stands behind the other one, and the rooms
          and the rate stay the same either way.
        </p>
      </div>

      <ul className="who__list">
        {SCENARIOS.map((scenario) => {
          const picked = value.trim().toLowerCase() === scenario.input.toLowerCase();
          return (
            <li key={scenario.key}>
              <button
                type="button"
                className={`who__card ${picked ? "is-picked" : ""}`}
                disabled={disabled}
                aria-pressed={picked}
                onClick={() => onPick(scenario.input)}
              >
                <span className="who__name">{scenario.who}</span>
                <span className="who__sketch">{scenario.sketch}</span>
                <span className="who__expect">
                  <span className="who__expect-tag label">expect</span>
                  {scenario.expect}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
