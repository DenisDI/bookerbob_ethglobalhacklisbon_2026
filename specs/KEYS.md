# KEYS & ACCOUNTS — FairTerms (ETHGlobal Lisbon 2026)

What you need, where to get it, when. Put secrets only in `.env` (never commit).
**Canonical rules:** `FINAL-PLAN.md` (supersedes older Graph-testnet / x402-Hedera notes).

Priority: **P0** = block coding soon · **P1** = Sat · **P2** = optional / booth.

---

## Quick checklist

| # | Need | Priority | Signup? | Where |
|---|---|---|---|---|
| 1 | GitHub public repo | P0 | yes | github.com |
| 2 | Booker MCP access (flexrep) | P0 | ask team / service owner | https://flexrep.xyz/mcp_travel/mcp |
| 3 | REP public API access | P0 | ask team / service owner | your REP API docs / key |
| 4 | World Developer Portal app | P0 | yes | https://developer.world.org |
| 5 | World App (teammate) for AgentKit register | P0 | yes | World App + CLI |
| 6 | Selfie Sandbox / TestFlight | P0 | Apple ID for TestFlight | links below |
| 7 | Graph Studio API key **or** Graph x402 on **Base mainnet** | P0 | yes | Studio and/or ~$2–5 real USDC on Base (testnet Graph x402 gateway = NXDOMAIN) |
| 8 | Hedera testnet account + keys | P0 | yes | portal.hedera.com — **Scheduled Tx** backbone (prebook/checkout) |
| 9 | ETHGlobal Discord sign-off on flexrep ownership | P0 | yes | Post today; save in `docs/DISCLOSURE-SIGNOFF.md` |
| 11 | World Developer Portal MCP api_ key | P2 | yes | Dev Portal |
| 12 | Identity Check access | P2 | booth | World desk Fri |

---

## 1. World

### 1.1 Developer Portal app (Selfie / IDKit)

| Item | Env suggestion | Where |
|---|---|---|
| `app_id` | `LISBON2026_WORLD_APP_ID` | https://developer.world.org → create app |
| `rp_id` | `LISBON2026_WORLD_RP_ID` | same app → relying party |
| `signing_key` | `LISBON2026_WORLD_SIGNING_KEY` | same app → signing key (backend pre-sign) |

Flow: Portal app → backend signs with `@worldcoin/idkit-core/signing` → IDKit in
browser → verify `POST https://developer.world.org/api/v4/verify/{rp_id}`.

Docs:
- Selfie: https://docs.world.org/world-id/credentials/11
- Identity (if unlocked): https://docs.world.org/world-id/idkit/credentials#identity-check-preview
- AgentKit: https://docs.world.org/agents/agent-kit/integrate

### 1.2 Selfie Check Sandbox (no separate API key beyond Portal)

| Item | Where |
|---|---|
| Sandbox env | IDKit `environment: "sandbox"` |
| TestFlight (device) | https://testflight.apple.com/join/VZEurhHe |
| Browser simulator | https://simulator.worldcoin.org (`environment: "staging"`) |

### 1.3 AgentKit registration (not an API key — onchain + World App)

| Item | Where / how |
|---|---|
| Agent wallet private key (dev) | Generate locally; keep in `.env` as `LISBON2026_AGENT_PRIVATE_KEY` |
| Register command | `npx @worldcoin/agentkit-cli register <agent-address>` |
| Approver | One teammate with **verified World App** approves the tx (World Chain) |
| Verify | On-chain AgentBook lookup (no Portal key for verify itself) |

Chains used: World Chain (480), Base (8453).

### 1.4 World Developer Portal MCP (optional, build-time)

| Item | Where |
|---|---|
| Docs MCP | https://docs.world.org/mcp — **no auth** |
| Portal MCP | https://developer.world.org/api/mcp — Bearer `api_…` from Dev Portal |

Not required for runtime verify.

### 1.5 Identity Check (optional P2)

Ask World booth Friday. If granted, same Portal app pattern + document credential
in World App. Do not block weekend on this.

---

## 2. The Graph

### 2.A Preferred for demo reliability: Studio gateway key

| Item | Env | Where |
|---|---|---|
| Studio API / gateway key | `LISBON2026_GRAPH_API_KEY` | https://thegraph.com/studio/ → API keys |
| Query URL shape | — | `POST https://gateway.thegraph.com/api/<KEY>/subgraphs/id/<SUBGRAPH_ID>` |

Hackathon free tier: unclear — ask `@graphhackers` Telegram / Graph booth if rate-limited.

Dev-only explorer MCP (not runtime): https://subgraphs.mcp.thegraph.com/sse (same Studio key).

### 2.B Keyless path (Graph bonus): x402 on **Base mainnet**

| Item | Env | Where |
|---|---|---|
| No Graph API key | — | `POST https://gateway.thegraph.com/api/x402/subgraphs/id/{id}` |
| ~~Testnet Graph gateway~~ | — | **DOES NOT EXIST (NXDOMAIN)** — do not use |
| Payer wallet | `LISBON2026_GRAPH_USDC_KEY` | Base **mainnet** wallet with **$2–5 USDC** (weekend budget) |
| Client package | — | `@graphprotocol/client-x402` |

Docs: https://thegraph.com/docs/en/subgraphs/tooling/x402-payments/

**Plan:** Studio key Fri default; optional mainnet x402 Sat for keyless pitch.

### 2.C Subgraph IDs (not secrets)

