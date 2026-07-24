# Prompt — build step 1 (repo skeleton)

Driving specs: `specs/00-final-plan.md` G.2 step 1, `specs/01-gateway.md`,
`specs/02-context-bands-mcp.md`, `specs/03-web-demo.md`.
Tool: Claude Code (Anthropic). Verbatim prompt below.

```
Прочитай specs/00-final-plan.md и specs/01-gateway.md, 02, 03.
Собери первый код-коммит: скелет монорепы, который запускается.
- .env.example со всеми ключами из 01-gateway (пустые значения)
- apps/gateway: Hono, роут /health, package.json, tsconfig
- apps/web: Vite + React, пустая страница
- packages/context-bands-mcp: пустой MCP-скелет, npx запускается
Проверь что npm install проходит и dev:gateway/dev:web поднимаются.
Обнови docs/AI-ATTRIBUTION.md строками на созданные файлы В ЭТОМ ЖЕ коммите.
Закоммить и запушь. Секреты только в .env (в gitignore), не в гит. не делать git add -A
вслепую, а добавлять конкретные файлы, чтобы случайно не влетел .env или .DS_Store.
```

Verified before commit: `npm install` clean, `GET /health` 200 on :3000,
Vite dev serving on :5173, `npx context-bands-mcp` answers `tools/list` over
stdio, `npm run typecheck` green across all three workspaces,
`npm run lint:lexicon` clean.
