# FINAL PLAN — BookerBob gateway (ETHGlobal Lisbon 2026)

> **Pre-event research / executable architecture spec.**  
> Public-docs excerpts + battle-test + demo WOW pass. **No project application code
> before Fri 21:00 WEST.** Commit as `specs/00-final-plan.md`. Sources: prizes page,
> `specs/BATTLETEST-FINDINGS.md`, `specs/DEMO-IMPROVEMENTS.md`. Supersedes
> `ARCHITECTURE-EXEC.md` on conflicts.

Deadline: Sun Jul 26 **04:00 WEST freeze**. Draft + placeholder video **Sat evening**.
Scratch. Names OK: **BookerBob** / Vouched / RealRate. Do not brand "REP".

**Open + close sentence (video):**
> Who is behind an agent changes the terms it gets.

**Product one-liner (booth / README):**
> Verified human backing plus onchain context earns a rate lock now and a
> Hedera-scheduled settlement later; anonymous bots prepay per query over x402.

---

# A. ABSOLUTE RULES

## A.0 Convergent finding (rules + tech + judges)

Plan v1 core ("human-backed agents get discounts and access") is the World prize's
**literally banned pattern**. Renaming the word without changing the mechanic still
fails; a noticed word-scrub reads as evasion.

**Fix that moves all three rooms:** personhood as **underwriting**. Credential
changes **risk terms**, not price. Discounts deleted from product, copy, demo, video.
Pay-later = real **Hedera Scheduled Transaction** (create at prebook, execute at
checkout, **HashScan on screen** — never only a tx id in a header).

| Partner | Why this fix works |
|---|---|
| World | Risk transfer + booking finality = new trust model, off the ban list |
| Hedera | Schedule is the headline mechanism, not a bolted-on accepts entry |
| Graph | Bands = underwriting signal for who earns deferred settlement |

## A.1 Lexicon (product surface)

Banned on UI / README product story / video / booth / submission one-liner:

| Banned | Why |
|---|---|
| discount / % off / −10% / −15% / cheaper for humans | World DQ example |
| "human-backed benefits" / rewards as the story | Same shallow pattern |
| agent reputation / trust score / karma as product framing | World DQ + scoreboard |

**Do not** put a repo slogan "never say reputation" — counsel: that reads as proof of
intent. Instead ship mechanics that avoid the pattern + honest background:

> Team members have worked on context / achievement-band products. This Scratch
> project is a new build: identity and consented onchain context underwrite payment
> and inventory **risk terms**. Not an agent scoreboard.

Free-trial quota (if used): frame as **anti-farming / sybil-resistant rate limiting**,
not a perk.

Allowed: underwriting · risk terms · prepay · deposit · rate lock · pay later ·
pay at checkout · human-backed · context bands · Scheduled Transaction · HashScan ·
eligibility

```bash
rg -i 'discountPercent|% off|−10|−15|-10%|-15%|elite discount|cheaper for humans' \
  apps packages README.md
rg -i 'trust score|sybil score|agent reputation' apps packages README.md
# both empty on product paths
```

## A.2 Underwriting matrix (discounts deleted)

Same rate sheet. Different risk.

| Tier | Who | Inventory | Payment / settlement |
|---|---|---|---|
| Bot | no AgentKit | `basic` (3) | **100% prepay** (+ optional x402 per query) |
| Human | AgentKit ok | `full` | **Deposit** |
| Verified | + bands | `member` | **Rate lock + pay later** (Hedera schedule at prebook) |
| Elite | + top bands | `elite` | **Pay at checkout** (schedule executes) |

`Terms = { tier, inventory, payment }` —
`payment ∈ { prepay_100, deposit, rate_lock_pay_later, pay_at_checkout }`.
**No `discountPercent`. No price multiplier.**

Offer card order (finale UI = real booking card, not JSON): photo → name → stars →
nightly rate (no % banner) → inventory → underwriting term → "rate locked" +
`book_hash` → "settlement scheduled: [date]" + **HashScan page open**.

