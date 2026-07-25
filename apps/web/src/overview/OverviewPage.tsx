// The overview: what you get, and how to get it.
//
// This page used to open by describing its own mechanism. "Nothing below is
// required and the order does not matter" is true, and it offers the reader
// nothing: it explains how the engine is built instead of what the next step is
// worth. The ladder replaces it, and every step is named by its reward first and
// its cost second.
//
// GUIDED, NOT GATED. The engine really does take these steps in any order, so
// nothing here blocks anything. It guides instead: exactly one step is primary at
// a time, recomputed from what has actually been proved, and the other stays quiet
// and fully usable.
//
// The state worth building around is the awkward one. A wallet connected with no
// personhood proved comes back with the bands fully read and the terms completely
// unmoved, because decide() refuses to extend anything on trust before somebody is
// answerable. That is not a dead end and it is not a lecture: it is one step from
// paying off, and the ladder and the panel both say so in those words.
//
// TWO DOORS, both first class. A person books here. An agent books through the
// same desk with an AgentKit credential and earns the same thing for the same
// proof. One engine, and the race tab is where the agent side is visible.
//
// One request drives the terms: GET /offers returns the standing, the terms, the
// hold and the Hedera schedule together. The room strip beside it is the local
// city catalog, which is a separate thing and says so.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchOffers } from "../api";
import {
  ConnectWalletButton,
  privyConfigured,
  shortAddress,
  useConsentedWallet,
} from "../auth";
import {
  CITIES,
  DEFAULT_CITY,
  cityLabel,
  pickHotels,
  type CityId,
} from "../cityCatalog";
import { ContextFile } from "../ContextFile";
import { HotelFinaleCard } from "../HotelFinaleCard";
import { OfferList } from "../OfferList";
import { WorldMark } from "../PartnerMarks";
import type { OffersResponse } from "../types";
import { SelfieCheck } from "../worldid";
import { FlowBoundary } from "./FlowBoundary";
import { PerksLadder } from "./PerksLadder";
import { YourTerms } from "./YourTerms";

interface WalletSnap {
  ready: boolean;
  authenticated: boolean;
  address: string | null;
  getAccessToken: (() => Promise<string | null>) | null;
}

const NO_WALLET: WalletSnap = {
  ready: true,
  authenticated: false,
  address: null,
  getAccessToken: null,
};

/** Privy's hook can only be called when Privy is configured, so it lives here. */
function WalletBridge({ onChange }: { onChange: (snap: WalletSnap) => void }) {
  const { ready, address, authenticated, getAccessToken } = useConsentedWallet();
  useEffect(() => {
    onChange({
      ready,
      authenticated,
      address: authenticated ? address : null,
      getAccessToken: authenticated ? getAccessToken : null,
    });
  }, [ready, address, authenticated, getAccessToken, onChange]);
  return null;
}

