# Feedback: World AgentKit, written while integrating

Measured on **2026-07-25** against `@worldcoin/agentkit@0.2.0` and
`@worldcoin/agentkit-core@0.2.0`, Node 22.23.1, viem EOA signing, World Chain
(`eip155:480`). Error strings are quoted exactly as the SDK produced them.

We use header-only verification in front of the route (Plan A), not the x402
extension composition, so this is the experience of someone wiring AgentKit
without a paywall in the middle.

## What worked, and how fast

| Step | Result |
|---|---|
| build a signed header (`createHeader`, eip191 EOA) | 3 to 6 ms |
| `parseAgentkitHeader` + `validateAgentkitMessage` + `verifyAgentkitSignature` | inside one request |
| `createAgentBookVerifier().lookupHuman(address)` on World Chain | returns a humanId for a registered wallet |
| full verified round trip, including our Graph context lookup | 514 ms |
| refusal of an unregistered wallet | ~600 ms |

`eip191` with a plain EOA worked first time once the header was shaped right.
`eip1271` was not exercised.

**The discrimination is real.** A freshly generated wallet is refused with
`agent wallet is not registered`, while the registered agent wallet resolves to a
humanId, on the same code path in the same second. That control is what let us
call this a working integration rather than a wired-up hook.

## 1. `createAgentBookVerifier` is exported from both packages

The docs page for integration shows it imported from `@worldcoin/agentkit`. A
pre-event engineering note we were working from said the opposite: that it lives
only in `@worldcoin/agentkit-core`. Both are half right and neither says so:
`@worldcoin/agentkit` does `export * from '@worldcoin/agentkit-core'`, so the
function is available from either and **one dependency is enough**.

**Ask:** one line in the docs stating that `agentkit` re-exports `agentkit-core`
in full. Two packages with overlapping surfaces is the first thing a builder has
to resolve, and right now it is resolved by reading `index.d.ts`.

## 2. `declareAgentkitExtension` is the server half, and `createHeader` needs the client half

`declareAgentkitExtension()` produces what a resource advertises. It leaves
`nonce` and `issuedAt` unset, correctly, because in the x402 flow the server
issues them in its 402 challenge. But `createHeader()` validates against the full
`AgentkitExtensionInfo`, so passing the declaration straight in fails with:

```
Invalid agentkit header: nonce: Required, issuedAt: Required
```

The message is accurate and gives no hint about whose job those fields are. For
header-only verification there is no 402 to carry them, so the client has to mint
them itself, which is not obvious from either the types or the docs.

**Ask:** either default `nonce` and `issuedAt` inside `createHeader` when they are
absent, or export a small `buildAgentkitInfo({ domain, resourceUri })` for clients
that are not answering a 402. One helper removes a guessing step.

## 3. `domain` must be the hostname without the port

With `domain: "localhost:3000"` (the URL's `host`, and what SIWE conventionally
carries, since RFC 4361 uses the authority) validation fails:

```
Domain mismatch: expected "localhost", got "localhost:3000"
```

`validateAgentkitMessage` derives the expected domain from the
`expectedResourceUri` using the **hostname**, so any resource served on a
non-default port has to drop the port from `domain` while keeping it in `uri`.
That asymmetry inside one object is easy to get wrong and the error does not hint
at the cause.

**Ask:** compare against the authority (host with port) when the resource URI has
one, or say in the docs that `domain` is hostname-only.

## 4. Replay protection as an option is the right shape

`validateAgentkitMessage(payload, resourceUri, { maxAge, checkNonce })` plus
`InMemoryAgentKitStorage.hasUsedNonce` / `recordNonce` meant nonce reuse could be
rejected *inside* validation instead of after it. `tryIncrementUsage(endpoint,
humanId, limit)` being atomic, with the TOCTOU warning stated in the type
comment, is also a good sign. Nothing to fix here; noting it because it is the
part that needed no workaround.

## 5. The convenient mode is the disqualifying one

`AgentkitMode` is:

```ts
{ type: 'free' } | { type: 'free-trial', uses? } | { type: 'discount', percent }
```

So the SDK's shortest path from "this agent has a human behind it" to "do
something about it" is a **price discount**, which is the pattern the prize rules
call out as an example of what not to build. A builder following the types will
land on it by default.

Our product deliberately does not use `mode` at all: the credential changes who
carries risk between booking and the stay (prepay, deposit, rate lock, settle at
checkout) and never the price. Everyone is quoted the same supplier rate.

