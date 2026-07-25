// The race. One prompt, two agents, and the only difference between them is
// who is accountable for the request.

import { useCallback, useEffect, useRef, useState } from "react";
import { AddressBands } from "./AddressBands";
import { fetchOffers } from "./api";
import { RacePane, type PaneState } from "./RacePane";
import { PANE_LABEL } from "./terms-copy";
import type { Tier } from "./types";
import { ConnectWalletButton } from "./auth";

const PROMPT = "book me a hotel in lisbon";

/** Metered queries cost a cent each; only the unbacked agent pays them. */
const QUERY_PRICE_USD = 0.01;

const IDLE: PaneState = { status: "idle", data: null, error: null, spentUsd: 0 };

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const onChange = () => setReduced(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

export function App() {
  const [bot, setBot] = useState<PaneState>(IDLE);
  const [backed, setBacked] = useState<PaneState>(IDLE);
  const [address, setAddress] = useState("");
  const reducedMotion = usePrefersReducedMotion();
  const running = bot.status === "working" || backed.status === "working";

  const run = useCallback(async (overrideAddress?: string) => {
    // Only the backed side carries an address. The unbacked agent has nobody to
    // consent on its behalf, so asking about a wallet there would be theatre.
    const consented = overrideAddress ?? address;
    const start = (
      set: React.Dispatch<React.SetStateAction<PaneState>>,
      charge: boolean,
    ) =>
      set((prev) => ({
        status: "working",
        data: null,
        error: null,
        spentUsd: charge ? prev.spentUsd + QUERY_PRICE_USD : prev.spentUsd,
      }));

    start(setBot, true);
    start(setBacked, false);

    const settle = async (
      tier: Tier,
      set: React.Dispatch<React.SetStateAction<PaneState>>,
      consentedAddress?: string,
    ) => {
      try {
        const data = await fetchOffers(tier, consentedAddress);
        set((prev) => ({ ...prev, status: "done", data, error: null }));
      } catch (err) {
        set((prev) => ({
          ...prev,
          status: "failed",
          error: (err as Error).message,
        }));
      }
    };

    // Fired together on purpose: the race is the point. The backed side asks as
    // a credentialed human and lets the real bands decide whether that becomes
    // verified or elite; the tier is derived, never asserted.
    await Promise.all([
      settle("bot", setBot),
      settle("human", setBacked, consented),
    ]);
  }, [address]);

  // ?autorun starts the race on load and ?address= preloads the consented
  // wallet, so every beat of the demo is reachable in one step without setting it
  // up by hand between takes (specs/03-web-demo.md). Guarded because a
  // double-invoked effect would bill the metered agent twice.
  const autorun = useRef(false);
  useEffect(() => {
    if (autorun.current) return;
    const params = new URLSearchParams(window.location.search);
    if (!params.has("autorun")) return;
    autorun.current = true;
    const preset = params.get("address") ?? "";
    if (preset) setAddress(preset);
    void run(preset);
  }, [run]);

  return (
    <main className="page">
      <ConnectWalletButton />
      <header className="masthead">
        <h1 className="thesis">who is behind an agent changes the terms it gets</h1>
        <div className="ask">
          <p className="ask__prompt">{PROMPT}</p>
          <AddressBands
            value={address}
            onChange={setAddress}
            onSubmit={(override) => void run(override)}
            disabled={running}
          />
        </div>
      </header>

      <div className="race">
        <RacePane
          label={PANE_LABEL.bot}
          accent={false}
          state={bot}
          reducedMotion={reducedMotion}
        />
        <RacePane
          label={PANE_LABEL.backed}
          accent
          state={backed}
          reducedMotion={reducedMotion}
        />
      </div>

      <footer className="foot">
        <p>
          same rooms, same nightly rate. what changes is who carries the risk
          between booking and the stay.
        </p>
      </footer>
    </main>
  );
}
