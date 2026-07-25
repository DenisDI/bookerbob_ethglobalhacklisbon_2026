# Hackathon build: "the agent gateway that knows who it serves"

Working name ideas: **Vouched** / **BookerBob** / **RealRate** (pick one, not "REP").
Scratch track. All code written during the event. External services consumed via public
APIs and disclosed (REP API, JMPR API). AI usage attributed in README. Commit hourly.

## One-liner

A booking gateway where the terms of the deal depend on who is really behind the agent:
an anonymous bot gets limits and prepayment, a human-backed agent with verified context
gets member inventory, member rates, and pay-later.

## Components (5 pieces, ~all TypeScript)

```
repo/
  apps/gateway/        Hono server: the star. Terms Engine + orchestration + demo API
  apps/web/            One clean split-screen demo page (bot view vs verified view)
  packages/context-bands-mcp/   NEW open-source MCP server (the Graph prize artifact)
  docs/FEEDBACK-identity.md     World Identity Check beta feedback (the beta prize artifact)
  docs/AI-ATTRIBUTION.md        where/how Claude Code was used (required by rules)
  specs/               specs + prompts used with AI (rules require them in repo)
```

### 1. Gateway + Terms Engine (`apps/gateway`)
The weekend-built brain. Input: a booking request from an agent/user. Pipeline:

1. **Who's behind you?** Verify World **AgentKit** proof: is this agent acting on behalf
   of a real, unique human? (server-side verification of the AgentKit credential)
2. **Are you eligible?** World **Identity Check**: age / jurisdiction attributes
   (needed for real travel commerce: age gates, jurisdiction rules)
3. **What's your real context?** Two sources, both by wallet/handle the user consents to share:
   - `context-bands-mcp` -> The Graph (live onchain activity bands)
   - REP public API (existing production service, disclosed) -> verified achievement
     bands: onchain facts (e.g. Hyperliquid volume tier, DeFi activity) + X/Twitter
     bands (followers tier, smart-followers tier)
4. **Terms Engine** -> tier + terms matrix (below)
5. **Inventory**: JMPR API (live hotels, real rates) -> apply terms -> respond
6. Anonymous/unverified agents hit an **x402 paywall**: pay per request in USDC, hard
   rate limit. Verified human-backed agents: free quota. (This IS "economic terms" from
   the World prize text, and x402 earns bonus points on the Graph tooling track.)

Terms matrix (demo values):

| Tier | Who | Inventory | Price | Payment | Rate limit |
|---|---|---|---|---|---|
| Bot | no AgentKit proof | 3 basic hotels | base | 100% prepay | x402 pay-per-call |
| Human | AgentKit ok | full list | base | deposit | normal |
| Verified | + context bands >= threshold | + member inventory | base -10% | pay later | none |
| Elite | + top bands (e.g. HL $1M+ tier) | + suites | base -15% + perks | pay later | none |

### 2. `context-bands-mcp` (the Graph AI Tooling submission)
A REUSABLE MCP server, standalone open-source package with SKILL.md:
- Tools: `get_context_bands(address)`, `get_protocol_activity(address, category)`
- Implementation: queries **Messari Standardized Subgraphs** through The Graph network
  (one shared schema across lending/DEX/perp protocols -> one query pattern, many
  protocols), live data only (Subgraph Studio API key), never mocks
- Output: coarse bands, not raw values ("defi_volume: T4($100k+)", "active_chains: 3+")
- Optional: x402 payment gating for the MCP itself (pay-per-query) - bonus points
- Judged on: usefulness to other builders (30%) + reusability (25%) -> README, SKILL.md,
  one-command run, clear schema docs

### 3. Web demo (`apps/web`)
One page, split screen, the money shot:
- LEFT: anonymous bot -> 3 hotels, $250, prepay, "rate limited, pay per request"
- RIGHT: human-backed + verified -> 12 hotels incl. member suites, $225, pay later
- A "verify yourself" flow: World ID -> Identity Check -> connect wallet/handle ->
  watch your own terms change live. Judges can try their own wallet.

### 4. World beta feedback docs (the Identity beta submission)
`docs/FEEDBACK-identity.md`: developer feedback (SDK/API friction, docs gaps, setup
issues) + user feedback (UX, comprehension, drop-off). Written DURING integration,
not after. This document IS the judged artifact. Same optionally for Selfie Check.

### 5. Specs + attribution
`specs/` with the prompts/specs driving Claude Code (rules require full artifacts);
`docs/AI-ATTRIBUTION.md` mapping which files were AI-assisted.

## Data flow (end to end)

```
Agent (user's) ──► Gateway
                    │ 1. verify AgentKit credential (World)         [human-backed?]
                    │ 2. Identity Check attributes (World)          [age/jurisdiction]
                    │ 3. MCP: get_context_bands(wallet)
                    │      └► The Graph: standardized subgraphs     [live onchain bands]
                    │ 4. REP API (external, disclosed)              [achievement bands:
                    │                                                onchain + twitter]
                    │ 5. Terms Engine -> tier + terms
                    │ 6. JMPR API: hotel_search / rates             [live inventory]
                    ◄─ offers with tier-applied terms
Agent ────────────► book -> Gateway -> JMPR booking (terms enforced: deposit vs pay-later)
```

## Prize mapping (choose 3 at submission on Sunday)

| Prize | 1st | What must be true | Our artifact |
|---|---|---|---|
| World AgentKit New Use Cases | $4,000 | AgentKit meaningful, end-to-end flow, NEW trust model. NEVER say "reputation"; say terms/access/economics | Gateway + demo |
| Graph Best AI Tooling | $2,500 | Reusable infra, live Graph data, open-source, SKILL.md | context-bands-mcp |
| World Identity Check Beta | $2,000 | Meaningful use (eligibility signal) + dev & user feedback docs | Gateway gate + FEEDBACK-identity.md |
| Reserve: World Selfie Beta | $2,000 | Same shape as Identity beta | swap-in if Identity flow struggles |
| Reserve: Graph AI Use Case | $2,000 | Agent reasons over live Graph data | the gateway itself qualifies |

Also submit to Finalist (separate, does not consume the 3 slots).

## Submission checklist (each prize)
- Public repo, hourly commits all weekend, no old code anywhere
- 2-4 min demo video per prize, showing the split screen + live wallet check
- Text: exactly which partner features used and where in code (file paths)
- Graph: name the subgraphs/endpoints used; live data proof
- World: end-to-end AgentKit flow visible in video; betas: feedback docs linked
- Disclose: "consumes public REP API and JMPR API as external services; all project
  code built this weekend"

## Day plan
- Fri: repo + skeleton; AgentKit hello-world verified server-side; first standardized
  subgraph query returns bands; JMPR search wired raw
- Sat AM: Terms Engine + split-screen page; Sat PM: Identity Check + feedback doc,
  MCP packaged with SKILL.md, x402 gate; record first video
- Sun 04:00 freeze; one ~3:00 race video (see FINAL-PLAN / DEMO-IMPROVEMENTS); Finalist form
