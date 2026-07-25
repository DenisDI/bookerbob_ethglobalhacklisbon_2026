# Prompt — build step 3 (terms engine + race)

Driving specs: `specs/00-final-plan.md` §A.2 (underwriting matrix) and §G.2 step 3,
`specs/03-web-demo.md`. Tool: Claude Code (Anthropic). Verbatim prompt below.

```
окей, принято, переходим к следующему пункту плана, какие мысли, сейчас ворлд
агент или позже?
[...]
на время фриза не смотри тиммейт мой подключится и тп, все успеем, так что давай
идти как кайф
```

Decision recorded: the World agent registration is a parallel human task (it
yields the in-window tx hash), not the build's critical path. Step 3 was taken
first because it needs no external key and everything else hangs off it.

## Design notes

- `decideTerms` is pure and takes SIGNALS, not a tier. The `?tier=` debug
  parameter synthesises signals so the demo shows the real matrix deciding
  rather than a canned answer, and it disappears once a credential is wired.
- `"unavailable"` (a stale subgraph) is given no rank at all: it can neither
  raise a tier nor lower one. A stale tier is worse than no tier, because the
  guest would be underwritten on a fiction.
- No credential outranks any amount of context: context without an accountable
  person is not underwritable. Asserted in the tests.
- `offerLimit` restricts only the unbacked tier (3 of 10). member and elite
  resolve to the same depth as full on purpose: the supplier returns one ranked
  list, and the honest difference between those tiers is the payment term.

## Snapshot depth

The step 2 snapshot was captured at `top_n: 3`, so offline every tier looked
identical. `demo.captureTopN` is now 10, at least the largest `offerLimit`, and
the fixture was retaken: 10 hotels, 9 with photos.

Refinement on the `get_hotel_info` defect: it fails per hotel, not globally. In
this capture 2 of 10 failed with the same offset-naive/offset-aware error, and
one of those kept its metadata only because the capture script merges rather
than overwrites.

Verified: typecheck clean, 20/20 offline tests, lexicon clean, and over HTTP
bot 3 rooms / prepay_100 / no hold, human 10 / deposit / no hold, verified 10 /
rate_lock_pay_later / hold, elite 10 / pay_at_checkout / hold.
