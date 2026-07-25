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

## Follow-up: the origin fix was not the whole story

After deploying, production still answered `credential: {"status":"missing"}` for
the same wallet that verifies locally. The cause was a second bug in the same
file, and it was mine: `pickVerifier` switched on whether
`LISBON2026_AGENT_PRIVATE_KEY` was set. That key belongs to the **agent** doing
the asking, not to the server doing the checking. It lives in a local `.env` and
nowhere else, so the deployed gateway ran the stand-in verifier and refused every
real credential, while every local run passed.

Two changes came out of it:

- The switch is now opt-out: `LISBON2026_CREDENTIAL_MODE=stand_in` asks for the
  dev verifier, and anything else, including empty, verifies for real. Checking a
  credential needs no secret, so nothing can be missing.
- `/health` reports `credentialVerifier` and `resource`. Both credential bugs
  were invisible from outside: a stand-in verifier looks exactly like a rejected
  signature, and a mismatched resource looks exactly like an unregistered wallet.
  Neither field is a secret.

## Third cause: the SDK cannot tell "unreachable" from "unregistered"

With the origin fixed and the real verifier running, production still answered
`missing` for a wallet that verifies locally. `createAgentBookVerifier().lookupHuman`
catches every error and returns `null`, so a rate-limited RPC, a blocked egress
and a genuinely unregistered wallet are one and the same answer. The default
endpoint is viem's chain default for World Chain, a shared public one: it answers
a laptop and may not answer a datacentre.

So the gateway now asks the chain a question of its own, a raw `eth_blockNumber`,
and reports it in `/health` as `worldChain` plus the `worldRpc` in use. The probe
is cached and refreshed off the request path, because `/health` is what Fly polls
every 15 seconds with a 2 second timeout and must never wait on the very thing
being questioned. `LISBON2026_WORLD_RPC_URL` overrides the endpoint.

This also decides who owns the problem: `world chain unreachable from this
machine` is ours, `agent wallet is not registered` is the caller's.

## The actual cause: a unit, not a network

The log settled it: `credential rejected (world): Message too old: 0s exceeds
0.3s limit`. `maxAge` is milliseconds, and we passed `300` meaning five minutes,
so the freshness window was a third of a second. Local runs passed because the
agent and the gateway shared a machine and the age was 0ms; anything with a
network in between failed. One line, plus a test that fails if the number is ever
small enough to be seconds again.

The chain probe from the previous step stays. It did not find this bug, but it
removes the ambiguity that made the bug look like an unregistered wallet, and it
is now in `docs/FEEDBACK-world.md` as feedback to the partner.
