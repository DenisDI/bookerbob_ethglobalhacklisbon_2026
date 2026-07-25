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

## The race UI

Design direction, decided for this brief rather than reached for by habit:

- **The settlement rail is the signature.** Both panes share one timeline from
  today to checkout, and the stretch where the guest's money is tied up is
  hatched on it. The unbacked agent's rail is filled end to end; the backed
  one's is empty until a single mark at checkout. That is the entire product in
  one glyph, readable with no crypto context and no copy.
- **Colour means accountability.** The unbacked pane is drawn in greys only.
  Blue appears where a real person stands behind the request, so the palette
  states the thesis before a word is read. The deliberate risk: the bot pane
  looks dim on purpose.
- **Monospace for machine facts, sans for the agent's sentences.** Prices, dates
  and hold ids are ledger entries; narration is speech. Not a fake terminal.
- **System faces only.** A conference network must not be able to take the
  typography down mid demo.
- Enums never reach the screen: `rate_lock_pay_later` reads as "price held now,
  settled later" (`terms-copy.ts`).

`?autorun` starts the race on load, so each beat is reachable without setting it
up by hand between takes (specs/03-web-demo.md).

Two honest notes from the visual pass. The `?autorun` effect billed the metered
agent twice under React StrictMode until it was guarded by a ref. And the
"mobile overflow" seen in a first screenshot was an artefact: headless Chrome
clamps its window to 500px, so a 390px capture was simply cropped. Measured
through CDP with a real 390px viewport, `scrollWidth == clientWidth`, no
overflow. The `min-width: 0` and `minmax(0, 1fr)` guards were kept anyway, since
long property names are exactly the input that would cause a real one.
