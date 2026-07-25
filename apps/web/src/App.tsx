// The race. One prompt, two agents, and the only difference between them is
// who is accountable for the request.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AddressBands } from "./AddressBands";
import { fetchOffers } from "./api";
import { HotelFinaleCard } from "./HotelFinaleCard";
import {
  ConnectWalletButton,
  privyConfigured,
  useConsentedWallet,
} from "./auth";
import { hasCredential, type CredentialState } from "./credential";
import { MachineView } from "./machine";
import { ParticipantsBand, ParticipantsBandGuest } from "./ParticipantsBand";
import { RacePane, type PaneState } from "./RacePane";
import { SaidOnce } from "./SaidOnce";
import { PANE_LABEL } from "./terms-copy";
import { readView, ViewSwitch, writeView, type View } from "./ViewSwitch";

/**
 * Where the demo starts, not where it is stuck. The field is editable and the
 * city travels to the gateway; what comes back is read off the response, so the
 * screen never claims a city the desk did not actually quote.
 */
const DEFAULT_CITY = "lisbon";

/** Metered queries cost a cent each; only the unbacked agent pays them. */
const QUERY_PRICE_USD = 0.01;

/** Until World AgentKit/Selfie lands — not a prize-complete PoH. */
const STAND_IN: CredentialState = { status: "stand_in" };

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

/** When Privy connects, fill the Graph context address field. */
function PrivyAddressBridge({ onAddress }: { onAddress: (a: string) => void }) {
  const { address, authenticated } = useConsentedWallet();
  useEffect(() => {
    if (authenticated && address) onAddress(address);
  }, [authenticated, address, onAddress]);
  return null;
}

function ParticipantsWithWallet({
  credential,
  addressField,
  backed,
}: {
  credential: CredentialState;
  addressField: string;
  backed: PaneState;
}) {
  const wallet = useConsentedWallet();
  return (
    <ParticipantsBand
      wallet={{
        ready: wallet.ready,
        authenticated: wallet.authenticated,
        address: wallet.address,
      }}
      credential={credential}
      addressField={addressField}
      backed={backed}
    />
  );
}

