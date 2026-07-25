# context-bands-mcp

An MCP server that answers one question: **how much has this address actually
done onchain, roughly?**

It returns a coarse band (`T0`–`T4`) and the categories the address is active in.
Never a balance, a count, or a dollar figure. Agent-facing docs and the full
schemas are in [SKILL.md](./SKILL.md).

```bash
GRAPH_API_KEY=... npx context-bands-mcp
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
  responses with no network and no key.
- **A second consumer.** `scripts/example-bands-agent.ts` at the repo root is a
  gated group chat, unrelated to this project's own gateway.

## Add your own subgraph

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

Drop it in `registry/`. A schema nobody has taught the server yet takes one more
file in `src/templates/` that returns `{ category, actions, saturated, present }`.

## Development

```bash
npm test                                   # offline, recorded responses
npx tsx scripts/debug-readings.mts 0x...   # what each source said, per address
npx tsx scripts/capture-fixtures.mts       # re-record the test fixtures
```
