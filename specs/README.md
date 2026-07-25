# specs

## Read these

| File | What it is |
|---|---|
| [`00-final-plan.md`](00-final-plan.md) | **Canonical.** Product rules, the underwriting matrix, partner bars, build order, checklists. On any conflict this file wins. |
| [`01-gateway.md`](01-gateway.md) | Gateway: routes, identity, x402 metering, Hedera schedule, narration |
| [`02-context-bands-mcp.md`](02-context-bands-mcp.md) | The context-bands MCP: tools, registry, freshness, band rationale |
| [`03-web-demo.md`](03-web-demo.md) | The web demo: the race, its components, its hard rules |
| [`CUT-ORDER.md`](CUT-ORDER.md) | What gets cut, in what order, and the hard kill clocks |
| [`KEYS.md`](KEYS.md) | Which key or account each block needs, and where to get it |
| [`DEMO-IMPROVEMENTS.md`](DEMO-IMPROVEMENTS.md) | Why the demo is a race rather than a feature tour |
| [`prompts/`](prompts) | The prompt behind each build step, committed with the code it produced |

## What is written and what is not

The specs describe the intent. Where the running code disagrees with a spec, the
code is right and the disagreement is recorded in the prompt file for that step
(`prompts/step-*.md`) and in `docs/FEEDBACK-graph.md`. Nothing in here is silently
out of date.

Known departures so far, all measured rather than assumed:

| Spec says | Reality |
|---|---|
| `01-gateway.md`: 2s inventory timeout | the supplier's one-shot call takes 7 to 15 seconds, so it is 25s for search and 5s for metadata |
| `02`: bands from Messari counters | every Aave v3 action counter reads 0 on all three networks, so activity is counted from entity lists |
| `02`: one `defi_activity` band | four independent bands plus a repayment signal, because one total reads as a scoreboard |
| `02`: `--http :3001` | now real; it was exiting with code 2 while the README advertised it |
| `02`: keyless x402 to The Graph | **not built.** It needs a funded Base wallet to run even once, and nothing unverified gets named |

## specs/research — archive, do not build from it

`research/` is the pre-event material: the earlier plan, the battle test, the prize
notes, the first architecture pass. It is kept because the reasoning is useful and
because the team shares one set of reference docs. It is **not** current.

Specifically, these are now known to be wrong in it:

- three of the seven listed subgraph ids are unusable (two return `subgraph not
  found`, one `no allocations`); the live ones are in
  `packages/context-bands-mcp/registry/`, and the dead ones in `registry/retired/`
  with the reason each dropped out
- the Messari Aave account action counters it builds thresholds on are all zero
- `testnet.gateway.thegraph.com` does not resolve, so there is no test environment
  for the keyless route
- `fairterms-infra.html` keeps its old filename: the product was renamed to
  BookerBob after it was written

The earlier plan that lived here as `FINAL-PLAN.md` was an exact copy of
`00-final-plan.md` apart from its header, so it was removed rather than kept as a
second plan to guess between. It is in git history if anyone wants it.