**Ask:** add a mode that expresses non-price terms, or drop `discount` from the
happy path and say in the docs why. As shipped, the library nudges builders
toward the thing the rules penalise, which is a strange place for the two to
disagree.

## 6. Smaller notes

- `lookupHuman` returning `null` for an unregistered wallet is exactly right: it
  is a normal outcome, not an error, and it let us treat "no credential" as a
  first-class product state rather than a failure path.
- The AgentBook always resolving on World Chain regardless of the signing chain
  is documented and held true.
- Error strings are good enough to act on. `not valid base64` for a forged header
  and the field-level `nonce: Required` both pointed straight at the problem,
  which is more than most betas manage.

## 7. `maxAge` has no unit in its name, and it cost us an afternoon

`AgentkitValidationOptions.maxAge?: number` is compared against
`DEFAULT_MAX_AGE_MS = 5 * 60 * 1e3`, so the unit is milliseconds. Nothing in the
name, the type or the docstring says so, and seconds is the natural guess for a
field called "max age" in an auth context: SIWE, JWT `exp` and OAuth token
lifetimes are all seconds.

We passed `300` meaning five minutes and got a freshness window of 0.3 seconds.
Every local run passed, because the agent and the gateway were the same machine
and the age was 0ms. Every request that crossed a network failed, and the
production symptom was a correctly signed credential silently becoming no
credential, which reads exactly like an unregistered wallet.

The error string was excellent once we could see it, `Message too old: 0s
exceeds 0.3s limit`, and it is the only reason this was a one-line fix.

Two suggestions, either of which removes the class:
- rename to `maxAgeMs`, matching the internal constant;
- or reject a `maxAge` below, say, 1000 as almost certainly a unit mistake,
  because a sub-second freshness window has no legitimate use over a network.

## 8. `lookupHuman` hides which problem you have

`createAgentBookVerifier().lookupHuman` catches every error and returns `null`,
so a rate-limited RPC, a blocked egress and a genuinely unregistered wallet are
one answer. The default endpoint is viem's chain default for World Chain, a
shared public one, which behaves differently from a laptop and from a datacentre.

Returning a discriminated result, or letting transport errors throw while keeping
`null` for "not in the book", would let an integrator tell their own problem from
their caller's. We ended up adding our own `eth_blockNumber` probe to recover the
distinction.

## 9. The default credential is the orb, and that is a barrier almost nobody clears

This one cost us a working demo path and it is worth stating plainly, because the
default is doing the opposite of what a low friction credential is for.

Asking IDKit for personhood without naming a credential, or naming
`proof_of_human`, means the ORB credential. A real World App pointed at our app
answered:

```
Humans Only
visit an Orb
```

Nobody at a hackathon has been to an Orb. Selfie Check exists precisely so a
person with an ordinary World App can prove personhood, and getting it requires
knowing to ask for `constraints: { type: "selfie" }` explicitly. We only found
this because a teammate scanned the QR with a real phone: the browser simulator
never shows it, since the simulated identity holds the orb credential and passes
silently.

The trap has a second edge. The staging simulator refuses a selfie request with
`credential_unavailable`, so an integrator testing without a phone is pushed
toward `proof_of_human`, which then quietly becomes an orb wall for every real
user. Both defaults point the same wrong way.

What we do now: ask for either, selfie first, via
`constraints: { any: [{ type: "selfie" }, { type: "proof_of_human" }] }`. A person
with a World App does the low barrier check, somebody who already has the orb
credential is not turned away, the simulator still has something to answer, and
the screen names whichever one actually ran.

**Asks:**
- make Selfie Check the documented default for "prove a person is a person", or
  at minimum say on the first integration page that the default is orb backed;
- let the staging simulator hold a selfie credential, so the environment used for
  testing does not push integrators toward the one that blocks real users;
- surface the requested credential in the widget's own copy, so an integrator
  sees "Selfie Check" or "Orb" before a real user does.

## 10. `credential_unavailable` is rendered to the user as "Something went wrong"

Chased with a real phone for an evening, and the answer was one word the user was
never shown.

A real World App connected to our app happily, said "Congratulations! You've
successfully connected your World ID to Booker Bob", and then the browser widget
showed:

```
Something went wrong
We couldn't complete your request. Please try again.
```

No code, no category, nothing in our gateway logs, because the proof never
reached us. Only after attaching a debugger to the page did the real answer
appear in `onError`:

```
credential_unavailable
```

The person simply holds neither credential we asked for: no Selfie Check
enrolment and no orb. That is not an error, it is an ordinary state, and it has
an obvious next action for the user: set up Selfie Check in World App. Instead
both the phone and the browser implied something had broken, and we spent the
evening testing environments and protocol versions that were never the problem.

