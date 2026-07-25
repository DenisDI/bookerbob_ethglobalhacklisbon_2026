# Step 08 — machine view, what the agent sees

Verbatim prompt. Design session, `apps/web` only, running in parallel with the
backend/World session.

---

Следующая задача: второй вид сайта — MACHINE VIEW ("что видит агент"). Продукт это
гейтвей ДЛЯ агентов; человеческий race-вид это витрина, а machine view показывает
истинную сторону: что агент реально получает от сервиса и как принимает решение.
Агенты не мыслят интерфейсами, они мыслят структурированным обменом: запрос,
челлендж, ответ, типизированные данные. Реальные эндпоинты появятся позже, ты
проектируешь ПОДАЧУ этого обмена по нижеописанной форме.

Связь с человеческим видом: это переключатель (human view / machine view) — один и
тот же путь, показанный двумя правдами. Человек получает нарацию и визуал, агент
получает челленджи и типизированные ответы. Дизайнь machine view как отдельный
полноценный экран с тем же токен-набором.

Что показать — рукопожатие агента с сервисом, шаг за шагом, машинно-нативно:
1. Запрос агента: метод, путь, параметры (город, даты, согласованный адрес, приложен
   ли креденшал/оплата).
2. Ответ-челлендж (когда агент не подтверждён): требования оплаты по x402 (scheme,
   сумма в центах, сеть, актив, получатель) И альтернатива — предъявить credential
   человека (AgentKit). Два пути, как их видит машина.
3. Ответ агента: либо подписанный x402-платёж, либо подписанный agentkit-заголовок
   (человек за агентом).
4. Проверенный ответ сервиса, типизированные поля:
   - identity: humanId (или none)
   - context bands: по осям tenure/activity/breadth/scale как T0..T4, сигнал
     repayment, категории, freshness (свежесть источника). БЭНДЫ, не сырые числа —
     даже машине не отдаём raw, стойка всегда банд.
   - terms: tier, inventory, payment (prepay_100 | deposit | rate_lock_pay_later |
     pay_at_checkout)
   - offers: записи (id отеля, цена за ночь, дата free-cancel, book_hash)
   - settlement для отложенных тиров: schedule id + ссылка на транзакцию (HashScan) +
     дата исполнения
5. Поверхность инструментов: схема тула, которым агент сам может запросить свою
   стойку (context-bands, MCP), чтобы вид читался и как developer/agent-консоль.

Партнёры здесь НАТИВНЫ, помечай их у их протокольного момента (это сильнее логотипа):
x402 у 402-челленджа и платежей, World у credential-челленджа и humanId, The Graph у
блока bands/freshness, Hedera у settlement-ссылки. Технический судья должен увидеть
свою технологию в самом протоколе.

Эстетика: машинно-flavored но ДИЗАЙНЕРСКИ, не сырой дев-дамп. Моно-forward (моно =
машинные факты, это буквально весь вид), структурировано, читаемо, console/schema-
ощущение, но выверено. Держи два смысла: моно = факты, цвет = подотчётность (акцент
там где за запросом реальный человек). Айдентика BookerBob.

Состояния с той же строгостью: пустой (ещё нет запроса), 402-челлендж, ответ после
оплаты, ответ после credential, no-context, стойка stale ("band unavailable"),
settlement pending, ошибка сервиса (503).

Правила: без скидок/процентов/"репутация"; стойка только бэндами даже машине; тёплого
lowercase здесь меньше (это машинный вид), но без крипто-маркетинга; имя BookerBob.
Отдай экран(ы) machine view + как он переключается с human view + переиспользуй токены.

---

## Decisions this session made, and why

**Provenance tags instead of a plausible transcript.** A browser cannot sign. An
agent presents a credential by signing a header with its own key and pays by signing
a payment authorisation, and a page cannot do either on the agent's behalf. So the
two middle legs of the handshake are tagged `declared` (the wire shape, taken from
the spec and the code that implements it) and the request and response around them
are tagged `live` (rendered from the response this page actually received). The repo
already refuses to name integrations it has not seen work; this is the same rule
applied to a screen.

**Both paths are one run.** The transcript is built from the race's own two lane
responses, so switching path is not switching example, it is looking at the other
half of one comparison. Frames 01 and 02 are identical on both paths: one anonymous
ask, one challenge that advertises both ways out. Everything after 02 is the
consequence of which way was taken.

**humanId is a field, and it is withheld.** The prompt asked for `humanId (or none)`.
The gateway deliberately keeps it server side, because it is anonymous but still
somebody's identifier. So the row exists, typed, and reads `withheld` rather than
printing one or pretending the field does not exist.

**book_hash is named as not sent.** The design package sketched a supplier
`book_hash`; the gateway sends `partnerOrderId` and keeps the supplier reference
server side. The row says so rather than inventing a hash.

**freshness is stated as gated upstream.** Per-source freshness lives in the MCP
tool's return, not in the gateway's response: the gate runs in the reader and an
unreadable source arrives already collapsed into `unavailable`. The response row says
that, and the tool surface below documents the full freshness detail.
