# Prompt — build step 2 (inventory adapter + /offers)

Driving specs: `specs/00-final-plan.md` §G.2 step 2 (never-cut #1 in
`specs/CUT-ORDER.md`), `specs/01-gateway.md` inventory adapter section.
Tool: Claude Code (Anthropic). Verbatim prompt below.

```
ок давай к первому этапу плана перейдем, будем делать глубоко по крупицам
[...]
мы не апишку кверим а джсон?
[...]
да едем так, имей в виду что мы потом добавим в мсп возможность букинга,
сейчас пока так чтобы не набукать лишнего пока тесты
```

Approved plan: inventory adapter with the live booker MCP as the primary source
and a captured in-event snapshot as the mandated second source; `/offers`
returning real hotels at bot tier; offline tests.

## What the live server actually told us (2026-07-25)

Schema was taken from a live `tools/list`, not from the partner doc — the doc
omits several tools and all input schemas.

- `find_and_prebook_hotel` is the prod path: search + pick + prebook hold in one
  call. **~7-15s wall clock**, so the 2s timeout in `01-gateway.md` was replaced
  with 25s for search and 5s for metadata.
- 12 tools exist, not the 6 documented. `top_n` (default 3) maps exactly onto the
  bot tier's short list.
- `book_hash` is a real supplier field on each rate, not our invention.
- `book_hotel` is disabled server-side while the team tests, so runs cannot leave
  real reservations behind. Kept behind `BOOKER_BOOKING_ENABLED` (default off).
- Lisbon: `region_id` 2080, 10 matching hotels for 2026-08-14 → 2026-08-17.
- `get_hotel_info` returns `images[]` — the finale card can have a photo.

## Defect found in the booker service

`get_hotel_info` returns `isError: true` with:

```
Error executing tool get_hotel_info: can't subtract offset-naive and offset-aware datetimes
```

243ms, no dates in the input, and the same `hotel_id` returned 6 images at
10:45 UTC the same morning — so it is neither a timeout nor missing data. Looks
like the 30-day cache-expiry check compares a tz-aware stored timestamp against
a naive `utcnow()`. Reported to the team; static hotel metadata is served from
the captured snapshot until it is fixed.

Verified before commit: `npm run typecheck` clean across three workspaces and
scripts, `npm test -w @fairterms/gateway` 9/9 offline, `npm run lint:lexicon`
clean, live `/offers` 200 with real prices in 6.8s, and the fallback path
serving the snapshot with HTTP 200 when the supplier is unreachable.
