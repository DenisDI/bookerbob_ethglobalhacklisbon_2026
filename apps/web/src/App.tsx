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
import {
  credentialLabel,
  hasCredential,
  type CredentialState,
} from "./credential";
import { PipelineStatus, PipelineStatusGuest } from "./PipelineStatus";
import { RacePane, type PaneState } from "./RacePane";
import { PANE_LABEL } from "./terms-copy";

const PROMPT = "book me a hotel in lisbon";

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

function PipelineWithWallet({
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
    <PipelineStatus
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
  // Product race uses stand-in until World wires verified.
  const [credential] = useState<CredentialState>(STAND_IN);
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
          const data = await fetchOffers({
            credential: opts.credential,
            address: opts.address,
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
    [address, credential],
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
      {privyConfigured ? <PrivyAddressBridge onAddress={setAddress} /> : null}
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

      {privyConfigured ? (
        <PipelineWithWallet
          credential={credential}
          addressField={address}
          backed={backed}
        />
      ) : (
        <PipelineStatusGuest
          credential={credential}
          addressField={address}
          backed={backed}
        />
      )}

      <p className="pipe-hint mono">
        backed axis: {credentialLabel(credential)}
        {address.trim() ? ` · graph address ${address.trim()}` : ""}
      </p>

      <div className="racehead">
        <span className="label">the race</span>
        <span className="pane__spacer" />
        <span className="label">one prompt · two agents</span>
        <span className="dot dot--signal pulse" aria-hidden="true" />
        <span className="racehead__rec label">rec</span>
      </div>

      <div className="prompt-band">
        <p className="prompt-band__text">{PROMPT}</p>
      </div>

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
    </main>
  );
}