**Asks:**
- render `credential_unavailable` as its own screen with the enrolment path, not
  as the generic failure. It is the single most likely outcome for any new
  integrator's first real test;
- say in `onError` docs which codes are user states rather than faults, so an
  integrator can copy the distinction into their own UI;
- the earlier "Humans Only, visit an Orb" screen was the same condition for the
  orb credential and it was far clearer. Selfie deserves the same treatment.

## 11. An integrator can self-diagnose through an endpoint that is not in the 4.0 docs

We spent an evening guessing at environments and protocol versions with a person
standing over a phone, and the answer was one unauthenticated POST away:

```
POST https://developer.world.org/api/v1/precheck/{app_id}
{"action":"<action>","external_nullifier":"","nullifier_hash":""}

{"name":"Booker Bob","is_staging":false,"is_verified":false,
 "enable_face_check":true,
 "action":{"action":"bookerbob-terms","max_verifications":1,"status":"active"},
 "can_user_verify":"yes"}
```

Two facts we could not otherwise see. `is_staging: false` told us our app is a
production app, so the `environment: "staging"` we had been sending pointed every
real World App at a bridge our app does not live on, and the browser simulator hid
it because the simulator itself lives in staging. And `max_verifications: 1` told
us that every action, including ones the Portal auto-creates on first use, allows
one verification per person forever, which quietly poisons every repeat during
debugging and would burn a judge's single attempt on stage.

**Asks:**
- put this endpoint in the 4.0 docs as the first debugging step. It answers "is my
  app configured the way I think" in one call, and nothing else does;
- make the environment mismatch loud. A staging request against a production app
  should say so, rather than connecting, congratulating the user, and then failing
  with a generic error in the browser;
- default `max_verifications` to unlimited for auto-created actions, or say in the
  Portal UI that one is the default. One is a surprising default for a value that
  can never be reset per person.

Also worth reconciling: `docs.world.org/world-id/idkit/verification-flows` says
"if the user lacks the requested credential, World ID walks them through
enrollment first". What we observed was `credential_unavailable` with no
enrollment offered. Whichever is right, the other one is misleading.

## 12. Selfie Check is documented, requestable, and not yet issuable to anyone

This is the finding that ends the thread, and it is the one we would most like
back as an hour of our lives.

Selfie Check has a credential id (11), a documentation page, a sandbox testing
page, and a place in `constraints: { type: "selfie" }`. Our Portal app reports
`enable_face_check: true`. Everything an integrator can see says build it.

Then a real World App opens "Add credential" and shows:

```
Proof of human    Prove you're a unique human
Official ID       Prove your age, nationality, or gender

Coming soon
Face credential   Proves your liveness and uniqueness      (greyed out)
```

Nobody can hold the credential yet. Every request for it must fail, and it fails
as `credential_unavailable`, rendered to the user as "Something went wrong". We
went through four environments, two protocol versions, the Portal API and a
debugger before reaching the one screen that says it plainly, on a phone.

The gap is not the timeline, betas ship when they ship. The gap is that nothing
on the developer surface reflects it: docs, credential id, Portal flag and SDK
all behave as though the credential exists, and the only honest signal lives in
the consumer app.

**Asks:**
- mark not-yet-issuable credentials on the docs page and in the Portal. One line,
  "Face credential is coming soon in World App", saves every integrator this
  entire evening;
- have the Portal's `enable_face_check` reflect issuability rather than intent;
- return a distinct error, `credential_not_yet_available`, so an integrator can
  tell "this person does not have it" from "nobody can have it". Those are
  different problems with different fixes and today they are one string.

What we do meanwhile: ask for either credential, so an orb verified World ID
passes today and Face credential works the day it ships, with no code change.

## What we shipped against this

`apps/gateway/src/world.ts`: verification behind a `CredentialVerifier`
interface, resource-bound validation with freshness and nonce replay, and an
anti-farming per-human quota framed as sybil-resistant rate limiting rather than
a perk. The verifier that runs without a registered wallet is a stand-in that
**cannot** return `verified` by construction, so nothing on screen can claim
World before a real header has verified once.

`scripts/agent-with-credential.ts`: an agent that signs and presents the header
for real, which is what makes the demo a comparison between an accountable agent
and an anonymous one rather than a checkbox in a browser.

`apps/gateway/src/world-chain.ts`: a raw `eth_blockNumber` probe, reported in
`/health`, so an unreachable RPC stops reading as an unregistered wallet.
