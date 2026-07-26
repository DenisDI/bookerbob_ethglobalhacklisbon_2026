// MACHINE VIEW: the handshake, as the agent experiences it.
//
// BookerBob is a gateway for agents. The race is the shop window; this is the
// product. An agent does not read a narration feed, it reads a challenge and a
// typed response, so this view shows the exchange itself: what it asked, what it
// was told it had to do first, what it sent back, and what it got.
//
// Both paths are the same run. The transcript is built from the very response the
// race received, one lane each, which is why switching path here is not switching
// example: it is looking at the other half of one comparison.
//
// The first two frames are identical on both paths on purpose. One anonymous ask,
// one challenge that advertises both ways forward. Everything after frame 02 is the
// consequence of which way the agent took, and that is the whole product in
// protocol form.

import { useState } from "react";
import type { CredentialState } from "../credential";
import type { PaneState } from "../RacePane";
import { paymentLine } from "../terms-copy";
import type { Band, ContextBands, Offer, OffersResponse } from "../types";
import { Branch, Fields, Frame, Section, Wire } from "./MachineFrame";
import {
  CREDENTIAL_ALTERNATIVE,
  CREDENTIAL_CHECKS,
  CREDENTIAL_PRESENTED,
  ENDPOINTS,
  TOOLS,
  X402_PAYMENT,
  X402_REQUIREMENTS,
  type Field,
} from "./wire";

type Path = "bot" | "backed";

const PATH_LABEL: Record<Path, string> = {
  bot: "unbacked agent",
  backed: "human-backed agent",
};

interface Props {
  city: string;
  address: string;
  credential: CredentialState;
  bot: PaneState;
  backed: PaneState;
  running: boolean;
  onRun(): void;
}

/** The request line as it actually went out. Bot race uses the paid proxy. */
function requestLine(city: string, address: string, credentialed: boolean): string {
  if (!credentialed) {
    const body: Record<string, string> = {};
    if (city.trim()) body.city = city.trim();
    if (address.trim()) body.address = address.trim();
    return `POST /x402/paid-offers  ${JSON.stringify(body)}`;
  }
  // Mirrors fetchAgentVerifiedOffers exactly, including the order the params go
  // on and the fact that there is no credential flag: the backed lane is a signed
  // agent and the signature is checked server side, not asserted in a query
  // string. The old line said GET /offers?credential=1, which was the stand-in
  // path, and it contradicted the identity block three frames below saying
  // verified by agentkit. A transcript that argues with itself is worse than no
  // transcript.
  const params = new URLSearchParams();
  if (address.trim()) params.set("address", address.trim());
  if (city.trim()) params.set("city", city.trim());
  const query = params.toString();
  return query ? `GET /agent/offers?${query}` : "GET /agent/offers";
}

function identityRows(data: OffersResponse | null, path: Path): Field[] {
  const said = data?.credential;
  const status = said?.status ?? (path === "backed" ? "stand_in" : "missing");

  return [
    {
      k: "credential",
      v: status,
      d: "missing | stand_in | verified",
      accent: status === "verified",
    },
    {
      k: "source",
      v: said?.source ?? "none",
      d: "agentkit from a signed header, world-id from a checked proof",
      accent: Boolean(said?.source),
    },
    // Two mechanisms answer two questions: an agent belongs to a human, and a
    // human is one. Either alone is a credential; when both pass, the decision
    // keeps both instead of picking a winner and forgetting the other.
    {
      k: "sources",
      v: said?.sources?.join(" + ") ?? (said?.source ?? "none"),
      d: "both proofs, one decision",
      accent: (said?.sources?.length ?? 0) > 1,
    },
    // Deliberately not sent. A humanId is anonymous, but it is still somebody's
    // identifier, so the gateway keeps it and the wire carries the status only.
    {
      k: "humanId",
      v: status === "verified" ? "withheld" : "none",
      d: "anonymous, and still not ours to publish",
      withheld: status === "verified",
    },
  ];
}

const AXES: Array<keyof ContextBands["bands"]> = [
  "tenure",
  "activity",
  "breadth",
  "scale",
];

