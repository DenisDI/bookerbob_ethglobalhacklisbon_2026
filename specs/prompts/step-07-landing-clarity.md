# Step 07 — the landing, read by a stranger

Verbatim prompt, run in a design session working in parallel with the backend/World
session. Boundary: `apps/web` only, no `npm install`, no `.env`, rebase before every
push.

---

Ты дизайн-сессия для BookerBob, работаешь ПАРАЛЛЕЛЬНО с другой сессией которая делает
бэкенд/World. Чтобы не столкнуться:

ГРАНИЦЫ (строго):
- Ты трогаешь ТОЛЬКО apps/web (компоненты, index.css, токены, шрифты, публичные
  ассеты). Не лезь в apps/gateway и packages — там работает другая сессия.
- git add ТОЛЬКО своих файлов из apps/web, НИКОГДА git add -A и git add . (в дереве
  есть чужая незакоммиченная работа, не проглоти её).
- Перед push всегда git pull --rebase.
- НЕ запускай npm install (общий lock подерётся с другой сессией). Если нужна
  зависимость — остановись и скажи мне.
- .env не трогай.

Первым делом: git pull (взять смердженный дизайн и свежак), потом npm run dev:web.

Задача: доработать лендинг и гонку. Канон дизайна: specs/design/ (DESIGN-BRIEF.md +
папка хендофа если есть). Применяй визуал ПОВЕРХ существующей логики и данных
гейтвея, не переписывай логику; существующие компоненты (RacePane, ContextFile,
SettlementRail, HotelFinaleCard, AddressBands, NarrationFeed, SpentCounter) сохраняют
пропсы и поведение.

Приоритетные фиксы (текущий лендинг непонятен незнакомцу и партнёров не видно):
1. Подзаголовок под тезисом простыми словами: AI-агент бронирует отель, условия
   зависят от того кто за агентом. Без крипто-жаргона.
2. Убрать дебаг-панель "PIPELINE temp wire view · design will replace" — заменить
   нормальной живой строкой статуса "что участвует" с ЛОГОТИПАМИ партнёров: World у
   human/credential, The Graph у standing, Hedera у settlement.
3. Лого партнёров также у их момента в лейнах и на финальной карточке
   (Hedera/HashScan).
4. Idle-состояние учит (подсказка что делать), не пустые лейны с NOT ASKED.
5. Город не хардкод-Лиссабон гигантским марки — либо редактируемый поиск, либо
   убрать.

Правила: имя BookerBob но герой человек; без скидок/процентов/"репутация"; стойка
только бэндами; матрица тиров не таблицей-планчузером; тёплый lowercase; крипто-жаргон
не на главной. Перед каждым коммитом: npm run dev:web поднимается, npm run typecheck и
npm run lint:lexicon чисты. Коммиты маленькие, атрибуция в том же коммите, без длинного
тире, автор hustle1hustle.

---

## What the session found in the code before designing

- The gateway already accepts `?city=`, and the live booker path honours it. The
  captured snapshot deliberately answers with the city it really quoted
  (`file.query.city`), because reporting a requested city over cached prices would be
  a quiet lie. So an editable city is only honest if the screen shows what the desk
  actually answered.
- `PartnerMarks.tsx` already existed with all three marks drawn on `currentColor`, so
  placing them was composition, not new art.
- `OffersResponse.credential` is server-owned as of the World step, so the
  participants strip can show a genuinely verified state instead of asserting one.
