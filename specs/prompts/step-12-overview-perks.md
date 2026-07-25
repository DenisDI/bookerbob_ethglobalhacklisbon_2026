# Step 12 — the overview leads with the perk

Verbatim prompt. Design session, `apps/web` only, overview surface only.

---

Редизайн вкладки Overview: сейчас она честная но читается как эссе ("nothing below is
required, order does not matter") — не ведёт человека и прячет ГЛАВНОЕ: перк, который
получаешь за следующий шаг. Сделай продуктовый perks-forward флоу, Jobs-просто, и покажи
что тут сосуществуют люди И агенты. Overview-only, гонку не трогай.

ГЛАВНЫЙ ЭЛЕМЕНТ — лестница перков (новый компонент PerksLadder.tsx), видна с первого
пейнта, три ступени, на каждой сначала НАГРАДА потом действие, текущая подсвечена,
остальные видны но locked (видишь пункт назначения до старта):
- сейчас (аноним): "плати всю сумму вперёд" — где ты.
- + докажи что человек (World): "оставь депозит, а не всю сумму".
- + подключи кошелёк, читаем стойку (The Graph): "залочи цену, плати при заезде" (когда
  стойка достаточна).
Партнёрская метка на своей ступени. Locked-ступени серые с одной строкой "сделай X →
откроется". Шаг выполнен → ступень зажигается, панель terms двигается в тот же момент.

ПРОДАЖА + АГЕНТЫ (не только про людей): герой benefit-first; "два входа" вверху, оба
first-class — сделать самому, либо доверить агенту (ссылка на гонку, AgentKit назван как
агентская версия "докажи кто за бронью"); сказать один раз что перк одинаков для
человека и для агента с human-backed креденшалом, один движок.

ВЕДЁМ, но не врущий визард: движок реально принимает шаги в любом порядке, НЕ хардгейти.
Один "рекомендованный следующий шаг" визуально primary, второй тише. Выполнил любой →
пересчитывается что primary.

КОПИ ведёт наградой: кошелёк "посмотри что открывает твоя история"; человек "перестань
платить всю сумму вперёд"; awkward-стейт (кошелёк без personhood) = перк-нудж "стойка
прочитана, один шаг чтобы обналичить", не тупик.

МЕНЬШЕ ТЕКСТА: герой = одно benefit-предложение + твист; удали "how the desk decides";
заметки шагов по одной строке; reason-строка только в панели terms.

СОХРАНИ: YourTerms (не размонтируется, копи синхронизировать с лестницей), партнёрские
метки, bands-only через ContextFile, SettlementRail, финальную карточку hold, все
состояния, FlowBoundary вокруг World-виджета.

---

## The one place this could have lied

Both proofs can be in and the record behind them still not reach the top rung. If
the locked line just repeated "connect a wallet" to somebody whose wallet is
connected and already read, the ladder would be advertising a step that cannot
help. So the top rung has a fourth state, `blocked`, which shows the gateway's own
`reason` instead of an action, and the locked line is state aware: a wallet that
has been read says *"prove a person to open this: your history is already read"*.

Driven against the live gateway, forcing the flags the browser cannot reach on
this build and reverting after:

| state | rungs | primary | panel |
|---|---|---|---|
| fresh | here / locked "prove a person" / locked "prove a person and connect a wallet" | person | prepay |
| wallet only | here / locked / locked **"your history is already read"** | person | prepay, nudge |
| person only | reached / here / locked "connect a wallet" | wallet | deposit |
| both, long record | reached / reached / **here** | none | nothing until checkout |
| both, thin wallet | reached / here / **blocked "too new to hold a price against"** | none | no move offered |

## Guided without gating

The primary step is the card itself, not a separate button: `SelfieCheck` and
`ConnectWalletButton` own their own open state, and giving the page an imperative
handle would have meant editing `worldid/SelfieCheck.tsx`, which belongs to the
other session. The secondary step stays fully usable throughout, because the
engine really does take these in any order.

Proving a person leads even when a wallet is already connected, because it is the
larger jump: it takes the whole stay off the counter, and without it the history
counts for nothing.
