---
name: context-bands-mcp
description: >-
  Underwriting bands for an EVM address or ENS name, computed from live subgraphs
  on The Graph: how long it has existed, how much and how broadly it operates, at
  what size, and whether borrowed money came back. Use when you need to gate,
  rank, or underwrite by what a wallet has actually done, without reading
  balances or holdings.
---

# context-bands-mcp

Answers the questions an underwriter would ask about an address, and returns
coarse bands instead of numbers.

Never a balance, a count, or a dollar figure. That is a deliberate boundary: an
agent can decide from a band, and a band does not publish someone's portfolio.

## Tools

### `get_context_bands(address)`

Takes an address or an ENS name.

```json
{
  "address": "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
  "ens": { "name": "vitalik.eth", "createdAt": 1497775154 },
  "since": 2017,
  "bands": { "activity": "T4", "tenure": "T4", "breadth": "T4", "scale": "T4" },
  "signals": { "repayment": "no_credit_history" },
  "activeCategories": ["dex"],
  "freshness": [
    { "subgraph": "uniswap-v3-ethereum", "blockNumber": 25609792, "ageSeconds": 22, "status": "live" },
    { "subgraph": "aave-v3-ethereum", "blockNumber": 25609792, "ageSeconds": 22, "status": "live" }
  ],
  "source": "the-graph"
}
```

An address with no history is `T0` on every axis with an empty category list, and
that is a successful answer, not an error.

**`status` values.** `live` counted, `stale` ignored, `error` ignored with a
reason in `detail`. If every source is unusable, every band is `"unavailable"` —
never `T0`. Treat `unavailable` as "ask again later", never as "inactive".

### `resolve_name(name)`

`vitalik.eth` to an address, with the date the name was registered. Useful on its
own: people type words, contracts need hex.

### `get_supported_subgraphs()`

The active registry plus retired entries with the reason each dropped out.

## The four bands

They are independent on purpose. A single total would collapse into "did more,
gets more", which is a scoreboard rather than an assessment, and the interesting
addresses are the ones whose axes disagree.

| Band | T2 | T3 | T4 | Why this axis |
|---|---|---|---|---|
| `activity` | 5 actions in a category | 25 across 2+ categories | 100 in one category | how much was done |
| `tenure` | 90 days | 1 year | 3 years | time cannot be bought retroactively |
| `breadth` | 3 venues | 10 venues | 30 venues | one market thirty times ≠ thirty markets once |
| `scale` | $1k | $25k | $250k | tells $1k from $100k, never prints either |

`T1` means the axis registered at all, `T0` means nothing was found. 100 is also
the query page size, so above it the server stops distinguishing rather than
pretending to. `tenure` counts an ENS registration date as well, since a 2017
name predates most activity.

## The repayment signal

`signals.repayment` is not a band and not a ranking:

| Value | Meaning |
|---|---|
| `no_credit_history` | never borrowed. Neutral, not negative: most addresses are here |
| `clean` | borrowed and repaid, no liquidations |
| `liquidated` | has been liquidated |

It exists because "did borrowed money come back" is the one question that decides
whether settlement can be deferred, and it is answerable from public data.

**A band is not a person.** The busiest addresses on these subgraphs are routers
and settlement contracts: the top Aave v3 Ethereum account by position count has
87224 positions and zero deposits. Bands describe behaviour. If you need to know
a human is involved, get that from a credential.

## Sources and schemas

| Source | Schema | Role | Counted from |
|---|---|---|---|
| aave-v3-ethereum / arbitrum / base | Messari lending | lending | entity lists |
| gmx-arbitrum | Messari perpetuals | perps | counters |
| uniswap-v3-ethereum | Uniswap V3 native | dex | entity lists |
| ens-mainnet | ENS | naming | names, both directions |

Why two counting strategies: in the Messari Aave v3 deployments every Account
action counter reads 0, verified against an account holding a real $1463.67
deposit whose `depositCount` was still 0. The entity lists are correct, so those
sources are counted from lists. GMX maintains its counters properly and is read
from them. Each manifest declares which applies, and the band engine never learns
the difference.

Queries actually issued:

```graphql
# Messari lending: activity, tenure, size and repayment in one request.
# liquidates = acted AS a liquidator. liquidations = was liquidated. Not the same.
query Lending($a: ID!) {
  account(id: $a) {
    firstDeposit: deposits(first: 1, orderBy: timestamp, orderDirection: asc) { timestamp }
    deposits(first: 100, orderBy: timestamp, orderDirection: desc) { amountUSD }
    borrows(first: 100, orderBy: timestamp, orderDirection: desc) { amountUSD }
    repays(first: 100, orderBy: timestamp, orderDirection: desc) { amountUSD }
    liquidations(first: 100) { id }
    positions(first: 50) { market { id } }
  }
  _meta { block { number timestamp } }
}

# Uniswap V3 has no Account entity, so the address is reached through its events.
query Dex($a: Bytes!) {
  first: swaps(first: 1, where: { origin: $a }, orderBy: timestamp, orderDirection: asc) { timestamp }
  swaps(first: 100, where: { origin: $a }, orderBy: timestamp, orderDirection: desc) {
    timestamp amountUSD pool { id }
  }
  positions(first: 100, where: { owner: $a }) { id pool { id } }
  _meta { block { number timestamp } }
}
```

**ENS names need filtering.** The subgraph returns names whose label preimage it
does not know as `acompany.[5b27bed6...].eth`. Those are undisplayable, and
placeholder addresses collect them: `0x1111...1111` carries two dating from 2017,
which would have handed it three decades of tenure it never earned. Names
containing a bracket are skipped.

## Run

```bash
GRAPH_API_KEY=... npx context-bands-mcp     # stdio
```

Inside this repo the same key may be exported as `LISBON2026_GRAPH_API_KEY`,
which takes precedence. `GRAPH_API_KEY` stays the name for anyone reusing the
package: a reusable server should not demand a project-specific variable.

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
  "role": "activity",
  "category": "lending",
  "countStrategy": "entities"
}
```

A new schema means one file in `src/templates/` returning a `Reading`, and
nothing else.
