# World AgentKit: the real path (for judges)

"Uses AgentKit, verifies a human is behind the agent, working end to end." Here is
exactly where that is real, not the demo stub.

## The demo vs the real path

The race tab drives its two lanes with a stand-in flag (`?credential=1`) so the
comparison replays reliably on stage without a live credential per run. That is the
show. The real AgentKit verification lives below and is what the claim rests on.

## The real end-to-end, in three parts

1. **On-chain registration.** The agent wallet
   `0x1597866E3F9870241EebC1153136fDbf71C3CBF3` is registered in the AgentBook on World
   Chain, tx `0xfc2fe4d9ddbd26db6005e5328358afb57cc4d8f922c240bcd6b281159f02eeb1`
   (`docs/AGENT-REGISTRATION.md`). Verify any time:
   `npx @worldcoin/agentkit-cli status 0x1597866E3F9870241EebC1153136fDbf71C3CBF3`
   returns `registered: true` with a humanId.

2. **The agent presents a signed credential.** `scripts/agent-with-credential.ts` is a
   real agent: it mints nonce and issuedAt, signs an AgentKit header (eip191 EOA), and
   calls the gateway. No stub.

3. **The gateway verifies against the chain.** `apps/gateway/src/world.ts` parses the
   header, validates the SIWE message, freshness and nonce, verifies the signature, then
   reads AgentBook on World Chain via `createAgentBookVerifier` (from
   `@worldcoin/agentkit-core`) to resolve the humanId. A valid credential moves the
   request from the unbacked tier to human-backed terms; no credential stays unbacked.
   Covered by `apps/gateway/tests/world.test.ts`.

## Reproduce

With the agent key in `.env` (`LISBON2026_AGENT_PRIVATE_KEY`), against the deployed
gateway:

```
npx tsx scripts/agent-with-credential.ts
```

Expect a request that resolves to the human-backed tier through the on-chain lookup, and
the same request without the header staying unbacked.

## The human-direct path (Overview), and its honest limit

The same personhood gate is also reachable by a person directly, via World ID / Selfie
Check on the Overview tab (`apps/web/src/worldid/SelfieCheck.tsx`). One limit, documented
with evidence in `docs/FEEDBACK-world.md`: the Face / Selfie credential is shown as
"Coming soon" in the production World App, so a real phone without an orb cannot complete
it yet. The demo runs that step through the World simulator, labelled as such. The World
team at the booth reproduced this and asked us to submit it.
