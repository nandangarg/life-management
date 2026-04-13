# Architecture Overview

## What This Is

A personal life management app: Trello-like task boards + calendar scheduling. Built local-first, designed to grow toward mobile + cloud.

## Tech Stack

| Layer | Choice | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.2.1 |
| Language | TypeScript | ^5 |
| Styling | Tailwind CSS | ^4 |
| ORM | Prisma | ^7.6.0 |
| Database | SQLite via `better-sqlite3` | — |
| DB Adapter | `@prisma/adapter-better-sqlite3` | ^7.6.0 |
| Runtime compat | `jiti` (for seeding) | ^2.6.1 |

> **Next.js 16 note:** APIs and conventions may differ from training data. Always read `node_modules/next/dist/docs/` before writing Next.js-specific code.

## Directory Structure

```
life-management-app/
├── prisma/
│   ├── schema.prisma          # Source of truth for DB schema
│   ├── dev.db                 # SQLite database file (gitignored)
│   ├── prisma.config.ts       # Prisma config
│   └── migrations/            # Auto-generated migration files
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Single-page app shell (all state lives here)
│   │   ├── globals.css        # Tailwind base styles
│   │   └── api/               # Next.js Route Handlers (REST API)
│   │       ├── boards/        # GET, POST /api/boards; GET, PATCH, DELETE /api/boards/[id]
│   │       ├── categories/    # POST /api/categories; PATCH, DELETE /api/categories/[id]
│   │       ├── tasks/         # GET, POST /api/tasks; PATCH, DELETE /api/tasks/[id]
│   │       ├── schedules/     # GET, POST /api/schedules; PATCH, DELETE /api/schedules/[id]
│   │       └── seed/          # POST /api/seed (resets + loads sample data)
│   ├── components/
│   │   ├── BoardView.tsx      # Kanban columns for one board
│   │   ├── BoardManager.tsx   # Settings panel: board + category CRUD
│   │   ├── TaskCard.tsx       # Single task card with actions
│   │   ├── TaskForm.tsx       # Create/edit task modal
│   │   ├── CalendarView.tsx   # Day view for schedules
│   │   └── ScheduleForm.tsx   # Schedule a task on the calendar
│   ├── lib/
│   │   └── db.ts              # Singleton Prisma client (with better-sqlite3 adapter)
│   ├── types/
│   │   └── index.ts           # Shared TypeScript interfaces + enums
│   └── generated/
│       └── prisma/            # Auto-generated Prisma client (do not edit)
├── docs/                      # This documentation
├── CLAUDE.md                  # Claude Code instructions (must stay in root)
└── AGENTS.md                  # AI agent rules
```

## Application Architecture

### State Management

All application state lives in `src/app/page.tsx` (the root client component). There is no external state library (Redux, Zustand, etc.) — state is passed down via props and callbacks.

```
page.tsx (state owner)
  ├── boards[]          ← fetched from /api/boards (includes tasks + categories)
  ├── schedules[]       ← fetched from /api/schedules?date=...
  ├── activeTab         ← "boards" | "calendar" | "settings"
  └── modal state       ← showTaskForm, showScheduleForm, editingTask
```

### Data Flow

```
User action → handler in page.tsx → fetch() to API route → Prisma → SQLite
                                                          ↓
                                          re-fetch boards/schedules → re-render
```

There is no optimistic UI — every mutation waits for the server and then re-fetches. This is intentional for simplicity at current scale.

### Tabs

| Tab | Component | Description |
|---|---|---|
| Boards | `BoardView` | Shows active board's tasks in TODO/IN_PROGRESS/DONE columns |
| Calendar | `CalendarView` | Day-view of `TaskSchedule` entries |
| Settings | `BoardManager` | Create/edit/hide boards and categories |

### Board → Category → Task hierarchy

```
Board (e.g. "Work", "Personal")
  └── Category[] (e.g. "Project Alpha", "Learning") — per-board grouping
       └── Task[] — has status (TODO/IN_PROGRESS/DONE) and priority
            └── TaskSchedule[] — time blocks on the calendar
```

- A `Task` belongs to exactly one `Board`, optionally one `Category`.
- `TaskSchedule` is the calendar entry — separate from `Task` so a task can be scheduled multiple times (or not at all).
- Boards can be hidden (`isHidden`) — hidden boards don't show tabs but data is preserved.

## Key Design Decisions

### Prisma 7 requires an adapter
Prisma 7 dropped zero-config SQLite. The `PrismaBetterSqlite3` adapter must be passed explicitly:
```ts
// src/lib/db.ts
const adapter = new PrismaBetterSqlite3({ url: "file:./prisma/dev.db" });
const prisma = new PrismaClient({ adapter });
```

### Generated client in `src/generated/prisma/`
Prisma output is configured to `../src/generated/prisma` in `schema.prisma`. This is ESM-only and works in Next.js. It does **not** work in standalone Node scripts easily — use `jiti` for seeding.

### Seeding via API route
`/api/seed` exists because running `prisma/seed.ts` as a standalone script has ESM resolution issues with the generated client. The `db:seed` npm script uses `jiti` as a workaround, but the `/api/seed` endpoint is the reliable path.

### Tags as JSON string
`Task.tags` is stored as a JSON-serialized string (`"[]"`) in SQLite rather than a relation, for simplicity. Parse with `JSON.parse(task.tags)` on read.

### No auth
Currently single-user, no authentication. Planned for future when moving to cloud DB.

## Future Roadmap

- Streaks + atomic habits tracking (new Prisma models, new route folder, new components — do not couple to task logic)
- Mobile app (React Native)
- Cloud database (PostgreSQL via Prisma)
- Authentication
