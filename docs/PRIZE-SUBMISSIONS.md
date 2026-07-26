# prize submissions

three prizes, three fields each, ready to paste. every line link was opened and
checked against what is actually on the branch, and every claim is one a judge
can verify by clicking.

links are pinned to commit `71139ce` rather than `main`, because two other people
are pushing to this repository and line numbers on `main` will have moved by the
time anybody opens them.

---

## world

### how are you using this protocol / api?

the gateway signs its own request as our registered agent and then verifies that
signed `agentkit` header against the AgentBook on World Chain, so the credential
is something a network answered rather than something the browser asserted. what
comes back is an anonymous human identifier, and it never leaves the server: the
wire carries a status and a source only. that credential is the only thing that
moves the underwriting, and it moves risk rather than price, so a verified guest
gets the money held until checkout while a stranger pays the whole stay up front.
we also built the World ID side, where a person proves personhood in the browser
and the Developer Portal confirms the nullifier, and the two sources combine into
one decision instead of collapsing into one word.

one thing said plainly: the race screen keeps a stand-in on one lane so takes
replay identically. the real check is `GET /agent/offers`, which signs and then
goes through the verification path below.

### link to the line of code where the tech is used

main:
https://github.com/DenisDI/ethglobalhacklisbon_2026/blob/71139ce39da8a4adbcfa3d60af20b737c1f92c96/apps/gateway/src/world.ts#L145

that is the AgentBook lookup on World Chain, `agentBook.lookupHuman(signature.address)`,
after the header is parsed, bound to the resource, and its signature verified.

supporting, the gateway signing as the registered agent
(`0x1597866E3F9870241EebC1153136fDbf71C3CBF3`, registration tx `0xfc2fe4d9`):
https://github.com/DenisDI/ethglobalhacklisbon_2026/blob/71139ce39da8a4adbcfa3d60af20b737c1f92c96/apps/gateway/src/routes/agentOffers.ts#L66

supporting, World ID proofs forwarded to the Developer Portal:
https://github.com/DenisDI/ethglobalhacklisbon_2026/blob/71139ce39da8a4adbcfa3d60af20b737c1f92c96/apps/gateway/src/world-id.ts#L229

### ease of use: 6 / 10, and feedback

the strength you are underselling is your error strings. `Message too old: 0s
exceeds 0.3s limit` named a units bug in one second that would otherwise have
taken an evening, and `all_verifications_failed` comes back with a per credential
breakdown rather than a single boolean. `lookupHuman` returning null for an
unregistered wallet is also the right call: it let us treat "no credential" as an
ordinary product state instead of a failure path.

the friction is `maxAge`. it is milliseconds, compared internally against
`DEFAULT_MAX_AGE_MS`, but neither the name nor the type says so, and every
adjacent auth convention we know counts seconds: SIWE, JWT `exp`, OAuth
lifetimes. we passed 300 meaning five minutes and got a freshness window of a
third of a second. every local run passed, because agent and server shared a
machine and the age was 0ms, and everything over a network failed. rename it
`maxAgeMs`, or refuse values below a second, and the class disappears.

second, smaller but it cost a whole evening: Face credential is listed as coming
soon in World App, while the developer surface has a credential id, a docs page,
a sandbox page, `constraints: { type: "selfie" }` in the sdk and
`enable_face_check: true` on our own app in the portal. requesting it fails as
`credential_unavailable`, which the widget renders as "Something went wrong". a
distinct code for "nobody can hold this yet" against "this person does not hold
it" would have saved all of it, and marking not yet issuable credentials in the
portal would have saved it sooner.

---

## the graph

### how are you using this protocol / api?

we built `context-bands-mcp`, a standalone mcp server that reads an address
through the decentralized network by subgraph id and answers with four coarse
bands: how far back the first trace goes, how often it acts, how many venues it
appears in, and what size it moves. aave v3 and gmx are read through the
standardized messari schemas, uniswap v3 through its canonical subgraph, and ens
resolves the name in both directions. the registry is data, not code: adding a
source is a json file with its schema type, role and count strategy, which is
what let us swap sources when a deployment turned out to have empty counters.

freshness is a gate, not a footnote. a subgraph that is behind gives
`bands unavailable`, because a stale read that produces a confident tier is worse
than no read. raw figures never leave the server: the product decides terms from
bands, and the screen shows bands, so there is nothing to extract.

