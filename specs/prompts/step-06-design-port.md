# Prompt — step 6 (porting the design package)

```
Портируй скачанный дизайн-пакет (папка bookerbob-design/, начни с HANDOFF.md) в
живой apps/web. Это НЕ переписывание с нуля [...] Твоя задача — натянуть
визуальный слой поверх существующей логики.

ЖЕЛЕЗНОЕ ПРАВИЛО: не трогай логику и контракт данных. [...] Если дизайну нужно
поле, которого нет в данных — не выдумывай его, останови и скажи мне.
```

Full instruction in the conversation. Three commits: design system, race screen,
walkable flow. The package (`HANDOFF.md`, `tokens.css`, `styles.css`, `states.md`,
`components/*.md`, two static reference frames) was drawn against the existing
`OffersResponse` and asks for no new endpoint.

## Where the design asked for data that does not exist

The rule beats the drawing. Each of these is implemented honestly instead.

**Creeping sub-cent digits in the counter.** `SpentCounter.md` asks for the third
and fourth decimal incrementing every ~140ms, and adds: "cap the creep so they
never roll to $0.15 mid-shot". There is no such data, and the instruction is to
tune a number for the camera. The big typography is kept; the number is the real
`spentUsd`.

**`AUTHORIZED · NOT CHARGED` on the backed lane.** Nothing is authorised: x402 is
not wired at all. Reads `NOTHING CHARGED`.

**A live 402 lifecycle in the meter strip.** `HTTP 402 · paying $0.01 to unlock
this answer` → `HTTP 200 · answer unlocked` needs a 402 that never happens. The
race keeps the strip and states what is true; the full lifecycle is drawn in the
walkable flow as an explicitly labelled mock, which is where the package itself
puts payment states.

**`8 more rooms sit behind another payment`.** That reads as pay-more-see-more.
Depth follows from someone being accountable, not from paying: in `terms.ts` the
short list is the anti-farming limit. Reads `8 more rooms need someone
accountable`.

**Payment states with `PAY $210.28`.** No payment execution exists. Flow-only
mocks, and not named as working anywhere.

**Chip `alice.eth / BORROWS AND REPAYS`.** No verified address with
`repayment: clean` was in hand, so one was probed for rather than invented.

## Things absent from the package

No `fonts/` directory, so there is nothing to self-host. Both token stacks are
already system stacks and `HANDOFF.md` calls self-hosting optional. Downloading
Archivo and JetBrains Mono would add a network dependency and a licensing
question for something the design already handles, so the stacks ship as drawn,
with the design's own note kept in the stylesheet: dropping woff2 files in later
picks them up with no other change.

## Deliberate deviations recorded

The accent moves from the brand `#3b5bff` to `#9AA6FF`. The designer's reason is
sound: small type on the brand blue falls apart in a 720p screen recording, which
is this demo's delivery medium. `CLAUDE.md` names the brand value, so the
compromise from `HANDOFF.md` is taken instead of a silent replacement: brand blue
on fills and borders, lifted accent on small type. Both live in the stylesheet as
`--blue-fill` and `--blue`.

`styles.css` paints links `--color-signal` while `HANDOFF.md` reserves red for
system marks only. Links stay on the accent; the rule wins over the sheet.

One new optional display-only prop was agreed for the red anchor square that
marks the room appearing in both lanes, since that comparison is the argument and
it needs cross-lane knowledge.

---

# Step 4 addendum — World AgentKit (same session)

```
ок давай world начинать работать, я получу agentid позже сам хэш и т.п. найду
ментора с verified human так что это не блокер, начинаем
```

The agent key turned out to be in `.env` already and the wallet **was** registered,
so the path went further than planned: World is a working integration, verified by
falsification rather than by hope.

| Input | Credential | Terms |
|---|---|---|
| registered agent wallet signing a real header | `verified` + `source: world` | elite, pay at checkout |
| freshly generated wallet signing | `missing` (`agent wallet is not registered`) | bot, prepay |
| browser `?credential=1` | `stand_in`, permanently | elite |
| nothing | `missing` | bot |

The control matters: the same code path in the same second refuses an
unregistered wallet and accepts the registered one, so the AgentBook lookup is
doing real work.

Three findings, all in `docs/FEEDBACK-world.md` with the exact error strings:
`createAgentBookVerifier` is exported from both packages (the spec's §E trap is
wrong for 0.2.0, corrected in place); `declareAgentkitExtension` is the server
half and omits the `nonce`/`issuedAt` that `createHeader` requires; and `domain`
must be the hostname **without** the port while `uri` keeps it.

And one worth stating plainly: `AgentkitMode` offers `{ type: "discount",
percent }`, so the SDK's shortest path from "a human is behind this agent" to
"do something about it" is the exact pattern the prize rules disqualify. We use
no `mode` at all.
