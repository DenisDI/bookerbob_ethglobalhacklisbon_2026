# step 11 — a real AgentKit lane in the race

## Prompt (founder, translated from Russian)

> Real AgentKit in the race, before the demo recording. RACE ONLY. AgentKit is
> the centre of the World prize. Right now the backed lane goes through a
> stand-in and the chip is static, so a judge never sees the real thing. One lane
> must do a real check: the gateway signs as our registered agent, verifies the
> signed header against the AgentBook on World Chain, and the chip says
> "AGENTKIT VERIFIED · verified in AgentBook". Show the line, never the raw
> humanId. Build and check locally first, then deploy, then verify on prod.

## What was built

`GET /agent/offers`: the gateway signs an AgentKit header with our registered
agent wallet and calls its own `/offers` with it. The route decides nothing about
the credential. The ordinary verification path does, ending in a lookup on World
Chain, which is why the answer can say `verified` at all.

The signing is copied from `scripts/agent-with-credential.ts` rather than
rewritten, including both traps that cost time the first time: the domain is the
hostname without the port, and the resource URI has to be the exact string
`publicResource(c)` produces. A fresh header per request, because the freshness
window is five minutes and a nonce may be spent once, so a cached header would
start failing mid-recording in a way that looks like the integration broke.

## The rule this breaks, on purpose

`env.ts` and `world.ts` both say the agent's signing key has no business on the
server, and that is right: keying the verifier off its presence was a real bug.
This route holds it anyway, for one surface, because an agent that lives only in
a terminal cannot be shown to anybody watching the race. The key signs and is
never read for any decision, and verification still needs no secret.

## What the screen may say

The chip used to read CREDENTIAL PRESENT whether or not anything had been
checked, which made a real AgentBook verification look exactly like a browser
asserting one. It reads the answer now: `verified` plus `agentkit` gives
AGENTKIT VERIFIED and the line "verified in AgentBook · World Chain", anything
else gives STAND-IN CREDENTIAL. The humanId stays on the server, so the wire
shape is untouched.

If the gateway has no key the route answers 501 and the lane falls back to the
stand-in request. A race that dies because one lane could not sign would be worse
than a race that runs and says which credential it ran with.

## Measured locally

```
curl "localhost:3000/agent/offers?address=vitalik.eth"
  credential {"status":"verified","source":"agentkit"}
  terms elite pay_at_checkout, humanId absent from the body

race, gateway with the key:     unbacked PREPAY | backed AGENTKIT VERIFIED + AgentBook line
race, gateway without the key:  unbacked PREPAY | backed STAND-IN CREDENTIAL
```

102 gateway tests, 16 MCP tests, typecheck and lexicon clean.

## Not done yet

Production needs `LISBON2026_AGENT_PRIVATE_KEY` as a Fly secret, which is a human
task: this account cannot see the Fly org that owns the app. Until it is set the
deployed race shows the stand-in, honestly labelled.
