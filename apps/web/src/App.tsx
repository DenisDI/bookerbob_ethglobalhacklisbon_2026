// The race. One prompt, two agents, and the only difference between them is
// who is accountable for the request.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AddressBands } from "./AddressBands";
import { fetchOffers, fetchSpent } from "./api";
import {
  CITIES,
  DEFAULT_CITY,
  hotelsForCity,
} from "./cityCatalog";
import { HotelFinaleCard } from "./HotelFinaleCard";
import {
  ConnectWalletButton,
  privyConfigured,
  useConsentedWallet,
} from "./auth";
import { hasCredential, type CredentialState } from "./credential";
import { MachineView } from "./machine";
import { OfferList } from "./OfferList";
import { OverviewPage } from "./overview";
import { ParticipantsBand, ParticipantsBandGuest } from "./ParticipantsBand";
import { RacePane, type PaneState } from "./RacePane";
import { RaceLeadIn } from "./RaceLeadIn";
import { PANE_LABEL } from "./terms-copy";
import { readView, ViewSwitch, writeView, type View } from "./ViewSwitch";
import { SelfieCheck } from "./worldid";
import { SCENARIOS, WhoIsAsking } from "./WhoIsAsking";

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
  const cityHotels = useMemo(() => hotelsForCity(city), [city]);
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
  /** Cumulative ledger reading taken before the last race, so the counter can
   * show this race's share of it rather than the server's whole history. */
  const ledgerBaseline = useRef<number | null>(null);

  // The one room both lanes were quoted. Marked in both lists so the comparison
  // is traceable on a single line: same room, same rate, different term.
  const anchorHotelId = useMemo(() => {
    const backedIds = new Set(backed.data?.offers.map((o) => o.hotelId) ?? []);
    return bot.data?.offers.find((o) => backedIds.has(o.hotelId))?.hotelId ?? null;
  }, [bot.data, backed.data]);

  const run = useCallback(
    async (overrideAddress?: string) => {
      const consented = overrideAddress ?? address;
      // Both counters start this race at zero. The lane shows what THIS race
      // spent, so carrying the previous race's number into the next one would be
      // the same lie in a smaller form.
      const start = (set: React.Dispatch<React.SetStateAction<PaneState>>) =>
        set(() => ({
          status: "working",
          data: null,
          error: null,
          spentUsd: 0,
          paymentTxUrl: null,
        }));

      start(setBot);
      start(setBacked);

      // The gateway's ledger is cumulative for the life of the process, so the
      // number it returns is every query anyone has ever paid for on this demo
      // wallet. Rendered as this race's spend it read "$0.37 · 37 QUERIES" on a
      // visitor's first run, which says a single search cost thirty-seven cents
      // and breaks the one claim the lane exists to make. Take a reading before
      // the race and show the difference.
      try {
        const before = await fetchSpent();
        ledgerBaseline.current = before.totalUsd;
      } catch {
        // Keep the last reading we trusted. On a first run with /spent down
        // there is nothing to subtract, which lands on today's behaviour rather
        // than on a worse one.
      }
      const baseline = ledgerBaseline.current ?? 0;

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
            // The response carries the running total; what this race spent is
            // the part of it that was not there a moment ago. Floored at zero
            // because a restarted gateway resets the ledger under us.
            if (paid) ledgerBaseline.current = data.spentUsd!;
            return {
              ...prev,
              status: "done",
              data,
              error: null,
              spentUsd: paid
                ? Math.max(0, Number((data.spentUsd! - baseline).toFixed(4)))
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
      {/* The overview carries its own personhood step inside the flow, where it
        * has a job and an explanation. Two of these would both mount. */}
      {view === "overview" ? null : <SelfieCheck />}

      {/* Every surface hangs off this bar, so the switch is in the same place in
        * all of them and the product is named once. */}
      <div className="topbar">
        <span className="wordmark">BookerBob</span>
        <ViewSwitch view={view} onChange={setView} />
        <span className="topbar__note">one desk, people and agents</span>
      </div>

      {view === "overview" ? <OverviewPage /> : (
        <>
      {/* The ask is shared: the machine view runs the same request, so it needs
        * the same controls. The pitch above it is not, because the overview now
        * carries the argument and neither of these two surfaces has to repeat it. */}
      <header className={`masthead ${view === "machine" ? "masthead--machine" : ""}`}>
        {view === "demo" ? (
          <div className="masthead__lede">
            {/* Short, because this is a tab someone navigated to rather than the
              * front door. The overview makes the case; this one runs it. */}
            <p className="kicker">demo</p>
            <h1 className="thesis thesis--demo">
              the same request, run as two agents at once
            </h1>
            <p className="thesis__plain">
              one of them has nobody behind it. pick who stands behind the other,
              and watch what changes between them. the rooms and the nightly rate
              are the same in both.
            </p>
          </div>
        ) : null}
        <div className="ask ask--end">
          {/* City select sits on the right of the masthead. The four rooms below
            * flip from the local catalog the moment the city changes — before
            * either lane has finished quoting. */}
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
          <div className="ask__hotels">
            <OfferList offers={cityHotels} limit={4} />
          </div>
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

      {view === "demo" ? (
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
        </>
      )}
    </main>
  );
}
