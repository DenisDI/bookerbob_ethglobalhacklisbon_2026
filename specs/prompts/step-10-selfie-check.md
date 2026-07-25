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

## Review pass

The user asked for a review of the module: bugs, adequacy, fit with the project
and the hackathon. One finding was serious.

**The session key derived from a secret that might not be there.** `sessionKey()`
took the World signing key, so an unconfigured gateway derived its HMAC from the
empty string, a constant anybody could recompute from this repository. A forged
`world-id` header then read as `verified`, which let `mayDeferSettlement` open
`/prebook` and `/book`, made `shouldMeter()` switch off the x402 paywall, and put
"verified by World" on a screen for a check that never ran. A fresh clone is
exactly that gateway, and production was too until the Fly secrets were set.

Measured after the guard, with the forgery the old code accepted:

```
unconfigured gateway: credential missing, terms bot prepay_100, /prebook 403
configured gateway:   forgery missing; a real session still verified, elite
```

Four smaller ones, all fixed in the same pass:

- a person verified by Selfie had no anti-farming quota, while AgentKit did, and
  D.1 asks for the free path to be a rate limit rather than a perk;
- the screen kept saying "personhood proved" after the gateway had stopped
  believing the session, so the expiry is now enforced on both sides;
- the `checking` state existed in the type and was never reached;
- `credential.sources` reached the wire but not the web, so the machine view
  still said only a header could say anything. It now shows both proofs.

Also parameterised the signing key in tests: half the suite sat behind
`skip: !configured`, which means a CI without keys would have gone green on a
broken module.

## The orb wall

A teammate scanned the QR with a real World App and got "Humans Only, visit an
Orb". The cause was mine: after the staging simulator refused a selfie request
with `credential_unavailable`, I made staging ask for `proof_of_human`, and that
is the orb credential. The simulator hid it, because its identity holds that
credential and passes without a word.

Selfie Check exists so anybody with a World App can prove personhood, so the ask
is now a list, selfie first:

```ts
constraints: { any: [{ type: "selfie" }, { type: "proof_of_human" }] }
```

A person with a World App does the low barrier check. Somebody who already has
the orb credential is not turned away. The simulator still has something to
answer, so the phoneless demo path survives. And the response names which check
actually ran, so the screen says "personhood proved by selfie" or "by proof of
human" instead of implying whichever one we wished for.

Measured after the change: the simulator run passes end to end in 23.5s and the
screen reads "personhood proved by proof of human", which is the truth in that
environment. What a real World App now offers is the one thing only a phone can
confirm.
