# Step 11 — an overview that explains, and a booking you can do yourself

Verbatim prompt. Design session, `apps/web` only.

---

ок, теперь я думаю что основная страница должна быть описательной, а вкладка нынешняя
должна быть больше race // demo, описательная - без поломки глаз понимаешь что за
продукт и в чем его ценность и там же должен будет быть флоу для человека (кошелек,
ворлд ид и т.п.) а вторая вкладка - как раз будет отражать на конкретных примерах
разницу

---

## What was wrong

The site had one human surface and it was the race. It argues well, but it argued
before it explained: a visitor met a comparison between two things nobody had told
them about, and the only thing they could do was watch two agents transact. There
was nowhere a person booked anything themselves, even though every piece needed for
that already worked.

## Three surfaces

- `overview` (default) — what this is, why it matters, and your own booking.
- `demo` — the race, unchanged, on concrete people.
- `machine` — the protocol transcript, unchanged.

`?view=demo` and `?view=machine` are explicit; the default is the overview. The
filming links are `?autorun=1&address=…` with no view on them and they point at the
race, so `readView` resolves `autorun` to `demo` rather than stranding them on a
page that does not race.

## The mechanic the overview is built on

No gateway work. `GET /offers` already returns the standing, the terms, the rooms,
the hold and the Hedera schedule in one answer, and `api.ts` already forwards both
the World ID session header and the Privy access token.

All four states measured live on 2026-07-25:

| | no personhood | personhood proved |
|---|---|---|
| no wallet | `bot` / prepay the whole stay, *"no one is accountable for this request"* | `human` / deposit, *"no wallet shared, so the credential carries it alone"* |
| wallet connected | `bot` / prepay, **bands fully read and counted for nothing** | `verified` or `elite` / price held, or nothing until checkout |

The bottom-left cell is the page's best moment and it was free. `decide()` returns
`BOT` before it ever looks at context, so a connected wallet with no personhood has
its whole history read and extended nothing. "We can see everything you have done
and it buys you nothing until somebody is answerable" is the thesis, said by the
engine rather than by us. The terms panel says exactly that when it happens.

Because the engine really works that way, the steps are optional and can be done in
either order. A forced wizard would have been a lie about the mechanism.

## Decisions

**A person browsing is not an agent being metered.** `api.ts` routed every
uncredentialed call through `POST /x402/paid-offers`, which settles real money. The
overview starts uncredentialed by design, so every page view would have paid a
supplier fee for someone who had not asked for anything. Added an optional
`metered` flag, defaulting to today's behaviour so the race is untouched; the
overview passes `false` and takes the free route. Verified on a clean network log:
two GETs, no payment.

**The terms panel never unmounts.** The argument is that terms move as proof is
added, and a panel that only appears once there is something good to say cannot
show movement. It is on screen from the first paint, and it keeps the previous
answer visible while refreshing rather than blanking, because a supplier round trip
is about fifteen seconds and a skeleton in between would lose the whole effect.

**Every word in it is the gateway's.** The term is translated from the payment enum
by `terms-copy`, and the explanation is the `reason` string verbatim, so the panel
cannot drift away from the engine that decided it.

**A step that breaks does not take the booking down.** `FlowBoundary` wraps the
personhood step, which renders a third-party widget through a component this
session does not own and which had already thrown on mount and blanked the page.
Five working steps beat a stack trace.

**The personhood control is repositioned, not rewritten.** `worldid/selfie.css`
fixes it to a corner, which is right on the race tabs. Inside a step it belongs in
the flow, so the override lives in `index.css`, which that file's own header asks
for.
