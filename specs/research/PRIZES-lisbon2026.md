# ETHGlobal Lisbon 2026 — Partner Prizes (official)

Source: https://ethglobal.com/events/lisbon2026/prizes  
Captured: Fri 2026-07-24. Scratch track unless marked Continuity.

**Slot rule (ETHGlobal):** if a partner has multiple tracks, you can be eligible for
all of them while counting as **1 Partner Prize** toward the 3-prize limit.
Finalist is separate and does not consume a partner slot.

---

## Recommended 3 slots for BookerBob gateway

| # | Partner slot | Submit into (all ride same slot) | Why |
|---|---|---|---|
| 1 | **World** | AgentKit New Use Cases + Selfie Check Beta | Core product: human-backed vs bot changes deal terms. Selfie = eligibility gate + required feedback doc. |
| 2 | **The Graph** | Best AI Tooling + Best AI Use Case + Composable/Standardized | `context-bands-mcp` = Tooling; gateway consuming live bands = Use Case; Messari multi-schema = Composable. |
| 3 | **Hedera** | AI & Agentic Payments | Bot-tier x402 settle on `hedera:testnet` (exact idea in their brief). |

Skip for Scratch: all Continuity-only prizes. Skip Identity Check as primary beta unless booth unlocks preview; keep Selfie as default World beta.

---

## Fit score vs our product

Legend: **GO** ship this weekend · **MAYBE** if spare hours · **NO** wrong shape / Continuity

| Prize | Pool | Fit | Notes |
|---|---|---|---|
| World AgentKit New Use Cases | $8,000 | **GO** | Exact story: bot vs human-backed → access, rate limits, economic terms, commerce. |
| World Selfie Check Beta | $1,750 | **GO** | Eligibility / abuse gate + FEEDBACK doc. Selfie + Identity full access available this weekend per World about. |
| World Identity Check Beta | $1,750 | **MAYBE** | Same judged shape; contact-gated historically — ask booth; do not block on it. |
| Graph Best AI Tooling | $5,000 | **GO** | Standalone MCP + SKILL.md + live data. Primary Graph artifact. |
| Graph Best AI Use Case | $3,000 | **GO** | Gateway agent reasons over live Graph bands → terms. Bonus if MCP also ships. |
| Graph Composable/Standardized | $3,000 | **GO** | Lending + DEX + perps Messari schemas, one query pattern. |
| Hedera AI & Agentic Payments | $6,000 | **GO** | Their own example: "x402 Pay-Per-Use Gateway". |
| Hedera Tokenization / No Solidity / Axelar | — | **NO** | Different product surface; do not dilute. |
| ENS Best Integration for AI Agents | $1,500 | **MAYBE** | Cheap add-on (agent name / text records) if Sunday spare; not a slot priority. |
| Uniswap / 1inch / 0G / Sui | — | **NO** | Wrong stack for this weekend build. |

---

# 1. World — $15,000

Stack for verified humans + AI-assisted interactions: World ID, AgentKit, Selfie Check,
Identity Attestations. Selfie and Identity Check full access available during hackathon weekend.

Preferred feedback themes (for beta docs): time-to-integrate, blockers, docs/SDK friction,
whether Selfie helped you act (block/gate/step-up), POH vs Selfie cohort differences,
overall keep/expand sentiment.

### AgentKit New Use Cases — $8,000
Places: 1st $4,000 · 2nd $2,500 · 3rd $1,500

**Pitch they want:** service can tell "a bot" from "an agent acting on behalf of a real,
unique human." Human-backed agents change access, authorization, rate limits, economic
terms, payments, commerce, moderation, or accountability.

**Required**
- Uses AgentKit in a meaningful way
- Verifies an agent is human-backed
- Working end-to-end flow (not wrapper / static demo)

**Will not qualify** (reuse of prior hackathon patterns without a genuinely new workflow,
vertical, or trust model), examples:
- Agent reputation
- Human-backed agent interactions in simple content generation
- Human-backed benefits for AI agents (API calls, discounts) *as a shallow reused pattern*

**Our framing (critical):** identity as **underwriting** (see `FINAL-PLAN.md`). No
discounts. Risk terms: prepay / deposit / rate-lock pay-later / pay-at-checkout.
Demo = race of two agents, not a feature tour (`specs/DEMO-IMPROVEMENTS.md`).

Docs: https://docs.world.org/agents/agent-kit/integrate

### Selfie Check Beta — $1,750
Places: 1st $1,000 · 2nd $750

Low-friction selfie credential (live person, no Orb). Beta = build + testing docs.

**Required**
- Meaningful use: risk, eligibility, fairness, continuity, or abuse-prevention (not generic login)
- Testing docs: developer feedback + user feedback
- Working app / e2e prototype

Docs: https://docs.world.org/world-id/credentials/11

### Identity Check Beta — $1,750
Places: 1st $1,000 · 2nd $750

Verified attributes (age, jurisdiction, uniqueness, document-backed) beyond proof of human.

