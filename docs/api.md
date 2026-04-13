# API Reference

All routes are Next.js Route Handlers under `src/app/api/`. They use `prisma` from `src/lib/db.ts` and return JSON.

> **Route Handler pattern (Next.js 16):** Dynamic params are async — always `await params` before accessing `id`.
> ```ts
> export async function PATCH(req, { params }: { params: Promise<{ id: string }> }) {
>   const { id } = await params;
> ```

---

## Boards

### `GET /api/boards`
Returns all boards ordered by `position`, with nested categories (ordered by `position`) and tasks (ordered by `position`), each task including its `category` and `schedules`.

**Response:** `Board[]` (see [data-model.md](data-model.md))

### `POST /api/boards`
Create a board. Position is auto-assigned as `max(position) + 1`.

**Body:**
```json
{ "name": "Work", "color": "#6366f1" }
```
**Response:** `201 Board`

### `PATCH /api/boards/[id]`
Update any board fields. Accepts any subset of board columns (passed directly to Prisma `update`).

**Body examples:**
```json
{ "name": "New Name", "color": "#ef4444" }
{ "isHidden": true }
```
**Response:** `Board`

### `DELETE /api/boards/[id]`
Deletes board and cascades to all its categories and tasks.

**Response:** `{ "success": true }`

---

## Categories

### `POST /api/categories`
Create a category under a board. Position auto-assigned per board.

**Body:**
```json
{ "boardId": "...", "name": "Project Alpha", "color": "#8b5cf6" }
```
**Response:** `201 Category`

### `PATCH /api/categories/[id]`
Update category fields.

**Body:**
```json
{ "name": "New Name", "color": "#f59e0b" }
```
**Response:** `Category`

### `DELETE /api/categories/[id]`
Deletes category. Tasks with this `categoryId` get `categoryId` set to `null` (SetNull cascade).

**Response:** `{ "success": true }`

---

## Tasks

### `POST /api/tasks`
Create a task. Position is auto-assigned within the board+status scope.

**Body:**
```json
{
  "boardId": "...",
  "categoryId": "...",        // optional
  "title": "Fix login bug",
  "description": "...",       // optional
  "status": "TODO",           // TODO | IN_PROGRESS | DONE (default: TODO)
  "priority": "HIGH",         // LOW | MEDIUM | HIGH | URGENT (default: MEDIUM)
  "estimatedMin": 30,         // optional
  "dueDate": "2026-04-15",    // optional ISO date string
  "tags": "[\"bug\",\"auth\"]" // JSON string (default: "[]")
}
```
**Response:** `201 TaskWithRelations`

### `PATCH /api/tasks/[id]`
Partial update — only fields present in body are updated. Handles `dueDate` conversion to `Date` and `categoryId` null-coercion.

**Updatable fields:** `title`, `description`, `status`, `priority`, `estimatedMin`, `dueDate`, `position`, `categoryId`, `boardId`, `tags`

**Response:** `TaskWithRelations`

### `DELETE /api/tasks/[id]`
Deletes task and cascades to its `TaskSchedule` entries.

**Response:** `{ "success": true }`

---

## Schedules

### `GET /api/schedules`
Returns all schedules, or filtered by date. Includes nested `task` (with `category` and `schedules`). Ordered by `startTime` ascending.

**Query params:**
- `date` (optional) — `YYYY-MM-DD` string to filter by day

**Response:** `ScheduleWithTask[]`

### `POST /api/schedules`
Create a schedule entry (time-block a task on the calendar).

**Body:**
```json
{
  "taskId": "...",
  "date": "2026-04-01",       // YYYY-MM-DD
  "startTime": "09:00",       // HH:mm
  "endTime": "10:30",         // HH:mm
  "isFixed": false,           // lock to time slot
  "isRecurring": false,
  "recurrenceRule": null,     // e.g. "WEEKLY:MON", "DAILY"
  "notes": null
}
```
**Response:** `201 ScheduleWithTask`

### `PATCH /api/schedules/[id]`
Update schedule fields (body passed directly to Prisma). Used primarily to set `completedAt`.

**Body example:**
```json
{ "completedAt": "2026-04-01T10:30:00.000Z" }
```
**Response:** `TaskSchedule`

### `DELETE /api/schedules/[id]`
Delete a schedule entry.

**Response:** `{ "success": true }`

---

## Seed

### `POST /api/seed`
Resets all data and loads sample boards, categories, tasks, and schedules. Used for development/demo only.

**Response:** `{ "success": true }`

> This endpoint exists because running `prisma/seed.ts` as a standalone script has ESM resolution issues with the generated Prisma client. See [development.md](development.md).
