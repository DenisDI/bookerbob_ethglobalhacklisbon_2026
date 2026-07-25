# FEEDBACK: World ID credentials in a browser (IDKit 4.2.1)

Written while integrating, from runs, not from reading. Everything quoted below
is copied out of a terminal or a browser console on 2026-07-25.

**Versions.** `@worldcoin/idkit@4.2.1`, `@worldcoin/idkit-core@4.2.2`,
`@worldcoin/idkit-server@1.1.1` (transitive, provides `signRequest`). React 19,
Vite 6.4.3, Chrome 150 headless. Gateway on Node 22.23.1.

**What we built.** A Developer Portal app signs a request context server side,
`IDKitRequestWidget` runs the check in the browser against `environment:
"staging"`, the finished proof is forwarded as-is to
`POST https://developer.world.org/api/v4/verify/{rp_id}`, and the gateway
exchanges the Portal's acceptance for a short HMAC session. The nullifier never
leaves the server.

**Wall clock, measured end to end**, page load to a verified credential:

| Step | Time |
|---|---|
| page load to widget open | 3.5s |
| widget open to simulator link in hand | 3.1s |
| simulator tab open and rendered | 5.1s |
| approval in simulator to `verified` in our UI | 9.0s |
| **total** | **21.5s** |

---

## 1. The staging simulator cannot produce a Selfie Check, and nothing says so

Asking for `constraints: { type: "selfie" }` in `environment: "staging"` gets
this back from the widget, after the simulator approves:

```
onError code: credential_unavailable
```

The same request with `{ type: "proof_of_human" }` succeeds in the same
simulator, same identity, same session. So the credential is the variable.

This is a real cost: `docs.world.org/world-id/credentials/11` links to "Testing
Selfie Check in Sandbox" and the simulator page advertises itself as the way to
test World ID without a phone, and neither says the simulator's identity holds
no selfie credential. We only found it by asking for something else and watching
it work.

**Ask:** either let the simulator issue a selfie credential, or put one sentence
on the Selfie Check page saying which environments can produce one. A matrix of
credential against environment would settle it permanently.

**What this cost us, added after a real phone was tried.** Being pushed off
selfie by the simulator, we asked staging for `proof_of_human` instead, and that
is the ORB credential. A real World App scanning our QR then said "Humans Only,
visit an Orb", which is a barrier essentially nobody at a hackathon clears: the
simulator had hidden the problem because its identity holds that credential and
passes silently. The fix is to ask for either, selfie first:

```ts
constraints: { any: [{ type: "selfie" }, { type: "proof_of_human" }] }
```

so a person with an ordinary World App does the low barrier check, somebody who
already has the orb credential is not turned away, the simulator still has
something it can answer, and the screen names whichever one actually ran rather
than implying the one we hoped for.

## 2. The WASM module breaks under Vite's dependency optimiser, and the error says nothing

`@worldcoin/idkit-core` loads its WASM with the wasm-bindgen idiom:

```js
module_or_path = new URL("idkit_wasm_bg.wasm", import.meta.url);
```

Under Vite's dep pre-bundling the JS is rewritten into `.vite/deps/` and the
`.wasm` is not copied beside it, so the request for
`/node_modules/.vite/deps/idkit_wasm_bg.wasm` falls through to the SPA catch-all
and returns `index.html`. The console shows:

```
`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm
with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate`
TypeError: Failed to execute 'compile' on 'WebAssembly': Incorrect response MIME type.
```

and the widget surfaces exactly one word to the integrator:

```
onError code: generic_error
```

`generic_error` for a MIME type is what turned a five minute problem into an
hour. The fix on our side is one config block, and it has a second trap in it:

```ts
optimizeDeps: {
  exclude: ["@worldcoin/idkit", "@worldcoin/idkit-core"],
  // qrcode is CommonJS; excluding it too made the whole page fail to boot on
  // "does not provide an export named 'default'"
  include: ["qrcode/lib/core/qrcode.js"],
}
```

