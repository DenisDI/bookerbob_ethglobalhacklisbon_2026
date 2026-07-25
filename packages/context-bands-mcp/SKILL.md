---
name: context-bands-mcp
description: >-
  Coarse onchain activity bands (T0-T4) for an EVM address, computed from live
  subgraphs on The Graph. Use when you need to gate, rank, or underwrite by how
  much a wallet has actually done, without reading balances or holdings.
---

# context-bands-mcp

Answers one question: **how much has this address actually done onchain, roughly?**

Output is a band and a list of categories. Never a balance, a count, or a dollar
figure. That is a deliberate boundary: an agent can decide with a band, and a
band does not publish someone's portfolio.

## Tools

### `get_context_bands(address)`

```json
{
  "address": "0x62e2ceb6933a0747579f4f9f96d3253a7af0b237",
  "bands": { "defi_activity": "T4" },
  "activeCategories": ["dex", "lending"],
  "freshness": [
    { "subgraph": "aave-v3-ethereum", "blockNumber": 25609675, "ageSeconds": 22, "status": "live" },
    { "subgraph": "gmx-arbitrum", "blockNumber": 487556442, "ageSeconds": 8, "status": "live" }
  ],
  "source": "the-graph"
}
```

`address` accepts any casing. An address with no history is `T0` with an empty
category list, and that is a successful answer, not an error.

**`status` values.** `live` counted, `stale` ignored, `error` ignored with a
reason in `detail`. If every source is unusable the band is `"unavailable"` —
never `T0`. Treat `unavailable` as "ask again later", never as "inactive".

### `get_supported_subgraphs()`

Returns the active registry plus retired entries with the reason each dropped
out.

## Bands

| Band | Meaning |
|---|---|
| `T0` | address not found in any source |
| `T1` | appears at least once |
| `T2` | 5+ actions inside one category |
| `T3` | 25+ actions across 2+ categories |
| `T4` | 100+ actions in one category, or a saturated page |

100 is also the query page size, so above it the server stops distinguishing
instead of pretending to.

**A band is not a person.** The busiest addresses on these subgraphs are
routers and settlement contracts: the top Aave v3 Ethereum account by position
count has 87224 positions and zero deposits. Bands describe activity. If you
need to know a human is involved, get that from a credential.

## Sources and schemas

| Source | Schema | Category | Counted from |
|---|---|---|---|
| aave-v3-ethereum / arbitrum / base | Messari lending | lending | entity lists |
| gmx-arbitrum | Messari perpetuals | perps | counters |
| uniswap-v3-ethereum | Uniswap V3 native | dex | entity lists |

Why two counting strategies: in the Messari Aave v3 deployments every Account
action counter reads 0, verified against an account holding a real $1463.67
deposit whose `depositCount` was still 0. The entity lists are correct, so those
sources are counted from lists. GMX maintains its counters properly, so it is
read from them. Each manifest declares which applies, and the band engine never
learns the difference.

Queries actually issued:

```graphql
# Messari lending
query Lending($a: ID!) {
  account(id: $a) {
    deposits(first: 100) { id }  withdraws(first: 100) { id }
    borrows(first: 100) { id }   repays(first: 100) { id }
    liquidates(first: 100) { id } liquidations(first: 100) { id }
  }
  _meta { block { number timestamp } }
}

# Uniswap V3 has no Account entity, so the address is reached through the events
query Dex($a: Bytes!) {
  swaps(first: 100, where: { origin: $a }, orderBy: timestamp, orderDirection: desc) { id }
  positions(first: 100, where: { owner: $a }) { id }
  _meta { block { number timestamp } }
}
```

## Run

```bash
GRAPH_API_KEY=... npx context-bands-mcp     # stdio
```

In `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "context-bands": {
      "command": "npx",
      "args": ["context-bands-mcp"],
      "env": { "GRAPH_API_KEY": "your-studio-key" }
    }
  }
}
```

## Add your own subgraph

Drop a file into `registry/`. No code changes if it speaks a schema already
known:

```json
{
  "name": "aave-v3-optimism",
  "schemaType": "messari-lending",
  "subgraphId": "<deployment id>",
  "network": "optimism",
  "category": "lending",
  "countStrategy": "entities"
}
```

A new schema means one file in `src/templates/` returning
`{ category, actions, saturated, present }`, and nothing else.
