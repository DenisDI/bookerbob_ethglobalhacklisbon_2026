# SPEC 01 — Gateway (apps/gateway)

> Implementation spec for the Hono gateway: terms engine, AgentKit Plan A, x402
> metering, Hedera schedule, narration. Canon on conflicts: `00-final-plan.md`.

## Packages (pin exactly)

```
@x402/hono@2.19.0  @x402/evm@2.19.0  @x402/core@2.19.0  @x402/paywall@2.19.0
@worldcoin/agentkit@0.2.0  @worldcoin/agentkit-core@0.2.0
@hashgraph/sdk (latest)  hono  viem  zod  tsx
```

Verified traps:
- `createAgentBookVerifier` is exported from `@worldcoin/agentkit-core`, NOT from
  `@worldcoin/agentkit`. Import accordingly.
- agentkit hooks are `{ requestHook(ctx), verifyFailureHook(ctx) }`; @x402/core 2.19
  expects `onProtectedRequest(declaration, context, routeConfig)` and
  `onVerifyFailure(declaration, context)`. If using extension mode, glue:
  `onProtectedRequest: (decl, ctx) => requestHook(ctx)`.
- Old unscoped `x402-hono`/`x402-fetch` tutorials use a DIFFERENT API. Never mix.

## Routes

| Route | What |
|---|---|
| GET /offers?city=&address= | main path: identity -> context -> terms -> inventory |
| POST /prebook | rate lock (book_hash) + Hedera ScheduleCreate for pay-later tiers |
| POST /book | executes settlement (schedule executes / prepay confirmed) |
| GET /health | plumbing |

Every step of /offers emits a `narration` entry (see Narration).

## Identity: AgentKit Plan A (DEFAULT, ~2h)

Plain Hono middleware BEFORE the x402 paywall. No dependence on extension interface
of two betas:

```ts
import { parseAgentkitHeader, validateAgentkitMessage, verifyAgentkitSignature }
  from "@worldcoin/agentkit";           // check actual export locations at install
import { createAgentBookVerifier } from "@worldcoin/agentkit-core";

const agentBook = createAgentBookVerifier(); // World Chain lookup -> humanId | null

app.use("/offers", async (c, next) => {
  const hdr = c.req.header("agentkit");
  if (hdr) {
    const msg = parseAgentkitHeader(hdr);           // base64 SIWE-style
    validateAgentkitMessage(msg);                    // binding, freshness (5 min), nonce
    await verifyAgentkitSignature(msg);              // eip191/1271/6492
    const humanId = await agentBook.lookupHuman(msg.address);
    if (humanId) { c.set("tier", "human"); c.set("humanId", humanId); return next(); }
  }
  return next(); // falls through to x402 paywall as bot
});
```

Extension mode (nicer story) is a 90-min spike Fri night ONLY. Not green by
Sat 01:30 -> Plan A permanent, stop debugging betas.

Registration (Fri after 21:00, save tx hash to README):
`npx @worldcoin/agentkit-cli register <agent-wallet>` + teammate's World App approve.
Anti-farming framing: per-humanId quota is sybil-resistant rate limiting, not a perk.

## x402 paywall (bot metering)

```ts
import { paymentMiddleware, x402ResourceServer } from "@x402/hono";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";

const facilitator = new HTTPFacilitatorClient({ url: "https://x402.org/facilitator" });
const server = new x402ResourceServer(facilitator)
  .register("eip155:84532", new ExactEvmScheme());   // Base Sepolia

app.use(paymentMiddleware({
  "GET /offers": {
    accepts: [{ scheme: "exact", price: "$0.01",
                network: "eip155:84532", payTo: process.env.PAYTO_ADDRESS }],
    description: "hotel offers", mimeType: "application/json",
  },
}, server));
```

- Runs AFTER the AgentKit middleware (human tier skips it).
- Track per-payer spent totals in memory -> `GET /spent` for the UI counters.
- Demo payer: script with `@x402/fetch` + viem key funded at faucet.circle.com
  (Base Sepolia USDC, gasless via EIP-3009).
