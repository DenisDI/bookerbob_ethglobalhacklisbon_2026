# BookerBob

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
2. Consented wallet address (`?address=` / Privy) goes to `context-bands-mcp`:
   Messari standardized subgraphs on The Graph → coarse bands (T1..T4), never raw
   values.
3. Terms engine maps credential + bands to underwriting terms (who carries risk).
4. Inventory locks a real rate. For pay-later tiers, `@bookerbob/hedera-schedule`
   creates a Hedera testnet Scheduled Transaction; HashScan opens from the finale
   card. **The guest carries settlement risk; the agent only asks and locks.**
5. Selfie Check (World ID Sandbox) gates eligibility for deferred settlement.

### Hedera payment flow (Agentic Payments)

```bash
npm run smoke -w @bookerbob/hedera-schedule
npm run demo -w @bookerbob/hedera-schedule   # create + execute + HashScan URLs

# Race scenarios (credential × Graph × Hedera)
npm run test:scenarios                       # local gateway
npm run test:scenarios:prod                  # lisbonhack.world (soft Hedera)
npm run test:scenarios:learn                 # append novel fails to catalog
```

See `packages/hedera-schedule/README.md`. Routes: `POST /prebook`, `POST /book`.
Catalog: `scripts/scenarios/catalog.json`.

## How the terms are decided

Identity moves risk, never price. Everyone is quoted the same supplier rate; what
changes is who carries the exposure between booking and the stay. The engine asks
four questions in the order an underwriter would, and the answers are allowed to
disagree with each other.

**Is anyone accountable?** Without a credential, nothing is extended on trust,
however rich the history behind the wallet. Context without an accountable person
is not underwritable.

**Is this an established counterparty?** A held price needs age, plus either depth
or breadth of use. Time is the one input nobody can buy retroactively, and a
dormant address that merely happens to be old does not qualify.

**Did borrowed money come back?** A held price survives a liquidation or an open
loan. Settling nothing until arrival does not: being caught short before is
evidence about this exact risk, and money already committed elsewhere is exposure.
Never having borrowed is neutral, not negative.

**Is enough at stake to defer?** The last step also asks for size and a longer
record, because it hands over the most.

So the busiest wallet does not automatically get the best terms. One of our test
addresses borrowed and repaid tens of thousands of dollars and was still
liquidated twice: it earns a held price, not a room on credit. Every decision
shows the single fact that produced it, and the demo never prints a threshold —
the bands and their reasoning live in
[`packages/context-bands-mcp/SKILL.md`](packages/context-bands-mcp/SKILL.md).

This is underwriting, not a score. There is no ranking, no points, and no
percentage anywhere in the product.

## Disclosures

**Hotel inventory.** Rooms, rates and prebook holds come from **RateHawk**, a
third-party B2B hotel API. We reach it through a thin MCP wrapper at flexrep.xyz
that our team deployed before this event; that wrapper is ours, and none of its
code is in this repository. It sits behind an inventory adapter as one
interchangeable source among two: the repo also ships a snapshot captured live
during the event (`fixtures/lisbon.json`), and the demo runs on either. The
gateway, terms engine, context-bands MCP, and web app were all written during the
hackathon.

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

**In-window proof.** The AgentKit agent wallet was registered in AgentBook on World
Chain after hacking start (Sat 2026-07-25). Agent
`0x1597866E3F9870241EebC1153136fDbf71C3CBF3`, tx
`0xfc2fe4d9ddbd26db6005e5328358afb57cc4d8f922c240bcd6b281159f02eeb1`. Details in
`docs/AGENT-REGISTRATION.md`.

## Run

```
npm install
npm run dev:gateway   # Hono gateway :3000
npm run dev:web       # race demo :5173
npx context-bands-mcp        # standalone MCP over stdio
npx context-bands-mcp --http # same server on :3001, curl-able without a client
```

The context server runs on its own and answers about any address or ENS name:

```
curl -X POST localhost:3001/mcp -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_context_bands","arguments":{"address":"vitalik.eth"}}}'
```

Secrets live in `.env` (see `.env.example`); nothing sensitive is committed.

## Specs

`specs/00-final-plan.md` (canonical plan), `01-gateway.md`, `02-context-bands-mcp.md`,
`03-web-demo.md`, `CUT-ORDER.md`, `KEYS.md`.