Tier matrix lives in **README only**. It does **not** appear as a feature tour in
the video (§J = race + story).

## A.3 Counsel / Scratch DQ rules (precise)

### CRITICAL — flexrep ownership

Hiding team ownership behind "pre-existing external API" = one whois → bad-faith →
**full-event DQ risk**.

**Required before building on flexrep:**
1. Ownership-explicit README wording (name the team/company that built it).
2. **Written organizer sign-off Friday night** in Discord **before** depending on it.
3. Save link/screenshot in `docs/DISCLOSURE-SIGNOFF.md`.
4. Inventory adapter with **in-event second source** (`fixtures/lisbon.json`).
5. Live prebook beat = **epilogue**, not judged core (reduce dependency risk).

Template:
> Inventory MCP at flexrep.xyz (RateHawk-backed). **Ownership: [EXPLICIT NAME].**
> Disclosed to ETHGlobal organizers in Discord on [DATE]; written acknowledgment in
> docs/DISCLOSURE-SIGNOFF.md. No prior application code from that service is in this
> repo. Gateway / terms / context-bands MCP / web were written during the hackathon.
> Adapter also serves pinned fixture inventory captured in-event.

### CRITICAL — pre-event assets clock

| Asset | Rule |
|---|---|
| This plan / ARCHITECTURE-EXEC / battle-test | OK as specs with pre-event header |
| Application code | Only after Fri **21:00 WEST** |
| AgentBook registration + World Portal app | Create **after Fri 21:00**; keep **tx hash** as in-window proof |
| flexrep sign-off | Friday night before build-on |

### HIGH — other DQ

| Risk | Rule |
|---|---|
| Multi-track = 1 slot | Correct for ETHGlobal counting; partners often pay **best-of not sum**. Verify submission form mechanics **Saturday** before dumping hours into Hedera extras |
| Videos | **One video only**, 2–4 min, target **3:00**. Not three. |
| Freeze / upload | Freeze **Sun 04:00**. Draft submission + placeholder video **Sat evening** |
| Reused reference code | README section **Reused / Referenced** (matevszm, scaffolds); update the moment a fallback fires |
| Judge wallet beat | Must appear **in the video** with a public known / showcase address (partners judge from materials) |
| AI attribution | Workflow: prompt + generated code committed **together**; `AI-ATTRIBUTION.md` updated **in the same commit** as each file |
| Submission text | Name **only working** integrations. No Identity Check padding if desk never unlocks |

### MEDIUM

- Live-data rule for Graph context ≠ hotel fixtures ("cached inventory" UI tag OK).
- booker exact path: `https://flexrep.xyz/mcp_travel/mcp` (bare paths 301/405; MCP
  clients do not replay POST through 301).

---

# B. Product path + demo story (WOW Factor)

ETHGlobal scores **WOW Factor**. Unfair advantage: **real hotels + real money live**.
Demo is a **race**, not a feature tour. Full writeup: `specs/DEMO-IMPROVEMENTS.md`.

## B.1 Runtime path

1. Agent → `/offers` (same prompt both panes: "book me a hotel in Lisbon").
2. AgentKit Plan A → Human vs Bot risk tier; gateway emits `narration[]` steps.
3. Selfie Phase A → eligibility for deferred settlement.
4. Address/ENS text + 3 showcase (whale T4 / mid T2–T3 / fresh) → ETH Graph bands.
   Fresh empty line (scripted, not apology): *"no onchain history yet. Human terms
   via the credential alone."*
5. Terms engine → underwriting enums (no price delta).
6. Inventory adapter → flexrep **or** fixtures; pinned hotel id Fri night.
7. Verified/Elite prebook → Hedera ScheduleCreate → HashScan **on screen**.
8. Finale: hotel **card** (photo, stars, RateHawk price) + rate lock + schedule.
9. Bot: x402 cents; wallet/spent counter ticks down. Hedera x402 settle cuttable.

## B.2 Split-screen race (watchable)