function bandRows(context: ContextBands): Field[] {
  const rows: Field[] = AXES.map((axis) => {
    const band: Band = context.bands[axis];
    return {
      k: `bands.${axis}`,
      v: band,
      d: "T0..T4 | unavailable",
      accent: band !== "unavailable",
      withheld: band === "unavailable",
    };
  });

  // Every axis unreadable is its own outcome, and it is not the same as low bands.
  // Said outright so a machine reading this does not have to infer it from four
  // repeated `unavailable` values.
  const allUnavailable = AXES.every((axis) => context.bands[axis] === "unavailable");

  return [
    { k: "address", v: context.address ?? "none" },
    { k: "ens", v: context.ens?.name ?? "none", d: "resolved, or none" },
    { k: "since", v: context.since ? String(context.since) : "none", d: "year only" },
    ...rows,
    ...(allUnavailable
      ? [
          {
            k: "bands",
            v: "none readable",
            d: "no axis contributed, so context did not move the tier",
            withheld: true,
          },
        ]
      : []),
    {
      k: "signals.repayment",
      v: context.signals.repayment,
      d: "no_credit_history | clean | borrowing_open | liquidated",
    },
    {
      k: "activeCategories",
      v: context.activeCategories.length
        ? context.activeCategories.join(", ")
        : "none",
      d: "lending | dex | perps",
    },
    // The gateway does not forward per source freshness: the gate runs inside the
    // reader, and an unreadable source arrives here already collapsed into
    // `unavailable`. The tool below returns the freshness detail in full.
    {
      k: "freshness",
      v: "gated upstream",
      d: "a stale source lands as unavailable, never as zero",
      withheld: true,
    },
  ];
}

function termsRows(data: OffersResponse): Field[] {
  return [
    { k: "tier", v: data.terms.tier, d: "bot | human | verified | elite" },
    { k: "inventory", v: data.terms.inventory, d: "basic | full | member | elite" },
    {
      k: "payment",
      v: data.terms.payment,
      d: "prepay_100 | deposit | rate_lock_pay_later | pay_at_checkout",
      accent: data.terms.payment !== "prepay_100",
    },
    { k: "reason", v: data.reason, d: "the one fact that decided it" },
  ];
}

function settlementRows(data: OffersResponse): Field[] {
  if (!data.scheduleUrl) {
    return [
      {
        k: "scheduleId",
        v: "none",
        d: data.terms.payment === "prepay_100"
          ? "these terms settle before the stay, nothing to schedule"
          : "terms defer the money, no schedule returned",
        withheld: true,
      },
      { k: "executesOn", v: data.checkout, d: "checkout day" },
    ];
  }

  return [
    { k: "scheduleId", v: data.scheduleId ?? "created", accent: true },
    { k: "executesOn", v: data.checkout, d: "checkout day", accent: true },
    { k: "explorer", v: "hashscan", d: "link below, live transaction page" },
  ];
}

function OfferTable({ offers, hold }: { offers: Offer[]; hold: OffersResponse["hold"] }) {
  return (
    <>
      <div className="otable-wrap">
        <table className="otable">
        <thead>
          <tr>
            <th>hotelId</th>
            <th>perNightUsd</th>
            <th>freeCancellationBefore</th>
          </tr>
        </thead>
        <tbody>
          {offers.map((offer) => (
            <tr key={offer.hotelId}>
              <td>{offer.hotelId}</td>
              <td className="otable__num">{offer.perNightUsd.toFixed(2)}</td>
              <td>{offer.freeCancellationBefore ?? "none"}</td>
            </tr>
          ))}
        </tbody>
        </table>
      </div>
      <Fields
        caption="hold"
        rows={
          hold
            ? [
                { k: "partnerOrderId", v: hold.partnerOrderId, accent: true },
                { k: "perNightUsd", v: hold.perNightUsd.toFixed(2) },
                {
                  k: "freeCancellationBefore",
                  v: hold.freeCancellationBefore ?? "none",
                },
                // The design package sketched a supplier book_hash. The gateway
                // does not send one to the browser, so this names the reference we
                // actually have rather than a field we do not.
                {
                  k: "bookHash",
                  v: "not sent to the browser",
                  d: "supplier reference stays server side",
                  withheld: true,
                },
              ]
            : [
                {
                  k: "hold",
                  v: "none",
                  d: "only deferred terms hold a price",
                  withheld: true,
                },
              ]
        }
      />
    </>
  );
}

