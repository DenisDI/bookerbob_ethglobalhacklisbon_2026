# ARCHITECTURE-EXEC: ETHGlobal Lisbon 2026 build plan

> **Pre-event research only.** Public-docs excerpts and kit notes. No project
> application code before Fri 2026-07-24 21:00 WEST. Commit under `specs/` for the
> Scratch specs rule. **Canonical: `FINAL-PLAN.md`** (+ `specs/CUT-ORDER.md`,
> `specs/DEMO-IMPROVEMENTS.md`). Conflicts (Graph x402 testnet, discounts, Hedera as
> second rail, Selfie=3h, feature-tour / 3 videos) → FINAL-PLAN wins.

Product sketch: booking gateway where identity underwrites risk terms (not price).
Scratch track. External deployed APIs disclosed with ownership (see FINAL-PLAN §A.7).

## 0. README disclosure (paste into repo README)

> External services: this project consumes two pre-existing deployed APIs as external
> services, the same way it consumes The Graph and World: a hotel inventory MCP
> (flexrep.xyz/mcp_travel, RateHawk-backed) and the REP public context API. No code from
> those services is in this repo. All project code, the gateway, the terms engine, the
> context-bands MCP server, and the web demo, was written during the hackathon.
> AI usage: see docs/AI-ATTRIBUTION.md; specs and prompts in specs/.

## 1. Kit verdicts (from live docs, read 2026-07-24)

### World AgentKit (Beta) : GREEN, and it changes the design for the better
AgentKit IS an x402 extension. Not two systems (identity + payments) but one: the 402
challenge itself carries the agentkit extension, and a human-backed agent answers it
with a signed header instead of money. Our "bots pay, humans ride free" gateway is the
protocol's native shape.
- Package: `@worldcoin/agentkit` (client + server). Register agent wallet once:
  `npx @worldcoin/agentkit-cli register <agent-address>` (one teammate approves in
  World App; tx on World Chain). After that everything runs locally.
- Server (Hono is their reference framework, matches our stack): register
  `agentkitResourceServerExtension`, declare per-route
  `declareAgentkitExtension({ statement, mode: { type: 'free-trial', uses: 3 } })`,
  hooks via `createAgentkitHooks({ agentBook: createAgentBookVerifier(), storage: new
  InMemoryAgentKitStorage() })`. Verify = parse SIWE-style header, check sig
  (eip191/1271/6492) + nonce freshness, then on-chain AgentBook lookup on World Chain
  (contract 0xA23a...44dA) -> humanId or null.
- Client: `createAgentkitClient({ signer })` then `agentkit.fetch(url)`; falls back to
  normal x402 payment when no credential. Chains: World Chain (480) and Base (8453).
- Modes: free / free-trial (per-humanId quota, needs storage) / discount (percent
  underpay). Free-trial + discount are literally our terms matrix at protocol level.
- Gotchas: beta; in-memory storage resets quotas on restart (fine for demo); one human
  = one humanId, so the team's single humanId hits its own free-trial cap during
  testing (bump `uses` in dev).

### World Identity Check (Preview) : RED for this weekend
Attributes are exactly what we wanted (minimum_age, issuing_country, nationality,
document_type; verify returns predicate result + nullifier, never raw values) BUT
access is contact-gated ("contact us"), no self-serve portal toggle, no published
approval timeline, and the user must hold a document (NFC passport/eID) verification
in World App. Assume unavailable unless the on-site World desk grants it Friday.
ACTION: ask at the World booth first thing; meanwhile build slot 3 on Selfie Check.

### World Selfie Check (Beta) : GREEN, the slot-3 replacement
Camera-based liveness + facial similarity credential, 90-day validity. Fully testable
in the World ID Sandbox: self-serve access, public TestFlight
(testflight.apple.com/join/VZEurhHe), simulated verifications, same-device deep link +
cross-device QR; IDKit with `environment: "sandbox"`. Browser-only dev via
simulator.worldcoin.org with `environment: "staging"`. Same judged shape as Identity
beta: meaningful use + feedback docs. docs/FEEDBACK-identity.md becomes
docs/FEEDBACK-selfie.md (keep an Identity section if the desk unlocks preview).
World ID 4.0 pipeline: Developer Portal app -> app_id + rp_id + signing_key; backend
pre-signs requests (`@worldcoin/idkit-core/signing`); verify by forwarding IDKit
payload to POST https://developer.world.org/api/v4/verify/{rp_id}; store nullifier.

