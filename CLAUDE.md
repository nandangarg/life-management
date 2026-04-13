@AGENTS.md

# Life Management App — Claude Context

Personal life management app: Trello-like task boards + day-view calendar scheduling. Local-first, single-user, no auth. Designed to grow modularly (streaks, habits, mobile, cloud).

## Documentation

Detailed docs live in `docs/` — read these before writing code:

- [`docs/architecture.md`](docs/architecture.md) — stack, directory structure, state management, key design decisions
- [`docs/api.md`](docs/api.md) — all REST endpoints with request/response shapes
- [`docs/data-model.md`](docs/data-model.md) — Prisma schema, TypeScript types, cascade rules, quirks
- [`docs/components.md`](docs/components.md) — component props, responsibilities, state ownership
- [`docs/development.md`](docs/development.md) — setup, npm scripts, Prisma v7 gotchas, how to add features

## Critical Gotchas

**Next.js 16 — route handler params are async:**
```ts
// CORRECT
export async function PATCH(req, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
```

**Prisma 7 — adapter required, never use `@prisma/client` directly:**
```ts
import { PrismaClient } from "@/generated/prisma/client";  // ✓
import { PrismaClient } from "@prisma/client";              // ✗
```

**Tailwind v4 — no `tailwind.config.js`, uses PostCSS plugin.**

**`Task.tags` is a JSON string** — `JSON.parse(task.tags)` to read, `JSON.stringify(arr)` to write.

**Seeding via API** — use `POST /api/seed` or the UI button. The CLI seed (`npm run db:seed`) can fail with ESM errors.

## Architecture in One Paragraph

All state lives in `src/app/page.tsx`. Components are stateless props-receivers. API routes (`src/app/api/`) hit Prisma directly — no service layer. Database is SQLite via `better-sqlite3` adapter. The hierarchy is: Board → Category → Task → TaskSchedule. Boards can be hidden without deleting. TaskSchedule is separate from Task so a task can be scheduled multiple times or not at all.

## When Adding Features

Add new Prisma models + new `src/app/api/<feature>/` route folder + new components. Do **not** couple new features to existing task logic. Keep modules independent.