**Required**
- Meaningful use: risk, eligibility, compliance, personalization, or abuse-prevention
- Dev + user feedback testing docs
- Working app / e2e prototype
- Explain why the attribute is necessary and how data collection is minimized

Docs: https://docs.world.org/world-id/idkit/credentials#identity-check-preview

### Continuity-only (Scratch: skip)
- Selfie Check Beta — Continuity ($1,750)
- Identity Check Beta Test — Continuity ($1,750)

### World resources
- Docs: https://docs.world.org/
- Docs MCP: https://docs.world.org/model-context-protocol
- Dev Portal MCP: https://docs.world.org/model-context-protocol/developer-portal
- Workshop: Fri Jul 24 16:30 WEST, Workshop Room — AgentKit / Selfie / Identity

### Our World artifacts
| Artifact | Path / surface |
|---|---|
| AgentKit verify on 402 | `apps/gateway` x402 + AgentKit extension |
| Selfie eligibility gate | `VerifyFlow` + offer eligibility line |
| Feedback doc | `docs/FEEDBACK-selfie.md` (Identity section if unlocked) |
| Demo beat | split-screen: bot pays / human-backed gets terms |

---

# 2. The Graph — $15,000

Indexing/query layer; Subgraphs, Substreams, Subgraph MCP, x402 pay-per-query.

Note: partner "About" blurb prize split differs slightly from prize cards below.
**Use prize-card amounts as canonical.**

### Best AI Tooling for The Graph — $5,000
Places: 1st $2,500 · 2nd $1,500 · 3rd $1,000

Reusable infrastructure for AI envs (Claude/Cursor/ChatGPT): MCP servers, agent SKILLs,
x402 payment tooling, A2A, framework plugins, one-click configs. Featured: Substreams
SKILLs one-prompt deploy challenge.

Examples that match us:
- Cross-protocol MCP fanning one query across shared standard schema
- Layered MCP unifying several Standardized Subgraph schemas

**Judging:** Usefulness to other builders 30% · Reusability & completeness 25% ·
Effective use of The Graph 20% · Technical execution 15% · Innovation 10%

**Required**
- Reusable tooling/infra (MCP, SKILL, plugin, config, payment tooling) — **not** a single end-user app alone
- Live blockchain data (Studio / Graph Market / self-hosted e.g. Nuthatch). No mocks/static
- Open-source with clear README or SKILL.md
- Public repo + 2–4 min demo video

Links:
- AI overview: https://thegraph.com/docs/en/ai-overview/
- x402 payments: https://thegraph.com/docs/en/subgraphs/tooling/x402-payments/
- Standardized Subgraphs: https://thegraph.com/docs/en/subgraphs/existing-subgraphs/standard-subgraphs
- Substreams skills: https://github.com/streamingfast/substreams-skills

### Best AI Use Case of The Graph — $3,000
Places: 1st $2,000 · 2nd $1,000

AI agent/app with The Graph as live blockchain data source. Bonus for also shipping
reusable SKILL or MCP.

**Judging:** Effective use 35% · Usefulness & impact 25% · Technical execution 20% ·
Innovation 10% · Demo & clarity 10%

**Required**
- Graph is load-bearing (Subgraphs / Subgraph MCP / Substreams / Nuthatch)
- Live data only
- AI/agent component that **reasons or acts** on data (not raw print)
- Public repo + 2–4 min video
- Briefly name Subgraphs / endpoints / tools used
- Built during event (open-source starters OK)

### Best Use of Composable or Standardized Graph Products — $3,000
Places: 1st $2,000 · 2nd $1,000

Standardized Subgraphs (one schema across protocols), compose Substreams packages,
layer Subgraph MCP for cross-protocol analysis.

**Judging:** Leverage of composability/standards 35% · Breadth 20% · Technical execution 20% ·
Usefulness 15% · Demo & clarity 10%

**Required**
- Compose 2+ Graph products **or** meaningfully use a standardized schema (e.g. Messari)
- Live data only
- Single Subgraph with no composition/standardization does **not** qualify
- Make standards leverage obvious in demo
- Public repo + 2–4 min video

### Continuity-only (Scratch: skip)
- Best AI Use Case (Continuity) — $4,000

### Graph resources
- Hackathon resources: https://thegraph.com/blog/hackathon-resources/
- Studio API key: https://thegraph.com/studio/
- Messari subgraphs: https://github.com/messari/subgraphs
- Subgraph MCP: https://thegraph.com/docs/en/subgraphs/tooling/subgraph-mcp/introduction/
- Workshop: Fri Jul 24 15:30 WEST — Building AI Agents on The Graph

### Our Graph artifacts
| Artifact | Maps to |
|---|---|
| `packages/context-bands-mcp` + SKILL.md | AI Tooling (primary) |
| Gateway Terms Engine using bands | AI Use Case |
| Messari lending + DEX + perps bands | Composable/Standardized |
| Optional MCP x402 in + Graph x402 out | Tooling bonus / keyless pitch |

