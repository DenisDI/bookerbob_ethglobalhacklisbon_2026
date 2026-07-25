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