export function App() {
  const [bot, setBot] = useState<PaneState>(IDLE);
  const [backed, setBacked] = useState<PaneState>(IDLE);
  const [address, setAddress] = useState("");
  const [city, setCity] = useState(DEFAULT_CITY);
  // Read from the URL on first paint so a machine-view link opens on it.
  const [view, setView] = useState<View>(() => readView(window.location.search));
  // Product race uses stand-in until World wires verified.
  // The server owns this. The browser may ask with a stand-in, but only the
  // gateway can say the credential was verified by World, because only it saw
  // the signed header and the AgentBook answer.
  const [asked] = useState<CredentialState>(STAND_IN);
  const credential: CredentialState = useMemo(() => {
    const said = backed.data?.credential;
    if (said?.status === "verified" && said.source) {
      return { status: "verified", source: said.source };
    }
    if (said?.status === "missing") return { status: "missing" };
    return asked;
  }, [backed.data, asked]);
  const reducedMotion = usePrefersReducedMotion();
  const running = bot.status === "working" || backed.status === "working";

  // The one room both lanes were quoted. Marked in both lists so the comparison
  // is traceable on a single line: same room, same rate, different term.
  const anchorHotelId = useMemo(() => {
    const backedIds = new Set(backed.data?.offers.map((o) => o.hotelId) ?? []);
    return bot.data?.offers.find((o) => backedIds.has(o.hotelId))?.hotelId ?? null;
  }, [bot.data, backed.data]);

  const run = useCallback(
    async (overrideAddress?: string) => {
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
        set: React.Dispatch<React.SetStateAction<PaneState>>,
        opts: { credential: boolean; address?: string },
      ) => {
        try {
          // No debugTier — final tier comes only from decide() + live Graph.
          // Both lanes get the same city: one prompt is the whole premise.
          const data = await fetchOffers({
            credential: opts.credential,
            address: opts.address,
            city: city.trim() || undefined,
          });
          set((prev) => ({ ...prev, status: "done", data, error: null }));
        } catch (err) {
          set((prev) => ({
            ...prev,
            status: "failed",
            error: (err as Error).message,
          }));
        }
      };

      await Promise.all([
        settle(setBot, { credential: false }),
        settle(setBacked, {
          credential: hasCredential(credential),
          address: consented || undefined,
        }),
      ]);
    },
    [address, city, credential],
  );

  useEffect(() => writeView(view), [view]);

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
      {privyConfigured ? <PrivyAddressBridge onAddress={setAddress} /> : null}
      <ConnectWalletButton />

      {/* Both views hang off this bar, so the switch is in the same place in
        * either one and the product is named once. */}
      <div className="topbar">
        <span className="wordmark">BookerBob</span>
        <ViewSwitch view={view} onChange={setView} />
        <span className="topbar__note">the same request, told twice</span>
      </div>

      {/* The ask is shared: the machine view runs the same request, so it needs
        * the same controls. The human pitch above it is not, because the machine
        * view carries its own title and does not argue. */}
      <header className={`masthead ${view === "machine" ? "masthead--machine" : ""}`}>
        {view === "human" ? (
          <div className="masthead__lede">
            <h1 className="thesis">who is behind an agent changes the terms it gets</h1>
            {/* The thesis is the claim. This is the same claim in the words a
              * guest would use, so a stranger who reads only these two blocks
              * knows what the product does. */}
            <p className="thesis__plain">
              an ai agent books the hotel room for you. same room, same nightly
              rate for everyone. what changes is when the money leaves your
              pocket, and that depends on who is standing behind the agent.
            </p>
          </div>
        ) : null}
        <div className="ask">
          {/* The request itself, and it is a real field: the city travels to the
            * desk. Enter runs the race, the same as the button below. */}
          <form
            className="ask__prompt"
            onSubmit={(e) => {
              e.preventDefault();
              if (!running) void run();
            }}
          >
            <label className="ask__said" htmlFor="city">
              book me a hotel in
            </label>
            <input
              id="city"
              className="ask__city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="a city"
              spellCheck={false}
              autoComplete="off"
              size={Math.max(6, city.length + 1)}
            />
          </form>
          <AddressBands
            value={address}
            onChange={setAddress}
            onSubmit={(override) => void run(override)}
            disabled={running}
          />
        </div>
      </header>

      {view === "machine" ? (
        <MachineView
          city={city}
          address={address}
          credential={credential}
          bot={bot}
          backed={backed}
          running={running}
          onRun={() => void run()}
        />
      ) : (
        <>
      {privyConfigured ? (
        <ParticipantsWithWallet
          credential={credential}
          addressField={address}
          backed={backed}
        />
      ) : (
        <ParticipantsBandGuest
          credential={credential}
          addressField={address}
          backed={backed}
        />
      )}

      <div className="racehead">
        <span className="label">the race</span>
        <span className="pane__spacer" />
        <span className="label">one prompt · two agents</span>
        <span className="dot dot--signal pulse" aria-hidden="true" />
        <span className="racehead__rec label">rec</span>
      </div>

      <SaidOnce asked={city} answered={backed.data ?? bot.data} />

      <div className="race">
        <RacePane
          label={PANE_LABEL.bot}
          accent={false}
          state={bot}
          reducedMotion={reducedMotion}
          anchorHotelId={anchorHotelId}
        />
        <RacePane
          label={PANE_LABEL.backed}
          accent
          state={backed}
          reducedMotion={reducedMotion}
          anchorHotelId={anchorHotelId}
        />
        <div className="pane__divider" aria-hidden="true" />
      </div>

      {/* The finale is its own beat. Inside a lane it would compete with the
        * room list and bury the anchored comparison; here it is the money shot,
        * and it only exists when a real hold does. */}
      {backed.data?.hold && backed.data.offers[0] ? (
        <section className="finale-frame">
          <div className="finale-frame__cap">
            <span className="label">the finale</span>
            <span className="reason">a real hold, a real scheduled settlement</span>
          </div>
          <HotelFinaleCard
            offer={backed.data.offers[0]}
            hold={backed.data.hold}
            checkin={backed.data.checkin}
            checkout={backed.data.checkout}
            nights={backed.data.nights}
            matchingCount={backed.data.matchingCount}
            city={backed.data.city}
            bookedFor={
              backed.data.context?.ens?.name ?? backed.data.context?.address ?? null
            }
            cached={backed.data.source === "cached"}
            scheduleUrl={backed.data.scheduleUrl}
          />
        </section>
      ) : null}

      <footer className="foot">
        <p>
          same rooms, same nightly rate. what changes is who carries the risk
          between booking and the stay.
        </p>
      </footer>
        </>
      )}
    </main>
  );
}