Listed in `ARCHITECTURE-EXEC.md` §4 (Messari lending / DEX / perps). Confirm sync in
https://thegraph.com/explorer before hardcoding.

---

## 3. Hedera — **Scheduled Transaction backbone** (prize path)

Locked in `FINAL-PLAN.md` §A.6 / §D.4. Prize story = Schedule Service, not x402-Hedera.

| Item | Env | Where |
|---|---|---|
| Testnet account id | `LISBON2026_HEDERA_ACCOUNT_ID` | https://portal.hedera.com |
| Private key | `LISBON2026_HEDERA_PRIVATE_KEY` | portal (download once) |
| Operator / payer for schedules | same or second testnet account | faucet HBAR |
| Network | — | Hedera **testnet** |
| Docs | — | Schedule Service + SDK; templates/payments-scheduler on scaffold-hbar |

Optional x402-on-Hedera metering is **not** the prize backbone if facilitator is flaky.

### 3.B Optional — Graph x402 payer (Base mainnet USDC)

| Item | Env | Where |
|---|---|---|
| Real USDC on Base | `LISBON2026_GRAPH_USDC_KEY` | Bridge/buy ~$2–5 USDC on Base mainnet |
| Do not use | — | Graph x402 testnet gateway (NXDOMAIN) |

---

## 5. Inventory — booker MCP (external)

| Item | Env | Where |
|---|---|---|
| MCP endpoint | `LISBON2026_BOOKER_MCP_URL` | https://flexrep.xyz/mcp_travel/mcp |
| Auth / session | `LISBON2026_BOOKER_TOKEN` or session header | **ask whoever runs flexrep** (team / service docs) |
| Session header | — | `mcp-session-id` after init (per ARCHITECTURE-EXEC) |

RateHawk-backed. Prebook/book may themselves require x402 — confirm with service owner Fri.
Disclose in README as external deployed API.

---

## 6. External context bands API ("REP public API")

| Item | Env | Where |
|---|---|---|
| Base URL | `LISBON2026_CONTEXT_API_URL` | your production REP public API base |
| API key (if any) | `LISBON2026_CONTEXT_API_KEY` | team / service dashboard |

**Naming:** in code/env use `LISBON2026_CONTEXT_API_*`. In README disclose vendor as
"REP public API" only if required; describe as activity/achievement bands — never
"reputation API" (see `FINAL-PLAN.md` §A).

---

## 7. GitHub / demo ops

| Item | Where |
|---|---|
| Public repo | github.com — create empty repo before first code commit |
| Deploy (optional) | Vercel/Fly/Railway for gateway + web if judges need URL |
| Discord / Telegram | ETHGlobal + partner channels for key issues |

---

## Suggested `.env` template (do not commit values)

```bash
# World
LISBON2026_WORLD_APP_ID=
LISBON2026_WORLD_RP_ID=
LISBON2026_WORLD_SIGNING_KEY=
LISBON2026_AGENT_PRIVATE_KEY=

# Graph
LISBON2026_GRAPH_API_KEY=
# Optional keyless: Base MAINNET wallet with $2-5 USDC (not testnet gateway)
LISBON2026_GRAPH_USDC_KEY=

# Hedera Scheduled Tx backbone (prize)
LISBON2026_HEDERA_ACCOUNT_ID=
LISBON2026_HEDERA_PRIVATE_KEY=

# Inventory (ownership must be disclosed — see FINAL-PLAN §A.7)
LISBON2026_BOOKER_MCP_URL=https://flexrep.xyz/mcp_travel/mcp
LISBON2026_BOOKER_TOKEN=

# Optional disclosed context bands API
LISBON2026_CONTEXT_API_URL=
LISBON2026_CONTEXT_API_KEY=
```

Add `.env` to `.gitignore` on repo init (step 1).

---

## Fri night mandatory (before sleep) — from battle-test

1. Discord **written** flexrep ownership sign-off → `docs/DISCLOSURE-SIGNOFF.md`  
2. Curl exact `https://flexrep.xyz/mcp_travel/mcp` → capture `fixtures/lisbon.json` + **pin hotel id** for finale card  

3. 90-min AgentKit×x402 glue spike (correct imports + `@x402/paywall`); **kill 01:30**  
4. AgentKit register + World Portal app **after 21:00 WEST**; save **tx hash**  
5. Fund Base mainnet **$2–5 USDC** + Studio key; `_meta` probe subgraphs; whale survivors; **then** bands; kill 02:00  
6. Commit `specs/CUT-ORDER.md` + FINAL-PLAN; Hedera account + **associate testnet USDC** + faucet  
7. GitHub Scratch repo + `.gitignore` when code clock opens  

Do **not** use Graph x402 testnet gateway (NXDOMAIN).

---

## What needs NO key / no signup

| Thing | Note |
|---|---|
| World Docs MCP | No auth |
| Messari subgraph IDs | Public; not secrets |
| Inventory fixtures | Local second source |

---

## Owners (fill in)

| Asset | Owner teammate | Done? |
|---|---|---|
| Discord flexrep sign-off | | [ ] |
| World Portal + Selfie | | [ ] |
| AgentKit register (World App) | | [ ] |
| Graph Studio key | | [ ] |
| Base mainnet USDC for Graph x402 | | [ ] |
| Hedera schedule operator | | [ ] |
| Booker MCP + ownership line | | [ ] |
| Context bands API | | [ ] |
| GitHub repo admin | | [ ] |
