# Battle-test findings: BookerBob plan (Fri 2026-07-24, night before build)

> **Archival source.** All fixes adopted into canonical `FINAL-PLAN.md` + `CUT-ORDER.md`.
> `ARCHITECTURE-EXEC.md` is demoted (pre-event research header only).

Three adversarial passes: rules lawyer, tech pre-mortem (live npm/DNS/endpoint checks),
three simulated partner judges. Verdict on plan v1: World submission near-DQ, Graph 3rd
at best, Hedera nothing, one DQ-prone disclosure, timeline over capacity by a workday.

## THE CONVERGENT FINDING (all three passes independently)

Plan v1's core ("human-backed agents get discounts and access") is the World prize's
literally banned pattern. Renaming away from the banned word does not rename the
mechanic, and a noticed word-scrub reads as evasion.

THE FIX THAT MOVES ALL THREE JUDGING ROOMS: personhood as underwriting. The credential
changes RISK terms, not price. Discounts deleted from product, copy, demo, video.
Pay-later implemented as a real Hedera scheduled transaction (created at prebook,
executed at checkout). Result:
- World: risk transfer + booking finality = new trust model, off the ban list.
- Hedera: scheduled tx IS the headline feature's mechanism, not a bolted-on rail.
- Graph: bands become the underwriting signal deciding who earns deferred settlement.
One demo sentence: "verified human backing plus onchain context earns this agent a rate
lock now and a Hedera-scheduled settlement later; anonymous bots prepay per query over
x402."

## RULES LAWYER (DQ risks)

CRITICAL
1. flexrep disclosure hid team ownership. "Pre-existing external API" without "our own
   team built it" = one whois away from a bad-faith finding and full-event DQ.
   Fix: ownership-explicit wording, WRITTEN organizer sign-off Friday night BEFORE
   building on it, inventory adapter with an in-event second source (fixtures),
   prebook beat moved from judged core to epilogue.
2. Banned-pattern collision (see convergent finding above).
3. ARCHITECTURE-EXEC itself is a pre-event design asset. It must be committed (specs
   rule) but with an honest header: "pre-event research, only public-docs excerpts, no
   project code before Fri 21:00". "STATUS: COMPLETE. Buildable as written" removed.

HIGH
4. "Never say reputation anywhere" as a repo instruction = proof of intent if read.
   Fix: honest team-background line in README; the banned word is avoided by mechanics.
5. Multi-track-per-partner = 1 slot reading is CORRECT, but partners in practice pay
   one prize per project, so pool exposure is best-of, not sum. Verify the submission
   form's selection mechanics Saturday before allocating Hedera hours.
6. "3 videos" contradicted the one-video rule. One video, 2-4 min (target 3:00);
   freeze 04:00 not 06:00; submission draft + placeholder video uploaded Sat evening
   (venue wifi at 08:50 Sunday is the classic missed-deadline DQ).

MEDIUM
7. Reused reference code (matevszm example, any scaffold fallback) must be listed in a
   Reused/Referenced README section, updated the moment a fallback fires.
8. Judge-connects-wallet beat exists only live, but partners judge from materials:
   reproduce it in the video with a public known address.
9. AI attribution as workflow, not afterthought: prompt + generated code committed
   together per step, AI-ATTRIBUTION.md updated in the same commit as each file.
10. AgentBook registration and World Portal app must be created AFTER Fri 21:00 (else
    they are pre-event assets); keep the tx hash as in-window proof.
11. Submission text names only working integrations. No Identity Check padding if the
    desk never unlocks it.

## TECH PRE-MORTEM (live-verified Friday night)

CRITICAL
1. testnet.gateway.thegraph.com is NXDOMAIN. The keyless-testnet Graph plan was built
   on a dead hostname. Mainnet x402 route verified live: $0.01/query, Base mainnet
   USDC, eip3009 gasless. Fix: fund one wallet with $2-5 real USDC on Base; the whole
   weekend costs under $3. Fallback (weaker pitch): free Studio key. Kill: mainnet not
   green by Sat 01:00.
2. AgentKit + @x402/hono composition is real but NOT turnkey:
   - createAgentBookVerifier is exported from @worldcoin/agentkit-core, NOT
     @worldcoin/agentkit (v1 import would not compile).
   - Hook signature mismatch: agentkit gives {requestHook(ctx)}, core 2.19 expects
     onProtectedRequest(declaration, context, routeConfig). ~10 lines of glue.
   - @x402/hono has an undeclared-in-plan peer dep @x402/paywall.
   - Plan A is now a DECOUPLED plain Hono middleware before the paywall (parse header,
     validate SIWE + nonce, AgentBook lookup, else fall through to x402). Extension
     mode is a 90-min spike; kill to decoupled at Sat 01:30, permanently.

