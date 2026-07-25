// The overview: what this is, and your own booking.
//
// The race argues, and it argues well, but it argued before it explained. This
// surface explains, and then lets the reader do the thing themselves rather than
// watch two agents do it.
//
// THE MECHANIC. Every step here is optional and they can be added in either
// order, because the engine genuinely works that way and a forced wizard would be
// a lie about it. What holds the page together is one panel that never unmounts
// and always names the binding constraint, taken from the gateway's own words.
//
// The state worth building the page around is the awkward one: a wallet connected
// with no personhood proved comes back with the bands fully read and the terms
// completely unmoved, because decide() refuses to extend anything on trust before
// somebody is answerable. "We can see everything you have done and it buys you
// nothing yet" is the product's whole thesis, said by the engine rather than by us.
//
// One request drives all of it. GET /offers already returns the standing, the
// terms, the rooms, the hold and the Hedera schedule together, so nothing here
// needed a new endpoint.

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchOffers } from "../api";
import {
  ConnectWalletButton,
  privyConfigured,
  shortAddress,
  useConsentedWallet,
} from "../auth";
import { ContextFile } from "../ContextFile";
import { HotelFinaleCard } from "../HotelFinaleCard";
import { OfferList, OfferSkeleton } from "../OfferList";
import { HederaMark, TheGraphMark, WorldMark } from "../PartnerMarks";
import { inventoryLine } from "../terms-copy";
import type { OffersResponse } from "../types";
import { SelfieCheck } from "../worldid";
import { FlowBoundary } from "./FlowBoundary";
import { YourTerms } from "./YourTerms";

const DEFAULT_CITY = "lisbon";

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

export function OverviewPage() {
  const [city, setCity] = useState(DEFAULT_CITY);
  // What was actually sent. Typing does not fire a supplier round trip; asking does.
  const [askedCity, setAskedCity] = useState(DEFAULT_CITY);
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

  const limit = data?.terms.inventory === "basic" ? 3 : 5;

  return (
    <div className="ov">
      {privyConfigured ? <WalletBridge onChange={onWallet} /> : null}

      <header className="ov__hero">
        <p className="kicker">who is behind an agent changes the terms it gets</p>
        <h1 className="thesis">book a hotel, or let an agent book it for you</h1>
        <p className="thesis__plain">
          BookerBob is a hotel booking desk that serves people and ai agents from
          the same inventory. same rooms, same nightly rate for everyone. what
          changes is when the money leaves your pocket, and that depends on who is
          standing behind the booking.
        </p>
      </header>

      {/* Three beats, each carrying the mark of whoever does that piece of work.
        * Placed at the step rather than banded across the top. */}
      <section className="ov__how">
        <h2 className="ov__h2">how the desk decides</h2>
        <ol className="ov__beats">
          <li className="ov__beat">
            <span className="ov__beatmark partner">
              <WorldMark size={14} />
              <span className="label">world</span>
            </span>
            <p className="ov__beattitle">is a real person asking</p>
            <p className="ov__beattext">
              an anonymous request pays for the whole stay before anyone holds a
              room. a request a person stands behind leaves a deposit instead.
            </p>
          </li>
          <li className="ov__beat">
            <span className="ov__beatmark partner">
              <TheGraphMark size={13} />
              <span className="label">the graph</span>
            </span>
            <p className="ov__beattitle">what have they done before</p>
            <p className="ov__beattext">
              a connected wallet is read as coarse bands, never as numbers. time
              cannot be bought back, and that is most of what this is measuring.
            </p>
          </li>
          <li className="ov__beat">
            <span className="ov__beatmark partner">
              <HederaMark size={14} />
              <span className="label">hedera</span>
            </span>
            <p className="ov__beattitle">when does the money move</p>
            <p className="ov__beattext">
              a long clean record means nothing moves until checkout, and the
              payment is scheduled up front so the desk is not taking your word.
            </p>
          </li>
        </ol>
      </section>

      <section className="ov__flow">
        <div className="ov__flowhead">
          <h2 className="ov__h2">your booking</h2>
          <p className="ov__flowlede">
            nothing below is required and the order does not matter. add what you
            like and watch the terms on the right move, or add nothing and book on
            the terms a stranger gets.
          </p>
        </div>

        <div className="ov__cols">
          <div className="ov__steps">
            <section className="step">
              <h3 className="step__title">where and when</h3>
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
                <input
                  id="ov-city"
                  className="ask__city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="a city"
                  spellCheck={false}
                  autoComplete="off"
                  size={Math.max(6, city.length + 1)}
                />
              </form>
              <p className="step__note reason">
                {data
                  ? `${data.checkin} to ${data.checkout}${data.nights ? `, ${data.nights} nights` : ""}`
                  : "the demo window is fixed for now"}
              </p>
            </section>

            <section className="step">
              <h3 className="step__title partner">
                <WorldMark size={13} />
                prove you are a person
              </h3>
              <p className="step__note reason">
                this is the step that stops the whole stay having to be paid up
                front. it proves a person, and nothing about which person.
              </p>
              {/* Guarded: this widget has thrown on mount and taken the page with
                * it, and five working steps beat a blank screen. */}
              <FlowBoundary fallback="the personhood check is not available right now, so the rest of this stays on a stranger's terms">
                <SelfieCheck onVerified={onVerified} />
              </FlowBoundary>
            </section>

            <section className="step">
              <h3 className="step__title">connect your wallet</h3>
              <p className="step__note reason">
                it is read for what it has done, and nothing is taken from it
                here.
              </p>
              {privyConfigured ? (
                <>
                  <ConnectWalletButton />
                  {wallet.address ? (
                    <p className="step__note mono">
                      reading {shortAddress(wallet.address)}
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="step__down reason">
                  wallet connect is not configured on this build, so standing
                  cannot be read here
                </p>
              )}
            </section>

            {data?.context ? (
              <section className="step">
                <h3 className="step__title">what you have done</h3>
                <ContextFile context={data.context} />
              </section>
            ) : null}
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

      <section className="ov__rooms">
        <div className="ov__flowhead">
          <h2 className="ov__h2">rooms at your terms</h2>
          {data ? (
            <p className="ov__flowlede">
              {inventoryLine(data.terms, Math.min(data.offers.length, limit))}
              {data.source === "cached" ? ", from a saved snapshot" : ""}
            </p>
          ) : null}
        </div>

        {!data && refreshing ? <OfferSkeleton /> : null}

        {data ? (
          <OfferList
            offers={data.offers}
            limit={limit}
            accent={data.terms.payment !== "prepay_100"}
          />
        ) : null}
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
