# Step 09 — a landing a stranger can act on

Verbatim goal, set with `/goal`. Design session, `apps/web` only.

---

зная все контексты проекта и репы давай поштормим более адекватный сделать лендинг
т.к. там куча всего но слишком высокий контекст а надо чтобы любой человек разобрался
с этим т.е. суть все же про букинг отелей в первую очередь, омгут букать люди и агенты
и там разные сценарии и разные пути и также естественно грамотно отразить партнеров и
чтобы это все между собой сочеталось в рамках проекта хакатона т.е. ты заходишь
смотришь понимаешь о чем это жмешь кнопки и видишь какой результат ожидать (и возьми
более прикольный отель для демо на самом сайте)

---

## What was wrong

The page opened on the thesis, "who is behind an agent changes the terms it gets".
True, and the line the whole product turns on, but it is a claim about a mechanism.
Nothing above the fold said the product books hotels.

The only controls were three chips labelled in wallet jargon: `vitalik.eth`,
`long-time borrower`, `first-day wallet`. A visitor could not know what pressing one
would do, so when the result arrived it was not an answer to a question they had
asked. Nothing predicted, nothing confirmed.

## What changed

**Product first, claim second.** The headline is now what is for sale and the thesis
sits above it as a kicker, so the story still opens and closes on it.

**Predict, then press.** The three chips became three people, each stating what their
booking will look like before it is pressed. The lanes then show exactly that. A
judge who reads a card, clicks, and watches the terms land where the card said has
verified the underwriting engine without being told how it works.

Expectations were read off the live gateway, not written from the terms matrix:

| who | consented address | tier | term | gateway's reason |
|---|---|---|---|---|
| someone brand new | `0x646c…b07a` | human | deposit | too new to hold a price against |
| someone caught short | `0x62e2…b237` | verified | rate lock, pay later | held, not deferred: caught short before |
| long clean record | `vitalik.eth` | elite | pay at checkout | long record, nothing outstanding |
| nobody behind it | none, no credential | bot | prepay 100% | no one is accountable for this request |

So a card that stops being true is a card that stops matching the engine.

## The demo hotel, and why it is still Lisbon

The finale shows the room the gateway actually held, and the supplier holds the
cheapest room of the set. In Lisbon that is a one star hostel, which is a weak money
shot, so every alternative city was measured live on 2026-07-25:

| city | source | held room | photo |
|---|---|---|---|
| Lisbon | live | The Delight Hostel Lisbon, 1 star, $70.09 | yes |
| Porto | live | B&B Hotel Porto Gaia, 3 star, $98.05 | no |
| Cascais | live | Hotel Lido, 4 star, $104.18 | no |
| Sintra | live | NH Sintra Centro, 4 star, $178.49 | no |
| Paris | live | Art Hotel Paris Est, 0 star, $65.50 | no |

Photos and names come from `fixtureHotelInfo()`, the captured Lisbon snapshot, so
only Lisbon hotels have imagery. Sintra is all four star hotels and reads far better
on paper, but its finale card would render the no-photo placeholder. A photograph is
worth more than a star rating on a card that is forty percent image, so Lisbon stays.

The real lever is which room gets held, and that is the gateway's: it prebooks the
cheapest of `top_n`. Preferring the best rated room within the same set, or the
second cheapest, would put a four star hotel with a real photograph in the finale
without changing anything else. That is a gateway change and is not this session's
to make.
