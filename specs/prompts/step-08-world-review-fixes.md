# step 08 — World review fixes

## Prompt (user, translated from Russian)

> Review the World code for adequacy, alignment with the project, and
> compatibility with the current and future modules. Also, we will need a flow
> where a human with a verified-human label can authorise themselves and connect
> a wallet — account for that flow if it is not accounted for.

## What the review found

Full findings in the plan file. Five things were actionable now:

1. **HIGH** — in production a correctly signed credential was refused.
   `@hono/node-server` derives the URL scheme from `incoming.socket.encrypted`
   and ignores `X-Forwarded-Proto`, so behind Fly the gateway compared the signed
   resource against `http://lisbonhack.world/offers` while every agent signs
   `https://…`. Confirmed on prod before the fix: the same wallet that returns
   `verified` + `elite` locally came back `missing` + `bot`.
2. **MEDIUM** — `/prebook` and `/book` never looked at the credential. Terms were
   enforced where they were displayed, not where settlement is deferred.
3. **MEDIUM** — credential resolution lived inside the offers handler, but
   specs/01-gateway.md puts it in front of the x402 paywall. Two places would
   have had to agree.
4. **MEDIUM** — quota and replay protection are per process, and
   `auto_stop_machines = "stop"` resets both on every wake. Documented rather
   than implied.
5. **MEDIUM** — `source: "world"` collapses two different proofs. AgentKit proves
   an *agent* belongs to a human; World ID proves a *human* is one. §D.1 wants
   both in one decision, so the type distinguishes them before the second source
   exists.

## What was deliberately not built

The human authorisation flow the prompt asks about is **World ID**, not AgentKit:
a browser cannot present a signed AgentKit header, so a person cannot "log in"
through it at all. That flow needs `LISBON2026_WORLD_APP_ID`, `_RP_ID` and
`_SIGNING_KEY` from the Developer Portal, and they are empty. Same rule as x402:
code that has never run once is not claimed. Until the keys exist the credential
cannot become `verified` from the browser, and the interface says so.

## Verification

```bash
npm run typecheck && npm test && npm run lint:lexicon   # 45 + 16 pass

# the settlement gate, live
curl -s -X POST localhost:3000/prebook -H 'content-type: application/json' -d '{}'
# {"error":"credential_required", …} 403

# a real signed credential still verifies
npx tsx scripts/agent-with-credential.ts
# credential: {"status":"verified","source":"agentkit"} · elite · pay_at_checkout
```
