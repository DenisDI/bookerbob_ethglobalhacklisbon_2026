# Prompt — step 5b (context as an underwriting file)

```
давай по the graph получше пройдемся по контекстам какие собираем чтобы демо на
сильном уровне была, давай сначала что сейчас мы берем еще раз? хочу свежим
взглядом пройтись заново
```

The review started by listing what step 5 actually collected: five sources
collapsed into one number, `defi_activity`. A fresh probe of the same data showed
that was both wasteful and the wrong shape.

## Why one axis was wrong, not just thin

A single activity total makes the product say "did more, gets more". That is a
scoreboard, and it is the shape `00-final-plan.md` §A.0 warns about: the banned
pattern is credential-driven rewards, and a rising number driving better terms is
the same idea wearing subgraph clothes.

Real underwriting asks separate questions whose answers are allowed to disagree,
and the live data has exactly that case in it.

| Address | Reading |
|---|---|
| `0x62e2ce…` | borrowed $52,621 on Arbitrum since Dec 2023, repaid $48,393, **liquidated twice**, 18 markets |
| `0x561c75…` | trading since 2022, $83,854 across **33 pools**, never borrowed, ENS `57168.eth` |
| `vitalik.eth` | dex only, $783,782 across **86 pools**, name registered **2017**, no lending at all |
| `0x646c5b…` | one deposit, same day |

The busiest address is not the best risk. So the engine now reads four
independent bands (activity, tenure, breadth, scale) and one repayment signal,
and the terms follow: `heavy` earns a held price but not settlement at checkout,
because it has been caught short before. Same rate sheet, different risk, decided
by a fact rather than a total.

Live results after wiring, all five through the running gateway:

| Input | Bands | Repayment | Terms |
|---|---|---|---|
| `vitalik.eth` | T4/T4/T4/T4, since 2017 | no_credit_history | elite, pay at checkout |
| `0x62e2ce…` | T4/T3/T3/T3, since 2023 | **liquidated** | verified, rate lock only |
| `0x561c75…` | T3/T4/T4/T3, since 2022 | no_credit_history | elite, pay at checkout |
| `0x646c5b…` | T1/T1/T1/T2, since 2026 | no_credit_history | human, deposit |
| unused | T0 everywhere | no_credit_history | human, deposit |

## Two defects found while building it

**ENS returns undisplayable names, and they carry dates.** Records whose label
preimage the subgraph does not know come back as `acompany.[5b27bed6…].eth`.
Placeholder addresses collect them: `0x1111…1111` holds two from 2017. An
"oldest name wins" rule handed a burn-style address three decades of tenure. Now
any name containing a bracket is skipped.

**The address used as the "empty" test fixture was not empty.** `0x1111…1111`
holds two Aave positions on Base and those 2017 ENS records. Replaced with an
address verified to be absent from every source.

Both went into `docs/FEEDBACK-graph.md`, along with the ask that matters most to
a consumer: the standardised schemas have no `firstSeen`, `lastSeen` or lifetime
USD on `Account`, so size has to be summed client side and is bounded by the page
read.

Verified: typecheck clean, 26/26 gateway tests, 14/14 MCP tests offline with no
key and no network, lexicon clean, and `vitalik.eth` resolving through the MCP
end to end.
