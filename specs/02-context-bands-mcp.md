# SPEC 02 — context-bands-mcp (packages/context-bands-mcp)

> The Graph-prize artifact. Standalone, reusable, judged on usefulness (30%) and
> reusability (25%). 1st-place bar from 00-final-plan D.3: manifest registry,
> freshness, keyless x402, second consumer, offline tests, SKILL.md, threshold
> rationale. NOT "a wrapper wearing infrastructure clothes".

## What it is

MCP server (stdio + http) that computes coarse activity BANDS (T1..T4) for a wallet
address from live Messari standardized subgraphs. Output is bands only, never raw
values. Runs with zero API keys via x402 pay-per-query to The Graph gateway.

## Tools (SKILL.md documents these schemas for agents)

```
get_context_bands(address) ->
  { bands: { defi_activity: "T3", active_categories: ["lending","dex"] },
    freshness: [{ subgraph, blockLag, ageSeconds, status: "live"|"stale" }],
    source: "the-graph:messari-standardized" }
get_supported_subgraphs() -> registry contents
```

## Manifest registry (the reusability move)

`registry/*.json`, one entry per subgraph. Adding a subgraph = adding a JSON entry,
zero code change:

```json
{
  "name": "aave-v3-ethereum",
  "schemaType": "lending",
  "subgraphId": "JCNWRypm7FYwV8fx5HhzZPSFaMxgkPuw4TnR3Gpi81zk",
  "network": "mainnet",
  "queryTemplate": "lending-account",
  "bandInputs": ["depositCount", "borrowCount", "openPositionCount"]
}
```

Query templates keyed by Messari schema type live in `src/templates/` (lending,
dex-amm-extended, perps). README section: "add your own subgraph in 5 lines".

## Verified queries (field names checked against Messari schemas)

Account id = LOWERCASE address. `account: null` = T0/none, not an error.

lending (Aave v3; eth `JCNWRypm...`, arb `4xyasjQe...`, base `D7mapexM...`):
```graphql
query($account: ID!) { account(id: $account) {
  positionCount openPositionCount depositCount withdrawCount borrowCount repayCount
  liquidateCount liquidationCount } }
```
`liquidateCount` = acted as liquidator (positive); `liquidationCount` = got
liquidated (negative). Do not swap.

dex (EXTENDED 4.0.1 schema only, e.g. Uniswap v3 eth `ELUcwgpm...`):
```graphql
query($account: ID!) { account(id: $account) {
  swapCount depositCount positionCount
  swaps(first: 100, orderBy: timestamp, orderDirection: desc) {
    timestamp amountInUSD } } }
```
Base 1.3.2 dex schema has NO Account.swapCount: the template declares
`schemaType: "dex-amm-extended"` and refuses base-schema deployments.

Scope: Ethereum-mainnet-first (survivors of the Fri-night `_meta` probe). GMX/perps
only if its ID conflict resolves green.

## Freshness (never silently wrong)

`src/freshness.ts`: every query also fetches `{ _meta { block { number timestamp } } }`.
ageSeconds > 24h -> that subgraph's contribution becomes `band: "unavailable"` and
the freshness entry says `stale`. A stale tier is worse than no tier.

## Bands + rationale

`src/bands.ts` with a RATIONALE comment block per threshold:
T1 = account exists. T2 = 5+ combined counts. T3 = 25+ counts across 2+ categories.
T4 = 100+ counts. Documented reasoning: tuned so a typical active DeFi wallet lands
T2-T3 (calibrated against the 3 showcase addresses Fri night).

## Keyless x402 (demo-critical, NOT optional)

`src/x402.ts`: pays The Graph per query on Base MAINNET (testnet gateway is
NXDOMAIN, verified). `POST https://gateway.thegraph.com/api/x402/subgraphs/id/{id}`
-> 402 -> pay ~$0.01 USDC (EIP-3009, gasless) -> data. Wallet: LISBON2026_GRAPH_USDC_KEY with
$2-5 USDC. Package: `@graphprotocol/client-x402` (createGraphQuery) or manual 402
handling via `@x402/fetch`. Fallback: LISBON2026_GRAPH_API_KEY (Studio) with the pitch degraded;
kill decision Sat 01:00 per CUT-ORDER.
Optional inbound charging (first thing cut): x402 on the http transport.

## Second consumer (usefulness proof)

`scripts/example-bands-agent.ts` (~15 lines): unrelated use case, allowlist gating
by band. Plus README claude_desktop_config.json snippet so anyone wires it into
Claude in ten minutes.

## Offline tests

`tests/fixtures.test.ts`: recorded subgraph responses in `tests/fixtures/`; bands +
freshness computed offline, `npm test` green with no network. Judges can run it.

## Run

`npx context-bands-mcp` (stdio) and `--http :3001`. One command, documented first
in README.
