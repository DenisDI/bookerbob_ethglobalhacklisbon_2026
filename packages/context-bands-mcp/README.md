# context-bands-mcp

An MCP server that answers the questions an underwriter would ask about an
address: **how long has it existed, how much and how broadly does it operate, at
what size, and did borrowed money come back?**

It returns four coarse bands (`T0`–`T4`), a repayment signal, and the categories
the address is active in. Never a balance, a count, or a dollar figure. Takes an
ENS name as readily as an address. Agent-facing docs and the full schemas are in
[SKILL.md](./SKILL.md).

The axes are independent on purpose. A single total collapses into "did more,
gets more", which is a scoreboard; the addresses worth looking at are the ones
whose axes disagree. The busiest one we sampled has a real repayment record and
two liquidations behind it.

```bash
GRAPH_API_KEY=... npx context-bands-mcp          # stdio
GRAPH_API_KEY=... npx context-bands-mcp --http   # :3001, curl-able
```

## Why it is not a wrapper

- **Registry, not hardcoded ids.** Sources live in `registry/*.json`. Adding a
  subgraph that speaks a known schema is one file and zero code.
- **Freshness gate.** Every query also reads `_meta`. Past 24h a source stops
  counting and the band becomes `unavailable`, never a lower tier. A stale tier
  is worse than no tier.
- **Declared counting strategy.** Data quality differs per deployment, so each
  manifest says whether it is read from counters or entity lists. See the note
  in `registry/aave-v3-ethereum.json` for the reason that field exists.
- **Retired sources keep their reasons.** `registry/retired/` records ids that
  died and why, instead of deleting them quietly.
- **Offline tests.** `npm test` runs the band engine against recorded gateway
  responses with no network and no key, including the ENS paths and the filter
  that stops unresolvable label records from donating tenure.
- **Two transports.** stdio for MCP clients, HTTP for a terminal. Neither is a
  wrapper around the other.
- **A second consumer.** `scripts/example-bands-agent.ts` at the repo root is a
  gated group chat, unrelated to this project's own gateway.

## Add your own subgraph

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

Drop it in `registry/`. A schema nobody has taught the server yet takes one more
file in `src/templates/` that returns `{ category, actions, saturated, present }`.

## Development

```bash
npm test                                   # offline, recorded responses
npx tsx scripts/debug-readings.mts 0x...   # what each source said, per address
npx tsx scripts/capture-fixtures.mts       # re-record the test fixtures
```