| | LEFT — bot | RIGHT — verified |
|---|---|---|
| Prompt | identical: book Lisbon hotel | identical |
| Pay | x402 cents; **"spent: $X.XX and counting"** | **"spent: $0.00"** |
| Inventory | 3 basic | full / member |
| Settlement | 100% prepay | rate locked + Hedera schedule |
| Feed | narration console streaming | narration console streaming |

## B.3 Narration console (highest leverage, ~1–2h in step 8)

Gateway already knows every decision → emit `narration` field per step → chat-like
feed beside each pane. Shows World judges **agent decisions**, not wired hooks.

Copy style: **lowercase, warm, no crypto jargon on the surface.** Protocol names
stay in a small dev pane if needed, not the story.

Example lines:
- "no credential here. paying $0.01 for this query"
- "my human is verified. requesting terms on their standing"
- "context confirmed: active on aave and uniswap. asking for pay-later"
- "rate locked. settlement scheduled for checkout day"

## B.4 Money counters (30m, survive first if step 8 shrinks)

Persistent header per pane: bot spent ticking up on every 402; verified stays $0.00.
Visceral signal-vs-noise of the product.

## B.5 Finale booking card (1h)

Not JSON. Card + video line: *"an AI agent just locked a real hotel room and paid
for the data it needed, on its own."* Prep: pinned hotel id Fri night; Sat 23:00
safety take as backup.

## B.6 Demo polish cut priority (inside step 8 only)

These are **not** "polish to cut" for WOW — but if step 8 shrinks:
1. Keep **money counters** (item 3)
2. Keep **finale hotel card** (item 4)
3. Degrade narration to **static captions** (item 2)

Main `CUT-ORDER.md` feature cuts unchanged.

---

# C. Slots

| # | Partner | Tracks | Load-bearing |
|---|---|---|---|
| 1 | World | AgentKit + Selfie Beta | Underwriting delta; FEEDBACK-selfie.md |
| 2 | Graph | Tooling + Use Case + Composable | MCP that is real infra (§D.3) |
| 3 | Hedera | Agentic Payments | Scheduled Tx + HashScan |

+ Finalist. Continuity skip. Identity only if live.

---

# D. Partner bars (battle-test judge panel)

## D.1 World — off the ban list

- Risk terms, not price. Show beyond wiring hooks: e.g. **humanId + Selfie nullifier
  combined in one term decision**, and/or Portal MCP self-provisioning beat.
- Free-trial = anti-farming rate limit, not perk.
- FEEDBACK bar: exact versions, failing bodies, which sig paths worked, wall-clock per
  step, 2–3 concrete API asks. Adjectives are worthless.

## D.2 Selfie — 6–9h phased

| Phase | Hours | Kill |
|---|---|---|
| A browser simulator (staging, no phone) | 4–6h | Whole Selfie UI kill **Sat 18:00** → keep FEEDBACK doc |
| B on-device | 2–3h | Auto-cancel **Sat 22:00** |

## D.3 Graph — not "a wrapper wearing infrastructure clothes"

1st-place bar for MCP (must ship):

| Requirement | Detail |
|---|---|
| Manifest registry | Add a subgraph as JSON entry, no code change |
| Freshness metadata | stale → `band unavailable` (never silently wrong tier) |
| Keyless x402 loop | **Demo-critical** (Base mainnet USDC), not optional garnish |
| Second consumer | 15-line agent example, not only our gateway |
| Offline fixture tests | CI/local tests without live Graph |
| SKILL.md | Real schemas |
| Threshold rationale | Documented why T1–T4 |

Bands: Ethereum mainnet. Subgraph `_meta` + whale probe **Fri night** (not Sat AM).
Kill ungreen IDs by **Sat 02:00**. Uniswap v3 ETH may be stale; dex query needs
extended-4.0.1 schema; GMX IDs conflict (out of ETH-only scope unless we expand).

