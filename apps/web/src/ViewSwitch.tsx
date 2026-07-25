// Three surfaces, one product, and each one does a single job.
//
//   overview  what this is and why it matters, and your own booking: connect a
//             wallet, prove you are a person, watch your terms move, hold a price.
//   demo      the race. two agents answering the same request, on concrete people.
//   machine   the handshake as an agent reads it: challenge, response, typed data.
//
// The race used to be the only human surface, which meant the site argued before
// it explained: a visitor met a comparison between two things nobody had told
// them about, and the only thing they could do was watch agents transact.
//
// The switch stays in the URL so a given surface can be linked, filmed, or
// reloaded into without clicking twice.

export type View = "overview" | "demo" | "machine";

const LABEL: Record<View, string> = {
  overview: "overview",
  demo: "demo",
  machine: "machine",
};

const ORDER: View[] = ["overview", "demo", "machine"];

function isView(value: string | null): value is View {
  return value === "overview" || value === "demo" || value === "machine";
}

export function readView(search: string): View {
  const params = new URLSearchParams(search);
  const asked = params.get("view");
  if (isView(asked)) return asked;

  // The filming and screenshot links are `?autorun=1&address=…` with no view on
  // them, and they point at the race. They have to keep landing on it now that
  // the default surface is no longer the race.
  if (params.has("autorun")) return "demo";

  return "overview";
}

/** Keeps the address bar honest about which surface is on screen. */
export function writeView(view: View): void {
  const params = new URLSearchParams(window.location.search);
  if (view === "overview") params.delete("view");
  else params.set("view", view);
  const query = params.toString();
  window.history.replaceState(
    null,
    "",
    query ? `?${query}` : window.location.pathname,
  );
}

interface Props {
  view: View;
  onChange(next: View): void;
}

export function ViewSwitch({ view, onChange }: Props) {
  return (
    <div className="viewswitch" role="group" aria-label="view">
      {ORDER.map((option) => (
        <button
          key={option}
          type="button"
          className={`viewswitch__btn ${view === option ? "is-on" : ""}`}
          aria-pressed={view === option}
          onClick={() => onChange(option)}
        >
          {LABEL[option]}
        </button>
      ))}
    </div>
  );
}