export function MachineView({
  city,
  address,
  credential,
  bot,
  backed,
  running,
  onRun,
}: Props) {
  const [path, setPath] = useState<Path>("backed");
  const lane = path === "backed" ? backed : bot;
  const accountable = path === "backed";
  const data = lane.data;

  return (
    <section className="machine">
      <header className="machine__head">
        <div className="machine__lede">
          <h2 className="machine__title">the handshake</h2>
          <p className="machine__sub">
            what an agent exchanges with the gateway for one room request. the
            same run as the race, described at the layer an agent reads.
          </p>
        </div>

        {/* Provenance is stated once, up front, so every tag below is readable
          * without a caption of its own. */}
        <dl className="machine__legend">
          <div className="legend__item">
            <dt className="frame__prov frame__prov--live">live</dt>
            <dd>rendered from the response this page received</dd>
          </div>
          <div className="legend__item">
            <dt className="frame__prov frame__prov--declared">declared</dt>
            <dd>
              the wire shape for a leg a browser cannot perform: signing is the
              agent's, not the page's
            </dd>
          </div>
        </dl>
      </header>

      <div className="pathsel" role="group" aria-label="path">
        <span className="label">path</span>
        {(["bot", "backed"] as Path[]).map((option) => (
          <button
            key={option}
            type="button"
            className={`pathsel__btn ${path === option ? "is-on" : ""} ${
              option === "backed" ? "pathsel__btn--accountable" : ""
            }`}
            aria-pressed={path === option}
            onClick={() => setPath(option)}
          >
            {PATH_LABEL[option]}
          </button>
        ))}
      </div>

      {lane.status === "idle" ? (
        <div className="machine__empty">
          <p className="machine__emptyline">
            no exchange yet. the transcript is built from a real response, so
            there is nothing to show until one has been asked for.
          </p>
          <button
            type="button"
            className="ask-address__go"
            onClick={onRun}
            disabled={running}
          >
            run the exchange
          </button>
          <Fields caption="endpoint surface" rows={ENDPOINTS} />
        </div>
      ) : (
        <ol className="thread">
          <Frame
            step="01"
            direction="out"
            title="REQUEST"
            provenance="live"
            accountable={false}
          >
            <Wire>{requestLine(city, address, accountable)}</Wire>
            <Fields
              rows={[
                { k: "city", v: city.trim() || "none", d: "forwarded to the supplier" },
                {
                  k: "address",
                  v: address.trim() || "none",
                  d: "consented, read for context",
                },
                {
                  k: "credential",
                  v: accountable ? "presented" : "none",
                  d: accountable
                    ? "stand-in or AgentKit header"
                    : "nothing presented — metered path",
                },
                {
                  k: "payment",
                  v: accountable ? "waived" : "x402 via paid-offers",
                  d: accountable
                    ? "credential skips the wall"
                    : "demo Hedera account settles 0.01 HBAR",
                },
              ]}
            />
          </Frame>

          <Frame
            step="02"
            direction="in"
            title="PAYMENT REQUIRED"
            status="402"
            // Declared on both paths, including the metered one. The browser
            // never sees this 402: paid-offers settles server side and hands
            // back a 200, so the challenge is a shape we know from the spec and
            // not a response this page received. Tagging it live because a
            // payment really happened somewhere would be exactly the claim this
            // view exists to refuse.
            provenance="declared"
            partner="x402"
          >
            <p className="frame__note">
              not an error. the gateway is naming its price for an anonymous
              caller, and in the same breath naming the way out of paying it.
            </p>
            <Branch
              options={[
                {
                  key: "pay",
                  label: "pay per query",
                  note: "sign an authorisation and ask again. every query costs the same again.",
                  partner: "x402",
                  accountable: false,
                  rows: X402_REQUIREMENTS,
                },
                {
                  key: "credential",
                  label: "be answerable instead",
                  note: "present a signed credential proving a real person is behind this agent.",
                  partner: "world",
                  accountable: true,
                  rows: CREDENTIAL_ALTERNATIVE,
                },
              ]}
            />
          </Frame>

          {accountable ? (
            <Frame
              step="03"
              direction="out"
              title="CREDENTIAL PRESENTED"
              provenance="declared"
              accountable
              partner="world"
            >
              <Wire>agentkit: {"<signed payload>"}</Wire>
              <Fields rows={CREDENTIAL_PRESENTED} />
              <Fields caption="checks, in order" rows={CREDENTIAL_CHECKS} />
              <p className="frame__note">
                the paywall is never reached on this path. credential resolution
                runs in front of it, so an answerable agent is not metered at all
                rather than metered and refunded.
              </p>
            </Frame>
          ) : (
            <Frame
              step="03"
              direction="out"
              title="PAYMENT SETTLED"
              provenance={lane.status === "done" ? "live" : "declared"}
              partner="x402"
            >
              <Wire>
                POST /x402/paid-offers → gateway demo wallet + facilitator
              </Wire>
              <Fields
                rows={[
                  ...X402_PAYMENT,
                  {
                    k: "spentUsd",
                    v:
                      lane.spentUsd > 0 && lane.paymentTxUrl
                        ? `$${lane.spentUsd.toFixed(2)}`
                        : "no settle receipt",
                    d: "x-bookerbob-spent-usd only when PAYMENT-RESPONSE has a tx",
                    accent: Boolean(lane.paymentTxUrl),
                  },
                  {
                    k: "paymentTx",
                    v: lane.paymentTxUrl ?? "missing",
                    d: "HashScan link from x402 settle — not a client fake",
                    accent: Boolean(lane.paymentTxUrl),
                  },
                ]}
              />
              <p className="frame__note">
                a real hedera testnet transfer per query. without a hashscan
                receipt the lane does not claim it paid.
              </p>
            </Frame>
          )}

          {lane.status === "failed" ? (
            <Frame
              step="04"
              direction="in"
              title="SERVICE UNAVAILABLE"
              status="503"
              provenance="live"
            >
              <Fields
                rows={[
                  { k: "error", v: lane.error ?? "the desk did not answer" },
                  {
                    k: "offers",
                    v: "none",
                    d: "no inventory source answered",
                    withheld: true,
                  },
                  {
                    k: "terms",
                    v: "not issued",
                    d: "terms are never guessed without inventory",
                    withheld: true,
                  },
                ]}
              />
              <p className="frame__note">
                both inventory sources refused, so nothing is issued. the gateway
                does not invent terms it cannot fill.
              </p>
            </Frame>
          ) : data ? (
            <Frame
              step="04"
              direction="in"
              title="VERIFIED RESPONSE"
              status="200"
              provenance="live"
              accountable={accountable}
            >
              <Section title="identity" partner="world">
                <Fields rows={identityRows(data, path)} />
              </Section>

              <Section title="context" partner="graph">
                {data.context ? (
                  <Fields rows={bandRows(data.context)} />
                ) : (
                  <Fields
                    rows={[
                      {
                        k: "context",
                        v: "null",
                        d: "no address consented, or nothing readable yet",
                        withheld: true,
                      },
                      {
                        k: "consequence",
                        v: "no band claimed",
                        d: "a missing read never becomes a zero",
                      },
                    ]}
                  />
                )}
              </Section>

              <Section title="terms">
                <Fields rows={termsRows(data)} />
                <p className="frame__note">{paymentLine(data.terms.payment)}</p>
              </Section>

              <Section title="offers">
                <Fields
                  rows={[
                    { k: "source", v: data.source, d: "live | cached" },
                    {
                      k: "matchingCount",
                      v: data.matchingCount === null ? "none" : String(data.matchingCount),
                      d: "rooms matching, before the tier limit",
                    },
                    {
                      k: "returned",
                      v: String(data.offers.length),
                      d: "the tier's limit, not a paywall",
                    },
                  ]}
                />
                <OfferTable offers={data.offers} hold={data.hold} />
              </Section>

              <Section title="settlement" partner="hedera">
                <Fields rows={settlementRows(data)} />
                {data.scheduleUrl ? (
                  <p className="frame__link">
                    <a href={data.scheduleUrl} target="_blank" rel="noreferrer">
                      open the scheduled transaction on hashscan
                    </a>
                  </p>
                ) : null}
              </Section>
            </Frame>
          ) : (
            <Frame
              step="04"
              direction="in"
              title="AWAITING RESPONSE"
              provenance="live"
              accountable={accountable}
            >
              <p className="frame__note">the desk has the request.</p>
            </Frame>
          )}
        </ol>
      )}

      {/* The agent can read its own standing before it ever asks for a room. This
        * is the surface that makes the view a console rather than a picture of
        * one: these tools are registered and callable over MCP. */}
      <section className="tools">
        <header className="tools__head">
          <span className="msection__mark partner">
            <span className="label">context-bands</span>
          </span>
          <h3 className="tools__title">tools an agent can call for itself</h3>
          <p className="tools__sub">
            mcp server, stdio or http. bands only on the way out, the same rule as
            the response above: even a machine is not handed raw values.
          </p>
        </header>
        <div className="tools__list">
          {TOOLS.map((tool) => (
            <article key={tool.name} className="tool">
              <h4 className="tool__name">{tool.name}</h4>
              <p className="tool__summary">{tool.summary}</p>
              <Fields caption="input" rows={tool.input} />
              <p className="tool__returns">
                <span className="fld__k">returns</span> {tool.returns}
              </p>
            </article>
          ))}
        </div>
      </section>

      {credential.status === "stand_in" ? (
        <p className="machine__foot">
          the credential on this page is a stand-in. a real one is signed by an
          agent wallet and checked against the AgentBook, which a browser cannot
          do on the agent's behalf.
        </p>
      ) : null}
    </section>
  );
}
