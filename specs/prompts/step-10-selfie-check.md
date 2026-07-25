# step 10 — Selfie Check: a person proves they are a person

## Prompt (user, translated from Russian)

> The Portal is ready, write Selfie.

Step 6 of `specs/00-final-plan.md` G.2, Phase A of `D.2`: the browser simulator,
no phone. It was blocked on Developer Portal keys; those now exist.

## Why this is a second thing, not the same thing again

AgentKit answers whether a human is accountable for an **agent**. It cannot say
anything about a person in a browser, because a browser cannot sign an agent
header. Until now that meant the product surface only ever showed `stand_in`
while real World verification lived in a CLI script.

Selfie Check answers the other question, and the gateway ends up holding an
anonymous nullifier where AgentKit gives an anonymous humanId. `D.1` asks for
both in one decision, so `combine()` accepts either alone and records both when
both arrive: `source` still names the stronger one, `sources` lists what agreed.

## Shape, read off the SDK rather than the prose

```
signRequest({ signingKeyHex, action, ttl }) -> { sig, nonce, createdAt, expiresAt }
RpContext                                    = { rp_id, nonce, created_at, expires_at, signature }
IDKit v4 result                              = { responses: [{ identifier, nullifier, issuer_schema_id, ... }] }
POST {portal}/api/v4/verify/{rp_id}          <- that result, forwarded as-is
```

Two routes, because the signing key stays server side: `GET /world-id/context`
hands the browser a signature over a nonce, `POST /world-id/verify` takes the
finished proof, asks the Portal, and returns a session token.

The session is an HMAC over the nullifier, keyed off the signing key we already
need. Stateless on purpose: Fly stops machines when idle and runs two of them, so
a session in memory would evaporate mid-demo exactly the way the AgentKit quota
does.

## Rules kept

- The browser cannot assert a credential. It carries a proof; the Portal decides.
- The nullifier never leaves the gateway. The browser gets an opaque token.
- Terms do not move for Selfie alone. `hasCredential` becomes true the same way
  AgentKit makes it true, and context decides the rest. A separate rung for a
  face would be a discount for a face.
- The session lives in memory, not `localStorage`: a credential that outlived the
  tab would wait on a shared demo laptop for the next person to inherit it.

## What the environment could actually do

The staging simulator refuses a selfie request with `credential_unavailable`: its
simulated identity does not hold that credential. The same request for
`proof_of_human` succeeds in the same simulator, same session. So the credential
asked for is configuration, defaulting to what the environment can produce, and
whichever one ran is named on screen and in the response. Selfie Check itself
needs sandbox or a real device.

That is the difference between a demo that works and a demo that claims Selfie
and shows an error, and it is why the plan's stop condition existed.

## Verification, measured

- End to end through the simulator: 21.5s from page load to a verified credential,
  9.0s from approval to the credential landing.
- `/offers` with a minted session: `credential {"status":"verified","source":"world-id"}`,
  terms `elite pay_at_checkout`.
- The same request with one byte changed in the session: `missing`, terms `bot
  prepay_100`.
- 85 gateway tests, 16 MCP tests.

See `docs/FEEDBACK-selfie.md` for the exact error bodies and the four API asks.