**Graph x402:** `testnet.gateway.thegraph.com` = **NXDOMAIN**. Mainnet route live:
~$0.01/query, Base mainnet USDC, EIP-3009 gasless. Fund **$2–5 USDC** on Base;
weekend <$3. Fallback: Studio key (weaker pitch). Kill mainnet-not-green **Sat 01:00**.

## D.4 Hedera — load-bearing Schedule

| Piece | Role |
|---|---|
| ScheduleCreate at prebook / execute at checkout | **Headline** — survives alone |
| HashScan on screen | Required UX |
| HCS receipt notarization | ~10 lines garnish |
| x402 hedera:testnet settle | Optional; facilitator confirms support ~55–65% |

x402-Hedera traps: `payTo` must **ASSOCIATE** testnet USDC; faucet availability;
heavy `@hiero-ledger/sdk`. Kills: smoke **10:00** → Blocky402 **14:00** → drop
settle **16:00** (Schedule + HCS remain).

Autonomous script for schedule path required. README: Hedera schedule flow.

---

# E. Engineer-verified (live Fri night)

| Finding | Law |
|---|---|
| Graph x402 testnet NXDOMAIN | Base mainnet USDC $2–5 only |
| `createAgentBookVerifier` in `@worldcoin/agentkit-core` not `agentkit` | Correct imports |
| Hook signature mismatch (~10 lines glue) | Plan A decoupled middleware |
| Peer `@x402/paywall` | Install if paying path needs it |
| AgentKit×x402 extension | 90-min spike; **kill Sat 01:30** → Plan A permanent |
| Judge wallets null 60–80% | Text address/ENS + 3 showcase; null-state story |
| Subgraphs | Fri night `_meta` on candidate IDs; survivors only |
| booker path | Exact `/mcp_travel/mcp`; disposable sessions + retry-reinit + fixtures |
| Timeline ~1 workday over | Follow `specs/CUT-ORDER.md` |

**Plan A AgentKit (default ~2h):** plain Hono middleware before paywall — parse
header, validate SIWE + nonce, AgentBook lookup, else fall through to x402/prepay.
No composition of two betas required for World e2e.

---

# F. MUST / SHOULD / CUT

### NEVER CUT
Skeleton · Bot-vs-Human underwriting delta · standalone MCP (registry + SKILL +
fixture tests + freshness) · Hedera Schedule + HashScan · one video slot · Sat 23:00
safety take

### MUST
1. Underwriting only (zero discounts)
2. flexrep sign-off + ownership + fixtures before depending on live MCP
3. AgentKit Plan A; registration after 21:00 + tx hash
4. Selfie Phase A + FEEDBACK-during-build (or kill UI 18:00, keep doc)
5. Graph MCP 1st-place bar (§D.3)
6. Address/ENS + 3 showcase in **video** (not wallet-connect-only)
7. Hedera ScheduleCreate + execute + HashScan **page on screen** + autonomous script
8. One video ~3:00 as **race** (§J); Sat eve draft upload; Sun 04:00 freeze
9. Demo WOW in step 8: counters + finale card + narration (or captions) — §B.6
10. AI attribution same-commit workflow
11. Reused/Referenced README section
12. `specs/CUT-ORDER.md` + `specs/DEMO-IMPROVEMENTS.md` committed Fri night

### SHOULD
- Graph keyless mainnet x402 in demo (still demo-critical for Graph 1st bar)
- HCS garnish
- Portal MCP self-provisioning beat
- humanId ⊕ Selfie nullifier in one decision
- Streaming narration (degrades to static captions under time)

### CUT ORDER
See `specs/CUT-ORDER.md`: MCP inbound pay → Selfie B → Hedera x402 settle →
WalletConnect encore.

---

# G. Build order + Friday-night mandatory

## G.1 Friday night BEFORE sleep (mandatory)

1. Organizer **written** sign-off on flexrep disclosure (Discord) → `DISCLOSURE-SIGNOFF.md`
2. booker: curl exact `/mcp_travel/mcp`, capture `fixtures/lisbon.json`, **pin hotel id**
   for finale card