- Optional Hedera settle (cuttable, kills 10:00/14:00/16:00 per CUT-ORDER): second
  accepts entry `network: "hedera:testnet"` + scheme from `@x402/hedera`.
  payTo 0.0.x must ASSOCIATE testnet USDC first.

## Terms engine (NO discounts, enums only)

```ts
type Payment = "prepay_100" | "deposit" | "rate_lock_pay_later" | "pay_at_checkout";
type Tier = "bot" | "human" | "verified" | "elite";
interface Terms { tier: Tier; inventory: "basic" | "full" | "member" | "elite";
                  payment: Payment; }
```

bot -> basic/prepay_100. human -> full/deposit. verified (any band >= T2) ->
member/rate_lock_pay_later. elite (any T4) -> elite/pay_at_checkout.
No discountPercent, no price multiplier anywhere. Lexicon gate:
`npm run lint:lexicon` must stay empty on product paths.

## Context

`src/context.ts` calls context-bands MCP (spec 02) with the consented address.
Null account = honest empty state: tier stays human, narration says
"no onchain history yet. Human terms via the credential alone."

## Inventory adapter

```ts
interface Inventory { search(city): Offer[]; rates(hotelId): Rate[];
                      prebook(bookHash): Prebook; }
```
- `booker.ts`: MCP client to `https://flexrep.xyz/mcp_travel/mcp` EXACTLY (bare
  paths 301/405; clients do not replay POST through 301). Sessions are in-memory on
  a single Fly instance: treat `mcp-session-id` as disposable, retry-once-and-reinit
  on any failure. Token via `.env` BOOKER_TOKEN, never committed.
- `fixtures.ts`: serves `fixtures/lisbon.json` (captured Fri night) on any error or
  2s timeout; response tagged `source: "cached"` for the UI badge.
- Pinned demo hotel id lives in `demo.config.ts`, verified Fri night.
- DO NOT build on flexrep before the organizer sign-off is saved to
  `docs/DISCLOSURE-SIGNOFF.md` (00-final-plan A.3).

## Hedera schedule (the headline)

`src/hederaSchedule.ts` with `@hashgraph/sdk`, Hedera TESTNET:
- prebook (verified/elite): `ScheduleCreate` wrapping the settlement transfer;
  return `scheduleId`, surface it in the offer + HashScan URL
  `https://hashscan.io/testnet/schedule/<id>`.
- book/checkout: submit the scheduled tx signature -> executes; return executed tx
  HashScan URL. UI opens the page, never shows a bare tx id.
- Optional HCS garnish (~10 lines): topic message with hash(tier, offer, payment tx).
- Autonomous demo script `scripts/agent-schedule-hedera.ts`: full flow end-to-end.

## Narration (decisions, not logs)

`src/narration.ts`: every pipeline step pushes `{ t, line }` in warm lowercase
plain English, no crypto jargon on the surface:
"no credential here. paying $0.01 for this query" /
"my human is verified. requesting terms on their standing" /
"context confirmed: active on aave and uniswap. asking for pay-later" /
"rate locked. settlement scheduled for checkout day".
Delivered with the /offers response (and SSE if cheap). Degrades to static captions.

## .env (never committed; .env.example committed)

```
PAYTO_ADDRESS=            # x402 receiver (fresh EVM)
DEMO_PAYER_KEY=           # bot wallet, Circle-faucet funded
AGENT_PRIVATE_KEY=        # AgentBook-registered agent wallet
GRAPH_USDC_KEY=           # Base MAINNET wallet, $2-5 USDC (Graph x402)
GRAPH_API_KEY=            # Studio backup only
BOOKER_TOKEN=
HEDERA_ACCOUNT_ID= HEDERA_PRIVATE_KEY=
WORLD_APP_ID= WORLD_RP_ID= WORLD_SIGNING_KEY=
```