**Asks:** (a) mention this in the React integration page, since Vite is the
default for React apps now; (b) distinguish the error codes, because a failed
WASM instantiation and a user closing the dialog are not the same event and
today they are the same string.

## 3. `signRequest` returns camelCase, the protocol wants snake_case

```
signRequest(...)  -> { sig,       nonce, createdAt,  expiresAt }
RpContext          = { signature, nonce, created_at, expires_at, rp_id }
```

Four fields, three renamed, one of them `sig` to `signature`. Nothing warns and
the types do not connect, so the mapping is hand-written by every integrator, in
a place where a typo produces a signature check failure rather than a type error.

**Ask:** export a `toRpContext(rpId, signature)` helper, or return the protocol
shape directly. Same class of thing as `maxAge` in AgentKit, which we also got
wrong, and for the same reason: the SDK and the wire disagree quietly.

## 4. The verify endpoint's contract is not in the docs, but its answers are good

`POST /api/v4/verify/{rp_id}` is named in the docs without a request or response
schema, so we sent the IDKit result unchanged and read the reply defensively. The
reply turned out to be worth reading. A deliberately forged proof:

```json
{"success":false,"code":"all_verifications_failed","detail":"All proof verifications failed.",
 "results":[{"identifier":"selfie","success":false,"code":"verification_failed",
 "detail":"execution reverted (unknown custom error)"}]}
```

Per credential, with a code and a sentence. That is better than most, and it is
the reason our gateway can say which credential failed instead of shrugging.

It also carries a trap for anyone writing this quickly: the verdict is in the
body, not only in the status. We check `success` at both levels rather than
trusting a 2xx.

**Ask:** document the request and response shapes on the credentials page, even
as a single example each. We guessed correctly, and guessing is not a plan.

## 5. What worked without any friction

- Signing server side with `signRequest` and never exposing the key: the API made
  the right thing the easy thing.
- The simulator recognised our Portal app immediately and showed its real name,
  "Verify with World ID to Booker Bob", which made it obvious the rp_context and
  app id were correct before any proof existed.
- Nullifiers are scoped to the relying party and the action, so using one as an
  anti-farming key needed no extra thought.
- `v3` and `v4` are selectable in the simulator, which made it easy to confirm we
  were exercising the 4.0 path rather than a legacy fallback.

## 6. What our own review caught, since a FEEDBACK doc that only blames the SDK is worth less

Deriving a session key from a secret that may be absent is a trap of our own
making, and it is worth writing down because the shape is general. Our session
HMAC keyed off the World signing key, so on a gateway without one the key derived
from the empty string: a constant anyone could recompute from the source. A
forged header then read as verified, which opened the settlement routes and
switched off the paywall.

The fix is a guard, not cleverness: no key, no sessions, and the tests now cover
an unconfigured gateway explicitly rather than skipping when keys are missing. A
suite that goes green because it skipped is worse than a red one.

## 7. The first real phone said `credential_unavailable`, and the screen said nothing

Measured on a real World App, after the orb wall was fixed: the phone connects,
congratulates the user, and the browser shows the generic failure. Our gateway
log stayed empty because no proof was ever sent, and the code only appeared with
a debugger attached to the page.

The person holds neither credential: no Selfie Check enrolment, no orb. So the
honest sentence on our screen is now the enrolment path, not an apology:

```
this world id has no selfie check or orb credential yet. set one up in world
app, or use the simulator
```

It also means the phoneless path is the one that works on a stage today: the
staging simulator holds proof_of_human and passes in seconds. A judge with a
World App passes only if they have already enrolled Selfie Check or been to an
Orb.

## What we shipped against this

`apps/gateway/src/world-id.ts` and `apps/gateway/src/routes/world-id.ts`: request
context signed server side, proof forwarded unedited, Portal verdict read from
the body, and a stateless HMAC session so the credential survives the machine
sleeping. `apps/web/src/worldid/SelfieCheck.tsx`: the browser half, which cannot
declare itself verified because only the gateway sees the Portal's answer.

Combined with AgentKit in one decision, per the plan's D.1: either proof alone is
a credential, and when both arrive the response records both rather than dropping
one.
