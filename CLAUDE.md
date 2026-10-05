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

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **life-management** (460 symbols, 776 relationships, 8 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> Index stale? Run `node .gitnexus/run.cjs analyze` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? `npx gitnexus analyze` (npm 11 crash → `npm i -g gitnexus`; #1939).

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows. For regression review, compare against the default branch: `detect_changes({scope: "compare", base_ref: "main"})`.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `query({search_query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `context({name: "symbolName"})`.
- For security review, `explain({target: "fileOrSymbol"})` lists taint findings (source→sink flows; needs `analyze --pdg`).

## Never Do

- NEVER edit a function, class, or method without first running `impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit changes without running `detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/life-management/context` | Codebase overview, check index freshness |
| `gitnexus://repo/life-management/clusters` | All functional areas |
| `gitnexus://repo/life-management/processes` | All execution flows |
| `gitnexus://repo/life-management/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