3. 90-min spike: x402 + AgentKit glue (correct imports + `@x402/paywall`). **Kill 01:30**
4. AgentKit registration via World App **after 21:00**, save tx hash
5. Fund Base mainnet **$2–5 USDC** + Studio key backup; `_meta` probe candidate
   subgraph IDs; whale-query survivors; **then** write `bands.ts`. **Kill 02:00**
6. Commit `specs/CUT-ORDER.md` + `DEMO-IMPROVEMENTS.md` + this plan. Hedera account +
   **USDC association** + faucet check. Verify 3 showcase addresses.

## G.2 Build steps (after 21:00 code clock)

| Step | Hours | What | Acceptance |
|---|---|---|---|
| 1 | 1h | Repo, workspaces, commit specs | Runs |
| 2 | 2–3h | Inventory adapter flexrep + fixtures + pinned hotel | Offline fixtures work |
| 3 | 2h | Underwriting terms + **race** split screen shell | Two panes, same prompt; no %; no tier matrix in UI tour |
| 4 | 2h | AgentKit Plan A + `narration` events from gateway | Bot vs Human; decisions emit |
| 5 | 4–5h | MCP: registry, freshness, fixtures tests, SKILL, second consumer | `npx` + tests green |
| 6 | 4–6h | Selfie Phase A + FEEDBACK live | Risk terms gated |
| 7 | 3–5h | Hedera Schedule + HashScan **in UI** (not header-only) | On-screen HashScan |
| 8 | **3–4h** | Demo WOW (§B): counters + narration feed + hotel finale card; agent scripts; Graph x402 in demo | Race watchable; spent counters; card not JSON |
| 9 | Sat eve | Draft texts + placeholder video; **23:00 safety take** of finale | Uploaded |
| 10 | Sun 04:00 | Freeze, final ~3:00 race video, scrub, submit | Checklists |

---

# H. Repo skeleton

```
bookerbob/
  README.md                 §A one-liner; ownership disclosure; Reused/Referenced; Hedera schedule
  specs/
    00-final-plan.md
    CUT-ORDER.md
  docs/
    AI-ATTRIBUTION.md       updated same commit as generated files
    DISCLOSURE-SIGNOFF.md
    FEEDBACK-selfie.md      versions, failing bodies, wall-clock, API asks
    TEAM-BACKGROUND.md
  fixtures/lisbon.json
  scripts/
    agent-schedule-hedera.ts
    example-bands-agent.ts  # second Graph consumer (~15 lines)
  apps/gateway/
    src/terms.ts
    src/inventory.ts        # flexrep | fixtures; retry-reinit; pinned hotel
    src/world.ts            # Plan A AgentKit + Selfie; humanId⊕nullifier
    src/context.ts
    src/hederaSchedule.ts
    src/narration.ts        # decision → warm plain-English lines
    src/x402.ts             # bot metering; spent totals for counters
  apps/web/
    src/App.tsx             # RACE split: same prompt, dual agents
    src/SpentCounters.tsx   # bot spent vs $0.00
    src/NarrationFeed.tsx   # chat-like streaming (or static captions)
    src/HotelFinaleCard.tsx # photo, stars, price, book_hash, HashScan
    src/AddressBands.tsx    # text + 3 showcase; null-state story
    src/VerifyFlow.tsx
  packages/context-bands-mcp/
    registry/*.json         # manifest: add subgraph without code
    SKILL.md
    src/server.ts bands.ts freshness.ts
    src/x402.ts             # Base mainnet Graph pay — demo-critical
    tests/fixtures.test.ts
```

---

# I. Networks

| Layer | Network |
|---|---|
| Bands | Ethereum mainnet (survivors of Fri `_meta` probe) |
| Graph keyless pay | Base **mainnet** USDC $2–5 (not testnet gateway) |
| Hedera prize | Hedera **testnet** Schedule (+ optional HCS) |
| AgentKit | World Chain; register after 21:00 |