### link to the line of code where the tech is used

main:
https://github.com/DenisDI/ethglobalhacklisbon_2026/blob/71139ce39da8a4adbcfa3d60af20b737c1f92c96/packages/context-bands-mcp/src/graph.ts#L69

that is the query against the decentralized gateway,
`POST /api/{key}/subgraphs/id/{subgraphId}`.

supporting, the registry that makes a subgraph a json file rather than a code
change:
https://github.com/DenisDI/ethglobalhacklisbon_2026/tree/71139ce39da8a4adbcfa3d60af20b737c1f92c96/packages/context-bands-mcp/registry

### ease of use: 8 / 10, and feedback

the strength you are underselling is what the standardized schemas make possible
architecturally. because aave and gmx answer the same shape, a registry entry can
carry a schema type and a count strategy and the code stops caring which protocol
it is talking to. that is the difference between an integration and a tool: we
added and retired sources during the build without touching a query. `_meta` is
the other half, and it is why our failure mode is an honest "unavailable" rather
than a quietly wrong tier.

the friction was finding out which deployments actually populate the fields their
schema advertises. on aave v3 the account level action counters, `depositCount`,
`borrowCount`, `repayCount`, `liquidateCount`, read zero for every address we
sampled, so an integrator following the schema writes a query that is valid,
returns 200, and silently means nothing. we moved to counting entities per source
instead, which is why the registry carries `countStrategy` at all. surfacing per
deployment which fields are actually populated, in the explorer or in `_meta`,
would turn a day of probing into a glance.

---

## hedera

### how are you using this protocol / api?

two places, both settlement rather than decoration. a guest who has earned it gets
the price held now and the money moved later, and that later is a real
`ScheduleCreate` on hedera testnet whose memo carries the hotel hold reference, so
the finale of the demo is a hashscan page anybody can open rather than a claim.
separately, an agent with nobody behind it pays for what it asks: the unbacked
lane settles 0.01 hbar per query through x402 on `hedera:testnet`, with the
facilitator as fee payer, and the receipt travels back with the offers so the
counter on screen and the transaction on hashscan cannot disagree.

stated plainly: this is testnet, and in the demo the pay later schedule is signed
by our operator account, where a production version would use a guest allowance.
the per query settlement is real and happens on every unbacked run.

### link to the line of code where the tech is used

main:
https://github.com/DenisDI/ethglobalhacklisbon_2026/blob/71139ce39da8a4adbcfa3d60af20b737c1f92c96/packages/hedera-schedule/src/client.ts#L120

that is the `ScheduleCreateTransaction` that schedules the checkout day transfer.

supporting, the x402 per query settlement on `hedera:testnet`:
https://github.com/DenisDI/ethglobalhacklisbon_2026/blob/71139ce39da8a4adbcfa3d60af20b737c1f92c96/apps/gateway/src/x402.ts#L239

supporting, where the terms engine decides a hold has earned a scheduled
settlement:
https://github.com/DenisDI/ethglobalhacklisbon_2026/blob/71139ce39da8a4adbcfa3d60af20b737c1f92c96/apps/gateway/src/settlement.ts#L50

### ease of use: 8 / 10, and feedback

the strength you are underselling is that scheduled transactions are a product
primitive, not an infrastructure feature. "hold the price now, move the money at
checkout" is a business rule in the hotel industry, and it maps onto
`ScheduleCreate` in about fifteen lines with no contract to write and no custody
to design. it also gives a demo something rare: a shareable page that proves the
claim, which is why we lead the finale with hashscan rather than with a number.

the friction is idempotency. a scheduled transaction is identified by its
contents, and ours are built from the hotel hold, so a second run against the same
hold is byte identical and the network answers
`IDENTICAL_SCHEDULE_ALREADY_CREATED`. that is correct, and it is also unusable as
written: the receipt did not carry the existing schedule id in our measurements,
so "make sure this order has a schedule" cannot be expressed directly. it broke
the demo's closing beat for an hour, because the first run created the schedule
and every run after it looked like hedera was down. return the existing schedule
id in that receipt, or offer a lookup by scheduled transaction contents, and
idempotent scheduling becomes one call instead of a workaround.