export function OverviewPage({ onOpenDemo }: { onOpenDemo: () => void }) {
  const [city, setCity] = useState<CityId>(DEFAULT_CITY);
  // What was actually sent to /offers. The room strip flips on `city` immediately.
  const [askedCity, setAskedCity] = useState<string>(DEFAULT_CITY);
  const [wallet, setWallet] = useState<WalletSnap>(NO_WALLET);
  const [personhood, setPersonhood] = useState(false);

  const [data, setData] = useState<OffersResponse | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const address = wallet.address ?? "";
  // Bumped when a step finishes, so the effect re-runs on proof being added even
  // though the token itself lives outside React.
  const run = useRef(0);

  useEffect(() => {
    let live = true;
    setRefreshing(true);

    (async () => {
      try {
        const accessToken = wallet.getAccessToken
          ? await wallet.getAccessToken()
          : null;

        // metered: false on purpose. An unbacked *agent* pays per query and that
        // payment is the point of the race; a person reading this page is not an
        // agent, and charging them for arriving would be absurd.
        const next = await fetchOffers({
          credential: personhood,
          address: address || undefined,
          city: askedCity.trim() || undefined,
          accessToken,
          metered: false,
          // A supplier round trip is about fifteen seconds, so this is generous.
          // Past it the desk is not slow, it is not answering, and the panel
          // should say so instead of reading "asking the desk" forever.
          timeoutMs: 40_000,
        });
        if (!live) return;
        setData(next);
        setError(null);
      } catch (err) {
        if (!live) return;
        // The previous answer stays on screen. Losing it would blank the panel
        // the whole page is built around.
        setError((err as Error).message);
      } finally {
        if (live) setRefreshing(false);
      }
    })();

    return () => {
      live = false;
    };
  }, [askedCity, address, personhood, wallet.getAccessToken]);

  const onWallet = useCallback((snap: WalletSnap) => {
    setWallet((prev) =>
      prev.address === snap.address && prev.authenticated === snap.authenticated
        ? prev
        : snap,
    );
  }, []);

  const onVerified = useCallback(() => {
    run.current += 1;
    setPersonhood(true);
  }, []);

  // Fresh shuffle whenever the city changes — five from a pool of fifteen ★★★★★.
  const cityHotels = useMemo(() => pickHotels(city, 5), [city]);
  const contextRead = Boolean(data?.context);

  // One recommendation at a time, following the biggest jump still available.
  // Proving a person takes the whole stay off the counter, so it leads until it
  // is done, even when a wallet is already connected and read.
  const primary: "person" | "wallet" | null = !personhood
    ? "person"
    : address
      ? null
      : "wallet";

  return (
    <div className="ov">
      {privyConfigured ? <WalletBridge onChange={onWallet} /> : null}

      <header className="ov__hero">
        <div className="ask ask--start">
          <form
            className="ask__prompt"
            onSubmit={(e) => {
              e.preventDefault();
              setAskedCity(city);
            }}
          >
            <label className="ask__said" htmlFor="ov-city">
              book me a hotel in
            </label>
            <select
              id="ov-city"
              className="ask__city ask__city--lg"
              value={city}
              onChange={(e) => {
                const next = e.target.value as CityId;
                setCity(next);
                setAskedCity(next);
              }}
              aria-label="city"
            >
              {CITIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </form>
        </div>
        {/* Right under the city select so a change is visible without scrolling. */}
        <section className="ov__rooms ov__rooms--inline" aria-live="polite">
          <div className="ov__flowhead">
            <h2 className="ov__h2">rooms in {cityLabel(city)}</h2>
            <p className="ov__flowlede">
              five random five-star rooms from the local catalog
            </p>
          </div>
          <OfferList
            offers={cityHotels}
            limit={5}
            accent={Boolean(data && data.terms.payment !== "prepay_100")}
          />
        </section>
        <p className="kicker">who is behind a booking changes the terms it gets</p>
        {/* "for your agent" read as booking the agent a room, which is not what
          * happens: the agent is who does the booking, not who sleeps in it. The
          * line is about who holds the pen. */}
        <h1 className="thesis">book a hotel yourself, or send your agent to do it</h1>
        <p className="thesis__plain">
          one desk, the same rooms at the same nightly rate for people and ai
          agents. what changes is when you pay.
        </p>
        <p className="step__note reason">
          {data
            ? `${data.checkin} to ${data.checkout}${data.nights ? `, ${data.nights} nights` : ""}`
            : `five-star rooms in ${cityLabel(city)}`}
        </p>
      </header>

      {/* Two doors, and neither is a footnote. The product is a gateway for
        * agents that a person can also walk up to. */}
      <section className="doors">
        <div className="door door--here">
          <p className="door__who label">you are here</p>
          <p className="door__title">book it yourself</p>
          <p className="door__note">
            prove who is behind the booking below, and the terms move as you go.
          </p>
        </div>
        <div className="door">
          <p className="door__who label">the other door</p>
          <p className="door__title">hand it to an agent</p>
          <p className="door__note">
            an agent proves the same thing with an AgentKit credential, and earns
            the same terms for it.
          </p>
          <button type="button" className="door__go" onClick={onOpenDemo}>
            watch two agents book
          </button>
        </div>
        <p className="doors__one">
          one engine behind both doors. a booking a real person stands behind gets
          the same terms whether that person is you, or the human behind an agent.
        </p>
      </section>

      {/* The main element, and it is up before any answer lands. The three beats
        * that used to sit here said the same mechanism as a lecture; the ladder
        * says it as rewards, which is what a reader can act on. */}
      <PerksLadder
        payment={data?.terms.payment ?? null}
        personhood={personhood}
        wallet={Boolean(address)}
        contextRead={contextRead}
        reason={data?.reason ?? null}
        scheduleUrl={data?.scheduleUrl ?? null}
      />

      <section className="ov__flow">
        <div className="ov__cols">
          <div className="ov__steps">
            {/* Headed by the reward, not the chore, and the recommended one is
              * primary. Guidance only: the other stays fully usable, because the
              * engine takes these in any order. */}
            <section className={`step ${primary === "person" ? "step--primary" : ""}`}>
              <h3 className="step__perk partner">
                <WorldMark size={13} />
                stop paying the whole stay up front
              </h3>
              <p className="step__note reason">
                {address && !personhood
                  ? "your history is read. one step to cash it in."
                  : "proves a person, not which person."}
              </p>
              {/* Guarded: this widget has thrown on mount and taken the page with
                * it, and a booking with one step down beats a blank screen. */}
              <FlowBoundary fallback="the personhood check is not available right now, so this stays on a stranger's terms">
                <SelfieCheck onVerified={onVerified} />
              </FlowBoundary>
            </section>

            <section className={`step ${primary === "wallet" ? "step--primary" : ""}`}>
              <h3 className="step__perk">see what your history opens</h3>
              <p className="step__note reason">
                read as coarse bands, and nothing is taken from it.
              </p>
              {privyConfigured ? (
                <>
                  <ConnectWalletButton />
                  {address ? (
                    <p className="step__note mono">reading {shortAddress(address)}</p>
                  ) : null}
                </>
              ) : (
                <p className="step__down reason">
                  wallet connect is not configured on this build, so a history
                  cannot be read here
                </p>
              )}
            </section>

            {data?.context ? <ContextFile context={data.context} /> : null}
          </div>

          <div className="ov__panel">
            <YourTerms
              data={data}
              refreshing={refreshing}
              error={error}
              personhood={personhood}
              wallet={Boolean(address)}
            />
          </div>
        </div>
      </section>

      {data?.hold && data.offers[0] ? (
        <section className="finale-frame">
          <div className="finale-frame__cap">
            <span className="label">your hold</span>
            <span className="reason">
              a real room held at a real rate, and a real scheduled settlement
            </span>
          </div>
          <HotelFinaleCard
            offer={data.offers[0]}
            hold={data.hold}
            checkin={data.checkin}
            checkout={data.checkout}
            nights={data.nights}
            matchingCount={data.matchingCount}
            city={data.city}
            bookedFor={data.context?.ens?.name ?? data.context?.address ?? null}
            cached={data.source === "cached"}
            scheduleUrl={data.scheduleUrl}
          />
        </section>
      ) : data && !refreshing ? (
        <section className="ov__nohold">
          <p className="reason">
            no price is held on these terms: the stay is paid before it starts, so
            there is nothing to hold and nothing to schedule.
          </p>
        </section>
      ) : null}

      <footer className="foot">
        <p>
          same rooms, same nightly rate. what changes is who carries the risk
          between booking and the stay. the demo tab runs this same request as two
          agents at once, so the difference is visible side by side.
        </p>
      </footer>
    </div>
  );
}