---

# J. Video v2 (one, **3:00 max**, dense) — race not tour

Tier matrix **not** in video (README only). Density > coverage.

| Time | Beat |
|---|---|
| 0:00–0:10 | Sentence: "who is behind an agent changes the terms it gets" |
| 0:10–1:00 | **The race:** both agents run; spent counters tick; narration streams |
| 1:00–1:40 | **Context:** whale address typed; Messari bands live; tier flips; MCP standalone + outbound x402 to Graph |
| 1:40–2:15 | **Finale:** hotel card, rate lock, HashScan scheduled settlement |
| 2:15–2:35 | Selfie gate + one FEEDBACK-doc screen |
| 2:35–2:50 | Sentence again over two counters frozen side by side |

Per-prize submission TEXT opens with timestamp map, e.g. Graph: `"your integration: 1:00-1:40"`.

Guardrails on camera: no % discounts; bands not raw values; warm narration; no crypto
jargon in story feed.

---

# K. Checklists

### World
- [ ] No discounts; underwriting story
- [ ] Race shows **decisions** (narration), not only hooks
- [ ] Free-trial = anti-farming if shown
- [ ] FEEDBACK: versions, failures, wall-clock, API asks
- [ ] AgentKit register tx hash after 21:00

### Graph
- [ ] Manifest registry + freshness + fixture tests + second consumer + SKILL schemas
- [ ] Keyless Base mainnet x402 in demo (timestamp ~1:00–1:40)
- [ ] Showcase whale address in video
- [ ] No NXDOMAIN testnet gateway; bands not raw on screen

### Hedera
- [ ] Schedule create + execute + **HashScan page on screen** (finale card)
- [ ] Autonomous script
- [ ] README schedule flow
- [ ] USDC association if using x402 settle; settle cuttable by 16:00
- [ ] Only Agentic Payments track

### Demo / WOW
- [ ] Race UI: same prompt both panes
- [ ] Spent counters ($ ticking vs $0.00)
- [ ] Narration feed or static captions
- [ ] Hotel finale card (not JSON) + book_hash
- [ ] Tier matrix absent from video
- [ ] Sat 23:00 safety take of finale

### Counsel / ops
- [ ] Flexrep ownership + Discord sign-off before build-on
- [ ] Fixtures + pinned hotel id
- [ ] Reused/Referenced section
- [ ] AI attribution same-commit
- [ ] One ~3:00 race video; Sat eve draft upload; Sun 04:00 freeze
- [ ] Submission form multi-track mechanics verified Sat
- [ ] Only working integrations named
- [ ] `specs/CUT-ORDER.md` + `DEMO-IMPROVEMENTS.md` committed

---

# L. Decision log

| Date | Decision |
|---|---|
| 2026-07-24 | Battle-test adopted: underwriting core; discounts deleted |
| 2026-07-24 | Hedera backbone = Scheduled Tx + HashScan on screen |
| 2026-07-24 | Graph testnet x402 dead; Base mainnet $2–5; keyless demo-critical |
| 2026-07-24 | AgentKit Plan A; extension kill 01:30 |
| 2026-07-24 | Selfie 6–9h; kill UI 18:00 keep FEEDBACK |
| 2026-07-24 | Address/ENS + 3 showcase; null-state story |
| 2026-07-24 | Flexrep ownership + Fri night written sign-off + fixtures |
| 2026-07-24 | One video ~3:00; freeze 04:00; Sat eve upload |
| 2026-07-24 | MCP 1st-place bar: registry, freshness, second consumer, tests |
| 2026-07-24 | CUT-ORDER.md; AgentBook/Portal after 21:00 |
| 2026-07-24 | Prebook live beat = epilogue; multi-track = verify best-of Sat |
| 2026-07-24 | ARCHITECTURE-EXEC demoted; this file canonical |
| 2026-07-24 | DEMO-IMPROVEMENTS: race not tour; narration; spent counters; hotel finale card; video v2 timestamps |
