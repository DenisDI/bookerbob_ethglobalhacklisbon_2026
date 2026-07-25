# GOAL: ETHGlobal Lisbon 2026, research kits + executable architecture

## Mission
We are at ETHGlobal Lisbon 2026 (deadline Sun Jul 26 09:00 WEST, Scratch track: all project code written during the event). Research the kits below by reading the actual docs/repos, then produce a step-by-step build plan executable in ~30 hours. Output = steps, not a survey.

## Product (fixed, do not redesign)
Booking gateway where deal terms depend on who is behind the agent:
1. World AgentKit credential: real unique human behind the agent?
2. World Identity Check: age/jurisdiction eligibility.
3. Context bands via consented wallet: our NEW open-source MCP querying The Graph (Messari standardized subgraphs) + REP public API (external service, disclosed).
4. Terms Engine tiers: Bot = 3 hotels, prepay, x402 pay-per-call. Human = full list, deposit. Verified = member inventory, -10%, pay later. Elite = suites, perks.
5. Inventory: booker MCP https://flexrep.xyz/mcp_travel/mcp (external, RateHawk-backed, x402 inside prebook/book/reviews). Real rates, bookable.
6. Anonymous agents hit x402 paywall; verified humans get free quota.
Demo: split-screen page, bot view vs verified view, judges try their own wallet.

## Prize targets (3 slots)
1. World AgentKit New Use Cases $8k. HARD RULE: the word "reputation" is banned by their disqualifier list. Frame as terms/access/economics in travel. Working end-to-end flow required.
2. Graph Best AI Tooling $5k. Judged: usefulness 30%, reusability 25%. Artifact: standalone context-bands MCP, open source, SKILL.md, one-command run, LIVE Graph data only. x402 pay-per-query = bonus.
3. World Identity Check Beta $3.5k. Meaningful use + dev/user feedback docs written during integration.
Sat swap-in: Hedera Agentic Payments via their x402 scaffold.

## Research (read the real pages)
World:
- docs.world.org/agents/agent-kit/integrate (integration steps, server-side verify, credential contents, sandbox)
- docs.world.org/world-id/idkit/credentials#identity-check-preview (attributes, flow, test mode)
- docs.world.org/model-context-protocol + /developer-portal (their new MCP: tools exposed, can our agent consume it)
Graph:
- thegraph.com/docs/en/subgraphs/tooling/subgraph-mcp/introduction/ (avoid duplicating it; build on top vs beside)
- thegraph.com/docs/en/subgraphs/existing-subgraphs/standard-subgraphs/ + github.com/messari/subgraphs (pick 3-5 subgraphs across lending/DEX/perps for activity bands; write actual GraphQL)
- thegraph.com/docs/en/subgraphs/tooling/x402-payments/ (mirror their pay-per-query pattern)
x402:
- x402.org (middleware for Hono/Express, payer wallet, testnet story)
- github.com/hedera-dev/scaffold-hbar/tree/templates/x402-pay-per-use + github.com/matevszm/x402-hedera-example (swap-in cost)
Stack: Hono + TypeScript server, Vite/Next split-screen page. Boring and fast.

## Deliverable: ARCHITECTURE-EXEC.md
1. Verdict per kit: what it gives, gotchas, test mode, exact packages. Flag plan contradictions.
2. Repo skeleton (tree, one line per file) incl. specs/, docs/AI-ATTRIBUTION.md, docs/FEEDBACK-identity.md.
3. Ordered build steps: what to write, package/API, acceptance check, hour estimate. Working e2e skeleton by Sat noon, everything after additive.
4. Chosen Messari subgraphs with ready GraphQL + band thresholds.
5. x402 gate middleware plan + optional MCP pay-per-query + Hedera delta.
6. Demo: one ~3:00 race video (see FINAL-PLAN / specs/DEMO-IMPROVEMENTS.md).
7. Risks with fallbacks (Identity Check approval lead time, AgentKit sandbox limits).

## Law
No em dashes. Never "reputation" (say verified context/terms/access). Bands, not raw values. Scratch: no prior code; external deployed APIs legal if disclosed (draft the README disclosure). Live Graph data only. Hourly commits, specs committed.