### World MCP : build-time only, not a runtime verifier
Docs MCP (https://docs.world.org/mcp, no auth, doc search) + Developer Portal MCP
(https://developer.world.org/api/mcp, Bearer api_ key, 11 admin tools: create app,
actions, keys). No proof verification over MCP. Use as a demo beat ("the agent
provisions its own World app via Portal MCP") and as build tooling, nothing more.

### Graph Subgraph MCP : complementary, do not build on top
Official MCP (hosted https://subgraphs.mcp.thegraph.com/sse, auth = Studio gateway
key) is generic plumbing: schema discovery + raw GraphQL execution, computes nothing.
Our context-bands MCP is an opinionated derived-metric server (curated standardized
subgraphs, cross-protocol aggregation, thresholds into tiers): zero overlap, judges
see it as complementary. Query the gateway DIRECTLY with static GraphQL
(POST gateway.thegraph.com/api/<KEY>/subgraphs/id/<ID>), do not chain through their
MCP at runtime. Use their MCP only at dev time for schema exploration.

### Graph x402 : the killer finding, a fully keyless pass-through economy
The Graph gateway itself accepts x402: POST
https://gateway.thegraph.com/api/x402/subgraphs/id/{id}, 402 -> pay USDC -> result.
NO API key, no account. Testnet: testnet.gateway.thegraph.com (Base Sepolia USDC).
Package `@graphprotocol/client-x402` (createGraphQuery / npx graphclient-x402).
So context-bands MCP can CHARGE callers x402 (our @x402/hono middleware) and PAY The
Graph upstream per query via client-x402: an agent-native service with zero API keys
end to end. This sentence is the Graph-track pitch.
Fallback: Studio API key (thegraph.com/studio); no documented hackathon free tier,
ask in @graphhackers Telegram.

### Graph prize split (from their blog, better than assumed)
AI Tooling $3k/$2k/$2k. AI Use Case $2k/$1k/$1k. Composable/Standardized $2k/$1k/$1k.
context-bands qualifies for AI Tooling AND Composable/Standardized simultaneously.

### STRATEGY UPGRADE: partner multi-tracks count as ONE prize slot
ETHGlobal rules: "If a partner has multiple tracks, you can be eligible for all of
them while only counting as 1 Partner Prize." So the 3 slots become:
1. World (AgentKit New Use Cases + Selfie/Identity Beta, one slot)
2. The Graph (AI Tooling + Composable/Standardized + AI Use Case, one slot)
3. Hedera (Agentic Payments via the x402 hedera:testnet accepts entry)
Total pool exposure jumps without violating the 3-prize limit. Step 9 (Hedera) is
now core Saturday work, not optional.

### x402 core : GREEN, half a day, gasless demo on Base Sepolia
Governance moved to the x402 Foundation (Linux Foundation); canonical repo
x402-foundation/x402, docs at docs.x402.org. CRITICAL: use the CURRENT scoped v2
packages `@x402/hono @x402/evm @x402/core` (client: `@x402/fetch`), all 2.19.0. Old
tutorials use unscoped `x402-hono`/`x402-fetch` with a different config shape; do not
mix the two APIs. Networks are CAIP-2 ids (`eip155:84532` = Base Sepolia).
- Server: `paymentMiddleware({ "GET /offers": { accepts: [{ scheme: "exact", price:
  "$0.01", network: "eip155:84532", payTo: "0x..." }] } }, new
  x402ResourceServer(new HTTPFacilitatorClient({ url:
  "https://x402.org/facilitator" })).register("eip155:84532", new ExactEvmScheme()))`.
- Client: `wrapFetchWithPayment(fetch, client)` with `ExactEvmScheme(viemAccount)`.
- Demo economics: free testnet facilitator (x402.org/facilitator, no signup), test
  USDC from faucet.circle.com (~20 USDC/2h, no account), buyer needs NO gas
  (EIP-3009 transferWithAuthorization is gasless for the payer).
- And per the World verdict above, AgentKit rides on this same middleware as an
  extension: one 402 stack serves both "human-backed = free" and "bot = pays".

### Hedera swap-in : cheaper than planned, 3-6h, same gateway
Do NOT use the scaffold as base (it is file-marketplace shaped: Docker, MinIO,
hardhat; 4-8h of deleting). The cheap path: `@x402/hedera` is a first-party npm
package and the default x402.org facilitator claims `hedera:testnet` support. So:
add a second `accepts` entry with `network: "hedera:testnet"`, register the Hedera
scheme next to ExactEvmScheme, payTo = your 0.0.x testnet account
(portal.hedera.com + faucet). Client side needs a native partial-sign (not an EVM
signature); reference: github.com/matevszm/x402-hedera-example (Hono, Blocky402
facilitator, e2e-pay script). Caveat: no verified e2e of x402.org facilitator +
hedera:testnet in the wild, so smoke-test that pair FIRST on Saturday; plan B is the
Blocky402 public facilitator, plan C the scaffold's Docker facilitator.

## 2. Repo skeleton

```
bookerbob/                       (working name; never "reputation" anywhere)
  README.md                      one-liner, disclosure block, run instructions, prize map
  package.json                   npm workspaces: apps/*, packages/*
  specs/                         every spec/prompt driving Claude Code, committed as used
    00-architecture.md           this file's build steps, first commit
  docs/
    AI-ATTRIBUTION.md            file-by-file: AI-generated / AI-assisted / by hand
    FEEDBACK-identity.md         World Identity Check beta feedback, written DURING integration
    FEEDBACK-agentkit.md         AgentKit dev notes (cheap extra credibility)
  apps/
    gateway/                     Hono + TypeScript, the star
      src/index.ts               routes: /offers /book /verify /health
      src/world.ts               AgentKit credential verify + Identity Check attributes
      src/context.ts             calls context-bands MCP + REP public API, merges bands
      src/terms.ts               Terms Engine: (proofs, bands) -> tier -> terms matrix
      src/inventory.ts           booker MCP client: search/rates/prebook (session mgmt)
      src/x402.ts                x402 paywall middleware for anonymous agents
      src/types.ts               Tier, Terms, Offer, ContextBands
    web/                         Vite + React, one split-screen page
      src/App.tsx                left bot view, right verified view, live terms switch
      src/VerifyFlow.tsx         World ID widget -> wallet connect -> watch terms change
  packages/
    context-bands-mcp/           THE Graph-prize artifact, standalone, reusable
      README.md                  one-command run, schema docs, works without our gateway
      SKILL.md                   agent-facing usage doc (Graph judges look for this)
      src/server.ts              MCP server (stdio + http), tools below
      src/subgraphs.ts           Messari standardized queries (from section 4)
      src/bands.ts               raw values -> coarse bands (T1..T4), thresholds
      src/x402.ts                optional pay-per-query gate (bonus points)
```

## 3. Build steps (order fixed; ~26h build + buffer)

Step 1 (1h). Repo init + workspaces + Hono hello + Vite hello. Commit. Both run.
Step 2 (2-3h). inventory.ts against booker MCP: init session (mcp-session-id header),
        search city, get rates. Acceptance: curl /offers returns real hotels with
        prices, everyone Bot tier. E2E SKELETON, Fri night target.
Step 3 (2h). terms.ts matrix + ?tier= debug param. Split screen renders two live
        /offers side by side. Acceptance: visible terms difference.
Step 4 (2-3h, Fri night register). AgentKit: teammate registers agent wallet via
        `npx @worldcoin/agentkit-cli register` (World App approve), server hooks
        `agentkitResourceServerExtension` + `createAgentkitHooks` on the x402
        middleware from step 7's stack (build them together, they are one stack).
        Acceptance: credentialed agent lands Human tier, bare agent stays Bot.
Step 5 (4-5h). context-bands-mcp: three verified queries + bands.ts + MCP server
        (stdio + http). Gateway consumes it. Acceptance: known whale wallet ->
        Verified/Elite; fresh wallet -> Human. Standalone `npx` run works.
Step 6 (3h). Selfie Check via Sandbox (TestFlight VZEurhHe / simulator.worldcoin.org
        staging; Identity Check only if the World desk unlocks preview). Write
        FEEDBACK doc AS YOU INTEGRATE. Acceptance: eligibility line in offer.
Step 7 (2-3h, with step 4). @x402/hono paywall on Bot-tier /offers: $0.01 USDC
        Base Sepolia, x402.org facilitator, Circle-faucet-funded demo payer.
        Acceptance: 402 -> auto-pay -> 200 on camera.
Step 8 (3h). Polish split screen, judges-own-wallet flow, x402 pay-per-query on the
        MCP http mode (Graph bonus: charge inbound, pay Graph outbound keyless).
Step 9 (3-6h, Sat PM, CORE now). Hedera: second accepts entry hedera:testnet +
        @x402/hedera scheme. Smoke-test x402.org facilitator + hedera:testnet FIRST;
        plan B Blocky402. Acceptance: paid offer settles on Hedera testnet, tx id in
        payment-response header.
Step 10. Sun 06:00-08:30: freeze, 3 videos, submission texts, select 3 partners
        (World, Graph, Hedera; multi-tracks per partner ride the same slot).

## 4. Chosen subgraphs + queries (field names verified against Messari schemas)

Account `id` = LOWERCASE wallet address. `account: null` = tier 0, not an error.
Gateway: POST gateway.thegraph.com/api/<KEY>/subgraphs/id/<ID> (or the x402 route).
Sat AM: verify sync status of each ID in Graph Explorer before wiring thresholds
(Messari repo maintenance has slowed; some deployments are stale).

Lending (schema-lending, Aave v3):
- Ethereum `JCNWRypm7FYwV8fx5HhzZPSFaMxgkPuw4TnR3Gpi81zk`
- Arbitrum `4xyasjQeREe7PxnF6wVdobZvCw5mhoHZq3T7guRpuNPf`
- Base     `D7mapexM5ZsQckLJai2FawTKXJ7CqYGKM8PErnS3cJi9`
```graphql
query WalletLending($account: ID!) { account(id: $account) {
  positionCount openPositionCount closedPositionCount
  depositCount withdrawCount borrowCount repayCount
  liquidateCount liquidationCount flashloanCount rewardsClaimedUSD
  positions(first: 20) { side balance isCollateral
    market { id inputToken { symbol decimals lastPriceUSD } } } } }
```
Note: no totalDepositBalanceUSD on Account; USD = balance / 10^decimals *
lastPriceUSD. liquidateCount = acted as liquidator (positive), liquidationCount =
got liquidated (negative). Do not swap them.

DEX (dex-amm EXTENDED 4.0.1 schema, uniswap-v3-forks):
- Uniswap v3 Ethereum `ELUcwgpm14LKPLrBRuVvPvNKHQ9HvwmtKgKSH6123cr7`
  (flagged possibly stale; check Explorer, pull uniswap-v3-arbitrum/base IDs from
  deployment/deployment.json via jq if fresher)
```graphql
query WalletDex($account: ID!) { account(id: $account) {
  swapCount depositCount withdrawCount positionCount openPositionCount
  swaps(first: 100, orderBy: timestamp, orderDirection: desc) {
    timestamp amountInUSD amountOutUSD } } }
```
Volume = client-side sum of amountInUSD; recency = swaps[0].timestamp. CAREFUL: the
base dex-amm 1.3.2 schema has NO Account.swapCount and Swap has no account field;
this query only works on extended-schema deployments.

Perps (schema-derivatives-perpfutures):
- GMX Arbitrum `3La4ZToKjD5185NM6MqLzkHzJ3KUG6fiMhGvnMtPu9YD` (deployment.json) BUT
  Explorer also shows `DiR5cWwB3pwXXQWWdus7fDLR2mnFRQLiBFsVmHAH9VAs`; open both Sat
  AM, keep whichever is synced. Fallback: Mummy Finance Arbitrum
  `4Po9haSDCDbQ2XtrSXqT8BNB9H6T7EUAmbAorAzHQi9S`.
```graphql
query WalletPerps($account: ID!) { account(id: $account) {
  longPositionCount shortPositionCount openPositionCount closedPositionCount
  depositCount withdrawCount collateralInCount collateralOutCount
  swapCount liquidateCount liquidationCount
  positions(first: 20) { side leverage balanceUSD realisedPnlUSD } } }
```

Bands (packages/context-bands-mcp/src/bands.ts), tuned so a typical active DeFi
wallet lands T2-T3:
- defi_activity: T1 any account seen; T2 5+ combined deposit/swap/position counts;
  T3 25+ counts across 2+ categories; T4 100+ counts or perps balanceUSD $100k+.
- Output ONLY bands ("defi_activity: T3", "active_categories: lending+dex"), never
  raw values.

## 5. x402 plan

One 402 stack in apps/gateway/src/x402.ts:
- `@x402/hono` paymentMiddleware on Bot-tier /offers: $0.01, network eip155:84532,
  facilitator https://x402.org/facilitator, payTo = team EVM address.
- AgentKit registered as an extension on the SAME middleware: human-backed agents
  answer the 402 with a signed agentkit header (free-trial mode), bots pay USDC.
  This is the demo's sharpest beat: one protocol, two outcomes.
- Paying client: demo script with `@x402/fetch` + viem account funded from
  faucet.circle.com. Zero gas needed.
- Optional Graph bonus: same middleware pattern on context-bands-mcp's http mode
  (pay-per-query), mirroring Graph's own x402 support.
- Hedera delta (step 9): second accepts entry `hedera:testnet` + `@x402/hedera`
  scheme, same facilitator; smoke-test Sat AM; Blocky402 as plan B.

## 6. Demo script + videos

Split-screen page story (same for live demo and videos):
1. Left pane: anonymous agent asks for Lisbon hotels. Gets 3 basic hotels, full prepay,
   rate-limited, then hits the x402 paywall live (402 -> pays cents -> gets answer).
2. Right pane: agent presents AgentKit credential, Identity Check passes, wallet context
   bands computed live from The Graph. Same query: full inventory incl. member rates,
   minus 10 percent, pay later.
3. The judge moment: "connect YOUR wallet", terms recompute live on their own history.
4. Close on a real prebook: rate locked through booker (real RateHawk rate, real hash).

ONE demo video per the submission form (2-4 min, live voice, no AI voiceover, no
phone recording, 720p+, no speed-up), structured so each partner judge sees their 40
seconds: AgentKit credential flow + terms change (World), MCP standalone with live
queries and bands + keyless x402 pass-through (Graph), Hedera-settled payment with tx
id (Hedera), Selfie Check gate + feedback doc mention (World beta). Per-prize
submission TEXT carries the file paths and details each partner needs.

## 7. Risks and fallbacks

- Identity Check preview is contact-gated -> CONFIRMED by docs; primary plan is Selfie
  Check beta via Sandbox (self-serve TestFlight), Identity only if the on-site World
  desk unlocks it. Ask at the booth Friday.
- AgentKit registration needs one real World App verification -> one teammate's
  verified World App registers the agent wallet once, then all local. Bump free-trial
  `uses` in dev so the single team humanId does not exhaust its own quota.
- Messari subgraph field mismatch -> verify queries Fri night in Studio playground
  before writing bands.ts.
- booker MCP thin inventory (6 hotels/region sandbox depth) -> pick demo city by
  checking inventory first (Lisbon), pin hotel ids in demo config, never live-search
  an unchecked city on stage.
- x402 facilitator/testnet friction -> paywall works with any 402-compliant flow;
  if facilitator fails, settle for testnet USDC transfer verification in-gateway.
- Time: steps 1-3 involve zero external approvals, so the e2e skeleton cannot be
  blocked by partners. Never let steps 4-7 break the running demo: feature-flag each.
```
