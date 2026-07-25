Продолжаем сборку FairTerms. Канон: specs/00-final-plan.md; имплементация:
specs/01-gateway.md, 02-context-bands-mcp.md, 03-web-demo.md. Скелет (шаг 1) уже
закоммичен.

Сначала гигиена, один раз:
- git config user.name "hustle1hustle" и user.email "hustlesnob@gmail.com"
  (в истории затесался коммит от автора "Surfer", больше так не делаем).
- В коммит-месседжах НЕ использовать длинное тире, только запятые/двоеточия.
- Коммиты маленькие, по одной осмысленной единице. В ТОМ ЖЕ коммите обновлять
  docs/AI-ATTRIBUTION.md по добавленным файлам и класть промпт в specs/prompts/.
- Секреты только в .env (он в .gitignore). Никогда не коммитить реальные ключи.
  Перед каждым коммитом: git status и убедиться, что .env / .DS_Store не попали.

НЕ блокируйся на World ID и регистрации агента. Их сделает человек позже.

Задачи по порядку:

1. Инвентарь (шаг 2, specs/01-gateway.md).
   - Сначала curl'ом подтверди точный транспорт booker MCP:
     POST https://flexrep.xyz/mcp_travel/mcp (голые пути дают 301/405; MCP-клиенты
     не переигрывают POST через 301). Нужен заголовок Authorization: Bearer <токен>
     и сессия через заголовок mcp-session-id (initialize -> tools/call).
     Токен читай из .env как BOOKER_TOKEN (если пусто, остановись и попроси его).
   - Сделай интерфейс Inventory { search, rates, prebook } с двумя реализациями:
     booker.ts (disposable-сессия, retry-once-and-reinit при любой ошибке) и
     fixtures.ts (отдаёт fixtures/lisbon.json на любой ошибке/таймауте 2с, помечает
     source: "cached").
   - Сделай Lisbon-поиск + rates один раз живьём, СОХРАНИ сырой ответ в
     fixtures/lisbon.json и ЗАПИНЬ id одного отеля в demo.config.ts для финальной
     карточки. Проверь, что оффлайн на фикстурах всё работает.
   - НЕ строй ничего поверх flexrep, пока в docs/DISCLOSURE-SIGNOFF.md нет
     подтверждения организаторов. Если файла нет, всё равно можно писать код против
     фикстур; просто оставь пометку, что live-путь ждёт sign-off.

2. Terms engine + шелл гонки (шаг 3).
   - src/terms.ts: только енумы риска (prepay_100 | deposit | rate_lock_pay_later |
     pay_at_checkout), НИКАКИХ скидок/процентов/множителей цены.
   - src/narration.ts: на каждый шаг пайплайна тёплая строка в нижнем регистре, без
     крипто-жаргона на поверхности.
   - apps/web: сплит-скрин из specs/03 (гонка, один и тот же промпт в обе панели,
     счётчики spent, лента нарации). Пока на заглушечных данных.
   - После правок гоняй npm run lint:lexicon, он должен быть чистым.

3. AgentKit (шаг 4) с МОКОМ, реальную привязку подключим позже.
   - src/world.ts: middleware Plan A ПЕРЕД пейволлом (specs/01-gateway.md): парс
     agentkit-заголовка, валидация SIWE + nonce, затем lookup человека.
   - createAgentBookVerifier импортируй из @worldcoin/agentkit-core (НЕ из
     @worldcoin/agentkit). Хуки agentkit отдают { requestHook(ctx) }, а @x402/core
     2.19 ждёт onProtectedRequest(decl, ctx): нужен глю ~10 строк.
   - Сам AgentBook-верификатор спрячь за интерфейсом и подставь MOCK, который
     возвращает humanId для тестового заголовка. Реальный ончейн-lookup включим,
     когда будет зарегистрирован кошелёк агента. Пометь TODO явно.

4. Что нужно от человека (собери в конце в одно сообщение, не блокируйся):
   - BOOKER_TOKEN в .env (если ещё нет).
   - Для проб субграфов (шаг 5, потом): либо GRAPH_API_KEY из Studio, либо кошелёк
     с $2-5 USDC на Base mainnet как GRAPH_USDC_KEY (тестнет-гейтвей Graph = NXDOMAIN).
   - Регистрация кошелька агента (сделает человек с World App).

Останавливайся после шага 3, если упрёшься в отсутствие токена или ключа, и чётко
скажи, что именно нужно. Проверяй, что npm install / dev:gateway / dev:web живые
после каждого крупного шага.
