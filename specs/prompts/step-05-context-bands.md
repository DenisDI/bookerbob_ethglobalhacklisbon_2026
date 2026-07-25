# Prompt — build step 5 (context-bands-mcp)

Driving specs: `specs/02-context-bands-mcp.md`, `specs/00-final-plan.md` §D.3
(the 1st-place bar) and §G.2 step 5. Tool: Claude Code (Anthropic).

```
ок на нынешнем этапе что тиммейту дать что мне?
[...]
давай эту часть в план моде все же разберем глубже и т.п.
```

The plan was written after probing every subgraph live, because the spec's
assumptions did not survive contact with the gateway.

## What the probe changed

Three of the seven ids in the spec are unusable (`subgraph not found` twice,
`no allocations` once), and the two circulating GMX ids resolved in favour of
`DiR5cWwB…`. Full table and reproductions in `docs/FEEDBACK-graph.md`.

**The threshold design had to be rebuilt.** In all three Messari Aave v3
deployments every `Account` action counter reads 0, proven by an account whose
`depositCount` is 0 next to a real `$1463.67` `Deposit` in its own `deposits`
list. Activity is therefore counted from entity list lengths, and each manifest
declares `countStrategy`, because GMX perpetuals maintains its counters properly
and is read from them instead.

`positionCount` is populated but deliberately unused: the top account by that
field has 87224 positions and zero deposits, and the CoW Protocol settlement
contract ranks as one of the busiest addresses on Ethereum. Bands measure
activity; personhood stays on the credential axis. That reasoning is in the
band module rather than in a doc nobody reads.

Dex was restored with the canonical Uniswap V3 deployment
`5zvR82Qo…`, which is not a Messari schema at all: no `Account`, so the address
is reached through `Swap.origin` and `Position.owner`. It became a third schema
type, which is the clearest proof the registry is real infrastructure and not
decoration.

## Calibration

Thresholds kept the spec's numbers, which held up. Live results:

| Address | Sources hit | Band | Tier with a credential |
|---|---|---|---|
| `0x62e2ce…` | lending 154 (arb) + 17 (eth), dex 2 | T4 | elite, pay at checkout |
| `0x561c75…` | dex 78, lending 5, perps 5 | T3 | verified, rate lock |
| `0x646c5b…` | lending 1 | T1 | human, deposit |
| `0x111111…` | none | T0 | human, deposit |

An address with no credential stays `bot` no matter how high the band: context
without an accountable person is not underwritable, and that now holds in the
running system, not only in a unit test.

Narration was split three ways for the same reason: "no onchain history yet" is
false when the history is merely thin, and false again when the lookup failed.

Verified: typecheck clean, 20/20 gateway tests, 11/11 MCP tests offline with no
key and no network, lexicon clean, `npx context-bands-mcp` answering over stdio,
and the second consumer admitting T3 while turning T1 away.