---

# 3. Hedera — $15,000

EVM + native services (HTS, HCS, Schedule). Focus for us: agentic payments.

### AI & Agentic Payments on Hedera — $6,000
Up to **2 teams × $3,000**

Agents that discover services, negotiate terms, settle payments on Hedera. Tooling:
Hedera Agent Kit, OpenClaw ACP, x402, A2A, or Hedera SDKs.

**Their starter idea that is us:**
> x402 Pay-Per-Use Gateway — Wrap APIs with x402 payments. Agents pay per request in HBAR, no keys or subscriptions.

**Required**
- AI agent or multi-agent system executes ≥1 payment / token transfer / financial op on **Hedera Testnet**
- Use ≥1 of: Hedera Agent Kit (JS/TS or Python), OpenClaw ACP, x402, A2A, or Hedera SDKs
- Public GitHub + README (setup, architecture, payment flow)
- ≤5 min demo video of autonomous payment actions

**Extra points (optional)**
- Multi-agent negotiation (A2A / OpenClaw ACP)
- x402 pay-per-request
- On-chain agent identity (ERC-8004 or HCS-14)
- UCP discovery
- HTS custom fees / royalties
- Scheduled Transactions
- HCS audit trails
- Hedera CLI automation

Links:
- Agent Kit JS/TS: https://github.com/hashgraph/hedera-agent-kit
- x402: https://www.x402.org/
- scaffold x402-pay-per-use: https://github.com/hedera-dev/scaffold-hbar/tree/templates/x402-pay-per-use
- x402 Hedera example: https://github.com/matevszm/x402-hedera-example
- Workshop: Fri Jul 24 17:00 WEST — Hedera x Claude Code

### Other Hedera prizes (not our focus)
| Prize | Pool | Why skip |
|---|---|---|
| Tokenization on Hedera | $3,000 (2×$1,500) | RWA/HTS product, not gateway |
| "No Solidity Allowed" SDK-only | $3,000 (3×$1,000) | Would force rewrite away from EVM x402 path |
| Cross-Chain Automation Hub (Schedule + Axelar) | $2,000 (2×$1,000) | Heavy Axelar loop; wrong weekend scope |
| Autonomous On-Chain Automation (Continuity) | $1,000 | Continuity only |

### Our Hedera artifact
**Scheduled Transaction** at prebook for pay-later tiers (`packages/hedera-schedule`),
HashScan schedule URL on the finale card, `POST /book` executes. Autonomous
`npm run demo -w @bookerbob/hedera-schedule`. x402-on-Hedera is cuttable garnish,
not the headline.

---

# 4. Other partners (reference only)

### 1inch — $7,000
- Build an Aqua App — $5,000 (SwapVM scored higher). Continuity Aqua — $2,000.
- Needs Aqua/SwapVM onchain demo. **NO fit.**

### 0G — $15,000
- Best AI Product — $6,000 (needs 0G Compute/Private Computer inference)
- Best Infrastructure & Tooling — $4,500 (3×$1,500)
- Keep Building Continuity — $4,500
- **NO fit** unless pivoting stack to 0G Compute.

### Uniswap Foundation — $10,000
- Best Uniswap API Integration — $7,000 (**requires** FEEDBACK.md + Uniswap feedback form)
- Best Uniswap Stack Contribution Continuity — $3,000
- **NO fit** for travel gateway core.

### Sui — $6,000
- Best app on Sui — $4,000 (2×$2,000). Continuity port/integrate — $2,000.
- **NO fit.**

### ENS — $5,000
- Most Creative Use — $1,500
- Best ENS Integration for AI Agents — $1,500 (present at ENS booth Sunday AM)
- Continuity — $2,000
- **MAYBE** cosmetic agent naming if spare time; not a primary slot.

---

## Submission checklist (cross-cutting)

Scratch:
- [ ] All project code written during event; hourly commits; no prior project code in repo
- [ ] External deployed APIs OK if disclosed (booker MCP, REP API)
- [ ] Max 3 partner prizes (+ Finalist separate)
- [ ] Partner multi-tracks count as 1 slot

Per partner video / text:
- [ ] World: AgentKit e2e visible; Selfie meaningful gate; feedback doc linked; never "reputation"
- [ ] Graph: name subgraphs/endpoints; live data proof; MCP README + SKILL.md; 2–4 min video
- [ ] Hedera: ≥1 real Hedera Testnet payment; ≤5 min video; README payment flow

---

## Decision log

| Date | Decision |
|---|---|
| 2026-07-24 | Primary slots: World + Graph + Hedera |
| 2026-07-24 | World beta default = Selfie; Identity only if booth unlocks |
| 2026-07-24 | Graph submit all three Scratch Graph prizes under one partner slot |
| 2026-07-24 | Hedera = Agentic Payments only (x402 pay-per-use on gateway) |
| 2026-07-24 | AgentKit pitch = travel economic terms / trust model, not "discounts for humans" |
