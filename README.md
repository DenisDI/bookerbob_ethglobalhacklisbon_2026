# FairTerms

Who is behind an agent changes the terms it gets.

A hotel-booking gateway with three trust flows, same inventory, different risk:

| Flow | Who is asking | Terms |
|---|---|---|
| Agent alone | anonymous bot, no credential | 3 basic hotels, 100 percent prepay, pays x402 per query |
| Agent + human | World AgentKit: a real unique human backs the agent | full inventory, deposit instead of prepay |
| Human + context | + consented onchain context bands (The Graph, Messari standardized subgraphs) | member inventory, rate lock now, PAY LATER as a real Hedera Scheduled Transaction (created at prebook, executes at checkout) |

No discounts anywhere. The credential does not make rooms cheaper, it changes who
carries the risk: prepay vs deposit vs deferred settlement. Personhood as
underwriting.

## How it works

1. Agent hits `/offers`. No credential: x402 paywall, pay per query (Base Sepolia
   USDC, gasless). AgentKit credential: verified against the AgentBook on World
   Chain, paywall waived (per-humanId quota as sybil-resistant rate limiting).
2. Consented wallet address goes to our open-source `context-bands-mcp`: live
   queries to Messari standardized subgraphs on The Graph, paid per query over x402
   on Base mainnet, zero API keys end to end. Output is coarse bands (T1..T4),
   never raw values.
3. Terms engine maps credential + bands to underwriting terms.
4. Inventory: real hotels and rates. Prebook locks a real rate; for verified tiers
   the settlement is a Hedera Scheduled Transaction, visible on HashScan.
5. Selfie Check (World ID Sandbox) gates eligibility for deferred settlement.

## Disclosures

**External inventory service.** Hotel inventory is served by an MCP API at
flexrep.xyz (RateHawk-backed). **Ownership: REP, our own team's product, built and
deployed before this event.** Disclosed to ETHGlobal organizers in Discord on
2026-07-24; written acknowledgment in `docs/DISCLOSURE-SIGNOFF.md`. No code from
that service is in this repository. It is used only as an interchangeable data
source behind an inventory adapter; the repo ships a second in-event source
(`fixtures/lisbon.json`) and the demo runs on either. The gateway, terms engine,
context-bands MCP, and web app were all written during the hackathon.

**Team background.** We are the team behind REP and have worked on verified-context
and achievement-band products. This Scratch project is a new, from-scratch build
exploring one idea: identity and consented onchain context underwriting payment and
inventory risk terms. It is not an agent scoreboard.

**Reused / referenced.** Reference code consulted (not copied wholesale):
matevszm/x402-hedera-example (client partial-sign pattern). Libraries: @x402/*,
@worldcoin/agentkit + agentkit-core, @hashgraph/sdk, idkit, hono, viem. This
section is updated the moment any fallback path activates.

**AI usage.** Built spec-driven with Claude Code. All driving specs and plans are
committed in `specs/`; file-level attribution in `docs/AI-ATTRIBUTION.md`, updated
in the same commit as each file it covers. Architecture, product decisions,
integration debugging, and verification are the team's.

**In-window proof.** AgentKit agent-wallet registration tx hash and World Portal
app creation happened after hacking start (Fri 21:00 WEST): [tx hash here].

## Run

```
npm install
npm run dev:gateway   # Hono gateway :3000
npm run dev:web       # race demo :5173
npx context-bands-mcp # standalone MCP (stdio; --http :3001)
```

Secrets live in `.env` (see `.env.example`); nothing sensitive is committed.

## Specs

`specs/00-final-plan.md` (canonical plan), `01-gateway.md`, `02-context-bands-mcp.md`,
`03-web-demo.md`, `CUT-ORDER.md`, `KEYS.md`.
