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
import { RaceLeadIn } from "./RaceLeadIn";
import { PANE_LABEL } from "./terms-copy";
import { readView, ViewSwitch, writeView, type View } from "./ViewSwitch";
import { SelfieCheck } from "./worldid";
import { SCENARIOS, WhoIsAsking } from "./WhoIsAsking";

/**
 * Where the demo starts, not where it is stuck. The field is editable and the
 * city travels to the gateway; what comes back is read off the response, so the
 * screen never claims a city the desk did not actually quote.
 */
const CITIES = [
  { value: "lisbon", label: "Lisbon" },
  { value: "munich", label: "Munich" },
  { value: "paris", label: "Paris" },
  { value: "madrid", label: "Madrid" },
] as const;

const DEFAULT_CITY = CITIES[0].value;

/** Until World AgentKit/Selfie lands — not a prize-complete PoH. */
const STAND_IN: CredentialState = { status: "stand_in" };

const IDLE: PaneState = {
  status: "idle",
  data: null,
  error: null,
  spentUsd: 0,
  paymentTxUrl: null,
};

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

/**
 * Privy session bridge: after connect + SIWE, put the live wallet into the
 * address field, expose getAccessToken, and fire onConnected once so both
 * race lanes run automatically — the connect is the consent.
 */
function PrivySessionBridge({
  onAddress,
  onWallet,
  onConnected,
  busy,
  accessTokenRef,
}: {
  onAddress: (a: string) => void;
  /** Live Privy wallet, or null when logged out — drives "run my wallet". */
  onWallet: (a: string | null) => void;
  /** Fired once per connected address when the race is idle. */
  onConnected: (address: string) => void;
  busy: boolean;
  accessTokenRef: React.MutableRefObject<() => Promise<string | null>>;
}) {
  const { ready, address, authenticated, getAccessToken } = useConsentedWallet();
  /** Last address we auto-ran for; cleared on logout so reconnect fires again. */
  const ranFor = useRef<string | null>(null);

  accessTokenRef.current = async () => {
    if (!authenticated) return null;
    return getAccessToken();
  };

  useEffect(() => {
    if (!ready || !authenticated || !address) {
      onWallet(null);
      if (!authenticated) ranFor.current = null;
      return;
    }
    onAddress(address);
    onWallet(address);
  }, [ready, authenticated, address, onAddress, onWallet]);

  useEffect(() => {
    if (!ready || !authenticated || !address || busy) return;
    const key = address.toLowerCase();
    if (ranFor.current === key) return;
    ranFor.current = key;
    onConnected(address);
  }, [ready, authenticated, address, busy, onConnected]);

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
  /** Privy-authenticated wallet only — null when disconnected. */
  const [myWallet, setMyWallet] = useState<string | null>(null);
  const [city, setCity] = useState<string>(DEFAULT_CITY);
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
  // The lead-in names the right lane by the card that was picked, so the two
  // columns are labelled with the choice the reader just made rather than with
  // an address they would have to recognise.
  const backedWho = useMemo(() => {
    const at = address.trim().toLowerCase();
    return SCENARIOS.find((s) => s.input.toLowerCase() === at)?.who ?? null;
  }, [address]);

  const reducedMotion = usePrefersReducedMotion();
  const running = bot.status === "working" || backed.status === "working";
  const accessTokenRef = useRef<() => Promise<string | null>>(async () => null);

  // The one room both lanes were quoted. Marked in both lists so the comparison
  // is traceable on a single line: same room, same rate, different term.
  const anchorHotelId = useMemo(() => {
    const backedIds = new Set(backed.data?.offers.map((o) => o.hotelId) ?? []);
    return bot.data?.offers.find((o) => backedIds.has(o.hotelId))?.hotelId ?? null;
  }, [bot.data, backed.data]);

  const run = useCallback(
    async (overrideAddress?: string) => {
      const consented = overrideAddress ?? address;
      const start = (set: React.Dispatch<React.SetStateAction<PaneState>>) =>
        set((prev) => ({
          status: "working",
          data: null,
          error: null,
          spentUsd: prev.spentUsd,
          paymentTxUrl: prev.paymentTxUrl,
        }));

      start(setBot);
      start(setBacked);

      const settle = async (
        set: React.Dispatch<React.SetStateAction<PaneState>>,
        opts: {
          credential: boolean;
          address?: string;
          accessToken?: string | null;
        },
      ) => {
        try {
          // Bot lane: only trust spentUsd when the gateway also returns a
          // HashScan tx from the x402 settle receipt — never invent +$0.01.
          const data = await fetchOffers({
            credential: opts.credential,
            address: opts.address,
            city: city.trim() || undefined,
            accessToken: opts.accessToken,
          });
          set((prev) => {
            const paid =
              !opts.credential &&
              typeof data.spentUsd === "number" &&
              Boolean(data.paymentTxUrl);
            return {
              ...prev,
              status: "done",
              data,
              error: null,
              spentUsd: paid
                ? data.spentUsd!
                : opts.credential
                  ? prev.spentUsd
                  : prev.spentUsd,
              paymentTxUrl: data.paymentTxUrl ?? prev.paymentTxUrl,
            };
          });
        } catch (err) {
          set((prev) => ({
            ...prev,
            status: "failed",
            error: (err as Error).message,
          }));
        }
      };

      // Privy access token on the backed lane only — separate axis from World.
      const accessToken = await accessTokenRef.current();

      await Promise.all([
        settle(setBot, { credential: false }),
        settle(setBacked, {
          credential: hasCredential(credential),
          address: consented || undefined,
          accessToken,
        }),
      ]);
    },
    [address, city, credential],
  );

  useEffect(() => writeView(view), [view]);

  const onWalletConnected = useCallback(
    (walletAddress: string) => {
      void run(walletAddress);
    },
    [run],
  );

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
      {privyConfigured ? (
        <PrivySessionBridge
          onAddress={setAddress}
          onWallet={setMyWallet}
          onConnected={onWalletConnected}
          busy={running}
          accessTokenRef={accessTokenRef}
        />
      ) : null}
      <ConnectWalletButton onAddress={setAddress} />
      <SelfieCheck />

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
            {/* The recurring line still opens the story, but it is a claim about
              * the mechanism and a stranger cannot act on it yet. It sits above
              * the headline rather than being it. */}
            <p className="kicker">
              who is behind an agent changes the terms it gets
            </p>
            <h1 className="thesis">book a hotel, or let an agent book it for you</h1>
            {/* What the thing is, before what is clever about it. Someone who
              * reads only this paragraph should be able to say what BookerBob
              * sells and what is unusual about it. */}
            <p className="thesis__plain">
              BookerBob is a hotel booking desk that serves people and ai agents
              from the same inventory. same rooms, same nightly rate for
              everyone. what changes is when the money leaves your pocket, and
              that depends on who is standing behind the booking.
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
            <select
              id="city"
              className="ask__city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              aria-label="city"
            >
              {CITIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </form>
          {/* In the human view this is the escape hatch, so it belongs after the
            * cards it is an alternative to, not before them. In the machine view
            * there are no cards, so it stays here as the only way in. */}
          {view === "machine" ? (
            <AddressBands
              value={address}
              onChange={setAddress}
              onSubmit={(override) => void run(override)}
              disabled={running}
              myWallet={myWallet}
            />
          ) : null}
        </div>
      </header>

      {view === "human" ? (
        <>
          <WhoIsAsking
            value={address}
            onPick={(input) => {
              setAddress(input);
              void run(input);
            }}
            disabled={running}
          />
          <div className="anywallet">
            <AddressBands
              value={address}
              onChange={setAddress}
              onSubmit={(override) => void run(override)}
              disabled={running}
              showChips={false}
              label="or put any wallet behind it"
              myWallet={myWallet}
            />
          </div>
        </>
      ) : null}

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
      <RaceLeadIn
        asked={city}
        answered={backed.data ?? bot.data}
        backedWho={backedWho}
      />

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

      {/* Moved below the race. It reads as a footnote on what just took part,
        * which is what it is, and above the lanes it was a strip of partner
        * logos standing between choosing a person and seeing the result. */}
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
