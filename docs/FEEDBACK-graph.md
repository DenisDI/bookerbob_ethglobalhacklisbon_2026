# Feedback: The Graph, written while integrating

Everything below was measured against `gateway.thegraph.com` with a Studio key
on **2026-07-25**, while building `packages/context-bands-mcp`. Block heights and
exact responses are included so each item is reproducible rather than an opinion.

## 1. Three of seven published subgraph ids are unusable

| Id | Expected | Gateway response |
|---|---|---|
| `ELUcwgpm14LKPLrBRuVvPvNKHQ9HvwmtKgKSH6123cr7` | Messari Uniswap V3 Ethereum | `subgraph not found` |
| `3La4ZToKjD5185NM6MqLzkHzJ3KUG6fiMhGvnMtPu9YD` | Messari GMX Arbitrum | `subgraph not found` |
| `4Po9haSDCDbQ2XtrSXqT8BNB9H6T7EUAmbAorAzHQi9S` | Messari Mummy Arbitrum | `no allocations` |

`no allocations` is the more interesting of the two errors: the deployment
exists, but nothing indexes it, so it is undistinguishable from a wrong id at
the call site. **Ask:** a distinct error code, or a `status` field, for
"deployed but unindexed". A consumer can react to that (wait, warn, pick a
fallback); it cannot react to a 404-shaped answer.

Two GMX ids circulate for the same protocol and network.
`DiR5cWwB3pwXXQWWdus7fDLR2mnFRQLiBFsVmHAH9VAs` is the live one (block
487556442 at probe time).

## 2. Messari Aave v3 Account action counters are all zero

Live deployments, all three synced to the head:

| Deployment | Id | Block |
|---|---|---|
| Ethereum | `JCNWRypm7FYwV8fx5HhzZPSFaMxgkPuw4TnR3Gpi81zk` | 25609612 |
| Arbitrum | `4xyasjQeREe7PxnF6wVdobZvCw5mhoHZq3T7guRpuNPf` | 487556453 |
| Base | `D7mapexM5ZsQckLJai2FawTKXJ7CqYGKM8PErnS3cJi9` | 49095549 |

On all three, `Account.depositCount`, `withdrawCount`, `borrowCount`,
`repayCount`, `liquidateCount` and `liquidationCount` are `0` for every account.
`accounts(where: {depositCount_gt: 0})` returns `[]` on each.

Proof it is a bug and not an empty index:

```graphql
{ account(id: "0x646c5ba59f30cf73deea9b00e13aead674c6b07a") {
    depositCount
    deposits(first: 10) { id amountUSD }
} }
```

returns `depositCount: 0` alongside a real `Deposit` of `$1463.67052386078821`.
The entity lists are correct; only the denormalised counters are not written.

Consequence for consumers: any threshold built on those counters silently
evaluates every wallet as inactive. We count entity list lengths instead, which
costs a page of ids per category per query.

**Ask:** either fix the counter writes in the standardised lending mapping, or
mark the field deprecated in the schema. A field that exists, type-checks, and
always returns 0 is worse than an absent one, because nothing fails.

Sorting is affected too: `orderBy: depositCount` degenerates into id order,
which looks like a working query returning "top" accounts.

## 3. The same standard does not mean the same fields

- Messari lending exposes `Account.positionCount`.
- Messari perpetuals (GMX) has **no** `Account.positionCount` at all; it has
  `longPositionCount`, `shortPositionCount`, `openPositionCount`,
  `closedPositionCount`, and its counters **are** populated
  (a sampled account: `longPositionCount` 5028, `swapCount` 684,
  `liquidationCount` 58).

So "Messari standardised" cannot be treated as one queryable interface. We ended
up keying query templates by schema type in a manifest, which works, but the
divergence is not visible until you introspect each deployment.

**Ask:** publish a per-deployment capability or schema-version field readable
through the gateway, so a client can select a query shape without introspecting
by hand.

## 4. Activity is not identity, and the top of every leaderboard says so

The highest `positionCount` account in Aave v3 Ethereum has 87224 positions and
zero deposits. `0x9008d19f58aabd9ed0d60971565aa8510560ab41`, the CoW Protocol
settlement contract, reads as one of the busiest addresses on the network.

Not a defect, but worth stating in the standardised docs: these entities count
addresses that appear in events, which includes routers, settlement contracts and
aggregators. Any product that ranks wallets by them will rank infrastructure
first. We handle it by keeping personhood on a separate axis entirely.

## 5. x402 route

`testnet.gateway.thegraph.com` does not resolve (NXDOMAIN), so the keyless path
has no test environment: the only way to try it is real USDC on Base mainnet.
For a weekend build that is a real barrier, and it is the reason our payment
layer ships as a seam with the Studio key wired first.

**Ask:** a faucet-funded or sandboxed x402 endpoint, even rate-limited. The
keyless pitch is the strongest thing about the gateway and it is currently
gated behind moving real money.

## What we shipped against this

`packages/context-bands-mcp`: manifest registry with a declared counting
strategy per deployment, a freshness gate that turns a stale source into
`unavailable` instead of a wrong tier, retired-id records with reasons, offline
tests over recorded responses, and a second consumer that is not our own app.