HIGH
3. Judge's own wallet returns null accounts 60-80% of the time (hot wallets, smart
   accounts). Fix: address/ENS TEXT INPUT primary (no WalletConnect), 3 pinned
   showcase addresses verified Fri night, null-state designed as a story ("no onchain
   context yet, Human tier via credential only").
4. Subgraph verification must happen FRI NIGHT, not Sat AM (bands.ts depends on it):
   _meta block-timestamp probe on all 7 candidate IDs, then whale-query survivors.
   Anything not green by Sat 02:00 is out. Uniswap v3 Ethereum possibly stale; GMX has
   two conflicting IDs; the dex query only works on extended-4.0.1 schema deployments.
5. Selfie Check is 6-9h for first-timers, not 3h. Split: Phase A browser simulator
   (staging env, no phone), Phase B on-device (auto-cancel Sat 22:00). Kill Sat 18:00:
   flag off, keep the feedback doc (the doc is the judged artifact).

MEDIUM
6. booker MCP: exact endpoint is /mcp_travel/mcp (bare paths 301/405, MCP clients do
   not replay POST through 301). Sessions are in-memory on one Fly instance:
   disposable sessions + retry-reinit + fixtures fallback (lisbon.json captured on
   first success, "cached inventory" tag in UI). Live-data rule is scoped to Graph
   context, cached hotels violate nothing.
7. Hedera x402 settle: x402.org/facilitator/supported CONFIRMS hedera:testnet with a
   fee-payer (better than feared, ~55-65%). Remaining traps: payTo must ASSOCIATE
   testnet USDC (classic cryptic failure), Hedera USDC faucet availability, heavy
   @hiero-ledger/sdk. Kills: smoke 10:00, Blocky402 at 14:00, drop settle at 16:00
   (ScheduleCreate + HCS survive, they need no facilitator).
8. Timeline over capacity ~a workday. Critical path is one stack (gateway src),
   parallelism there is fake. Cut order committed to specs/CUT-ORDER.md:
   1st MCP inbound pay-per-query, 2nd Selfie Phase B, 3rd Hedera settle, 4th
   wallet-connect encore. Never cut: skeleton, Bot-vs-Human delta, standalone MCP with
   SKILL.md + registry + fixture tests, reserved video slot, Sat 23:00 safety take.

## JUDGE PANEL (predicted placements v1 -> what moves them)

World (v1: nothing, DQ-lean): flip price to risk (adopted). Free-trial quota framed as
anti-farming (sybil-resistant rate limiting), not a perk. Show something beyond wiring
hooks: humanId + Selfie nullifier combined in one term decision, or the Portal MCP
self-provisioning beat. Feedback doc bar: exact versions, failing bodies, which sig
paths worked, wall-clock per step, 2-3 concrete API asks. Adjectives are worthless.

Graph (v1: 3rd): the MCP as specced is "a wrapper wearing infrastructure clothes"
(5 hardcoded IDs, hand-tuned thresholds). 1st place needs: manifest registry (add a
subgraph as a JSON entry, no code), freshness metadata with stale -> "band
unavailable" (never a silently wrong tier), the keyless x402 loop promoted from
optional to demo-critical, a second consumer example (15-line agent, not our gateway),
offline fixture tests, SKILL.md with real schemas. Threshold rationale documented.

Hedera (v1: nothing): "second accepts entry" is visible-from-the-diff minimal effort.
Scheduled transactions as the pay-later mechanic makes Hedera load-bearing; HCS
receipt notarization is 10 lines of garnish; HashScan on screen, never a tx id in a
header. If the settle dies, the scheduled-tx story stands alone.

Video (all chairs): one video, order as product story; per-prize submission TEXT opens
with a timestamp map ("your integration: 1:20-2:05"); density beats coverage, 3:00 max.

## FRIDAY-NIGHT MANDATORY LIST (before anyone sleeps)

1. Organizer sign-off request on flexrep disclosure (written, Discord).
2. booker: curl the exact path, capture lisbon.json fixtures.
3. 90-min spike: x402 + agentkit glue (correct imports + @x402/paywall). Kill 01:30.
4. AgentKit registration via teammate's World App, after 21:00, save tx hash.
5. Fund Base mainnet wallet $2-5 USDC + Studio key backup; _meta probe 7 subgraph IDs;
   whale-query survivors; only then bands.ts. Kill 02:00.
6. Commit specs/CUT-ORDER.md. Hedera account + USDC association + faucet check.
