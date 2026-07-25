// One product, two truths about the same request.
//
// The human view is the shop window: narration, a timeline, a room with a photo.
// The machine view is what the service actually is, because BookerBob is a gateway
// for agents and an agent does not read a screen. It reads a challenge and a typed
// response. Neither view is a mock of the other; both are the same run, described
// at the layer their reader lives on.
//
// The switch stays in the URL so a given view can be linked, filmed, or reloaded
// into without clicking twice.

export type View = "human" | "machine";

const LABEL: Record<View, string> = {
  human: "human view",
  machine: "machine view",
};

const ORDER: View[] = ["human", "machine"];

export function readView(search: string): View {
  return new URLSearchParams(search).get("view") === "machine" ? "machine" : "human";
}

/** Keeps the address bar honest about which view is on screen. */
export function writeView(view: View): void {
  const params = new URLSearchParams(window.location.search);
  if (view === "machine") params.set("view", "machine");
  else params.delete("view");
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
