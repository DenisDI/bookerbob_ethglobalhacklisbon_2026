// The shapes on the wire, and where each one comes from.
//
// PROVENANCE IS PART OF THE DESIGN. Some frames in this transcript are rendered
// from the response this page actually received; others are the declared contract
// for a leg that is not running yet. Those are not the same claim, so they never
// wear the same tag. `live` means it came back from the gateway just now.
// `declared` means this is the wire shape, taken from the spec and the code that
// implements it, on a leg this browser cannot perform.
//
// The browser cannot sign AgentKit itself; credential presentation stays declared
// unless a verified header came back. Bot metering is live: the race posts to
// /x402/paid-offers and the gateway settles Hedera testnet HBAR via x402, then
// returns /offers. Marking that difference is cheaper than claiming a round trip
// that did not happen.
//
// Field names, step order and error strings are taken from the implementation:
// x402 requirements from specs/01-gateway.md, credential verification from
// apps/gateway/src/world.ts, tool schemas from packages/context-bands-mcp.

export type Provenance = "live" | "declared";

/** agent → gateway, or gateway → agent. */
export type Direction = "out" | "in";

export type PartnerKey = "x402" | "world" | "graph" | "hedera";

export interface Field {
  k: string;
  v: string;
  /** The domain of the field: what a machine is allowed to expect here. */
  d?: string;
  /** Accent this value: it is the part a real person is answerable for. */
  accent?: boolean;
  /** The value is deliberately not sent. Drawn as withheld, never as empty. */
  withheld?: boolean;
}

/**
 * The x402 payment requirements, as the paywall declares them.
 *
 * Amount is stated in cents first because that is the number a reader can hold,
 * with the base-unit integer beside it, since that is the number the protocol
 * actually carries. Both are the same money.
 *
 * payTo is a configured receiver and is not printed. The address is real, it just
 * is not this screen's to publish, and inventing a plausible one would be worse
 * than naming the variable that holds it.
 */
export const X402_REQUIREMENTS: Field[] = [
  { k: "x402Version", v: "2" },
  { k: "scheme", v: "exact", d: "exact | upto" },
  { k: "network", v: "hedera:testnet", d: "CAIP-2" },
  { k: "asset", v: "HBAR", d: "0.0.0 native" },
  { k: "amount", v: "0.01 HBAR", d: "1000000 tinybars" },
  { k: "payTo", v: "configured receiver", d: "LISBON2026_X402_PAYTO_ACCOUNT" },
  { k: "resource", v: "GET /offers", d: "this path, without the query" },
  { k: "maxTimeoutSeconds", v: "180" },
  { k: "mimeType", v: "application/json" },
  { k: "facilitator", v: "blocky402", d: "api.testnet.blocky402.com" },
];

/**
 * The other way out of a 402: prove a human is behind the agent.
 *
 * This is the alternative the whole product is about. Same endpoint, same room,
 * same rate; the difference is that one path spends money to be allowed to ask
 * and the other one is answerable instead.
 */
export const CREDENTIAL_ALTERNATIVE: Field[] = [
  { k: "header", v: "agentkit", d: "signed by the agent wallet" },
  { k: "issuedFor", v: "GET /offers", d: "bound to this resource, not general" },
  { k: "nonce", v: "required", d: "single use, replay is refused" },
  { k: "issuedAt", v: "required", d: "older than maxAge is refused" },
  { k: "registry", v: "AgentBook", d: "World Chain lookup of the agent wallet" },
];

/**
 * What the agent actually puts on the retry, as opposed to what the challenge
 * asked for. Kept separate from CREDENTIAL_ALTERNATIVE on purpose: repeating the
 * requirement list verbatim would read as the same frame twice, when the point of
 * this one is that the requirements have been met.
 */
export const CREDENTIAL_PRESENTED: Field[] = [
  { k: "header", v: "agentkit", d: "one header, no query parameter" },
  { k: "signer", v: "agent wallet", d: "the agent's own key, not the human's" },
  { k: "boundTo", v: "GET /offers", d: "the resource it was minted for" },
  { k: "nonce", v: "fresh", d: "never presented before" },
  { k: "issuedAt", v: "within maxAge", d: "recent enough to still count" },
];

/** The payload an agent returns after signing the authorisation. */
export const X402_PAYMENT: Field[] = [
  { k: "header", v: "PAYMENT-SIGNATURE", d: "signed payment payload" },
  { k: "scheme", v: "exact" },
  { k: "network", v: "hedera:testnet" },
  { k: "amount", v: "0.01 HBAR", d: "charged per query, every query" },
  { k: "authorisation", v: "signed", d: "Hedera transfer, partial-sign" },
  { k: "settled", v: "by facilitator", d: "blocky402 fee-payer" },
];

/**
 * What the gateway does with a presented credential, in the order it does it.
 *
 * Every one of these five can refuse, and a refusal is not an error: it simply
 * means no credential, and the request carries on as an unbacked agent. Why a
 * credential was refused is logged and never returned, because telling a caller
 * which check it failed is free help for forging the next attempt.
 */
export const CREDENTIAL_CHECKS: Field[] = [
  { k: "parse", v: "parseAgentkitHeader", d: "payload off the header" },
  { k: "bind", v: "issued for this resource", d: "another endpoint does not count" },
  { k: "fresh", v: "maxAge + nonce", d: "stale or reused is refused" },
  { k: "sign", v: "eoa or erc-1271", d: "smart wallets included" },
  { k: "register", v: "AgentBook lookup", d: "unregistered wallet is refused" },
];

/**
 * The tool an agent can call to read its own standing before it asks for a room.
 *
 * Real schemas, copied from the registered tools in
 * packages/context-bands-mcp/src/server.ts. This is what makes the machine view a
 * console rather than a picture of one: the surface described here is callable.
 */
export interface ToolSpec {
  name: string;
  summary: string;
  input: Field[];
  returns: string;
}

export const TOOLS: ToolSpec[] = [
  {
    name: "get_context_bands",
    summary:
      "underwriting bands for an address or ens name, read from live subgraphs on the graph",
    input: [{ k: "address", v: "string", d: "evm address or ens name" }],
    returns:
      "four bands, a repayment signal, active categories, and per source freshness. never raw values. a stale source reports unavailable rather than a guess",
  },
  {
    name: "resolve_name",
    summary: "resolve an ens name to an address, with its registration date",
    input: [{ k: "name", v: "string", d: "ens name" }],
    returns: "address and the date the name was registered",
  },
  {
    name: "get_supported_subgraphs",
    summary: "which subgraphs this server reads, and which were retired and why",
    input: [],
    returns: "the active registry and the retired list",
  },
];

/** The gateway's real route surface, from apps/gateway/src/index.ts. */
export const ENDPOINTS: Field[] = [
  { k: "GET /offers", v: "identity, context, terms, inventory", d: "x402 if anonymous" },
  { k: "POST /x402/paid-offers", v: "race bot: demo Hedera pays, then offers", d: "hedera:testnet" },
  { k: "GET /spent", v: "per-payer x402 ledger for race counters" },
  { k: "POST /prebook", v: "schedule a settlement for a hold", d: "deferred terms only" },
  { k: "POST /book", v: "execute the scheduled settlement", d: "at checkout" },
  { k: "GET /health", v: "liveness, inventory, x402 config" },
];
