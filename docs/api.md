# API Reference

All routes are Next.js Route Handlers under `src/app/api/`. They use `prisma` from `src/lib/db.ts` and return JSON.

> **Route Handler pattern (Next.js 16):** Dynamic params are async — always `await params` before accessing params inside route handlers.
> ```ts
> export async function PATCH(req, { params }: { params: Promise<{ id: string }> }) {
>   const { id } = await params;
> ```

---

## Boards

### `GET /api/boards`
Returns all boards ordered by `position`, with nested categories (ordered by `position`) and tasks (ordered by `position`), each task including its `categories`, `schedules`, `actions`, and `comments`.

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
Deletes category. This cascades and deletes all `TaskCategory` mappings. Tasks themselves remain but without this category (many-to-many link broken).

**Response:** `{ "success": true }`

---

## Tasks

### `GET /api/tasks`
Returns all tasks including their categories, schedules, and actions, ordered by `createdAt` descending.

**Response:** `TaskWithRelations[]`

### `POST /api/tasks`
Create a task. Position is auto-assigned within the board+status scope.

**Body:**
```json
{
  "boardId": "...",
  "categoryIds": ["..."],       // optional array of category UUIDs
  "title": "Fix login bug",
  "description": "...",         // optional
  "status": "TODO",             // TODO | IN_PROGRESS | DONE (default: TODO)
  "priority": "HIGH",           // LOW | MEDIUM | HIGH | URGENT (default: MEDIUM)
  "estimatedMin": 30,           // optional
  "dueDate": "2026-04-15",      // optional ISO date string
  "tags": "[\"bug\",\"auth\"]",  // JSON string (default: "[]")
  "startTime": "09:00",         // optional default start time
  "endTime": "10:00",           // optional default end time
  "isFixed": false,             // optional
  "isRecurring": false,         // optional
  "recurrenceRule": null,       // optional JSON or "DAILY", "WEEKLY:MON"
  "isHabit": false,             // optional
  "habitUnit": null             // optional (e.g. "liters", "pages")
}
```
**Response:** `201 TaskWithRelations`

### `GET /api/tasks/[id]`
Returns details of a specific task, including comments, actions, schedules, and board metadata.

**Response:** `TaskDetail`

### `PATCH /api/tasks/[id]`
Partial update — only fields present in body are updated. Handles `dueDate` conversion to `Date` and many-to-many category mapping replacements.

**Updatable fields:** `title`, `description`, `status`, `priority`, `estimatedMin`, `dueDate`, `position`, `boardId`, `tags`, `startTime`, `endTime`, `isFixed`, `isRecurring`, `recurrenceRule`, `isHabit`, `habitUnit`, `categoryIds` (array of category UUIDs)

**Response:** `TaskWithRelations`

### `DELETE /api/tasks/[id]`
Deletes task and cascades to its `TaskSchedule`, `TaskComment`, `TaskAction`, and `TaskCategory` mappings.

**Response:** `{ "success": true }`

---

## Task Comments

### `POST /api/tasks/[id]/comments`
Create a comment under a task.

**Body:**
```json
{ "text": "This is a comment" }
```
**Response:** `201 TaskComment`

### `PATCH /api/tasks/[id]/comments/[commentId]`
Update comment text.

**Body:**
```json
{ "text": "Updated comment text" }
```
**Response:** `TaskComment`

### `DELETE /api/tasks/[id]/comments/[commentId]`
Delete a comment.

**Response:** `{ "success": true }`

---

## Task Actions (Checklist Items)

### `POST /api/tasks/[id]/actions`
Create a checklist action under a task. Position is auto-assigned within the task scope.

**Body:**
```json
{ "text": "Deploy to staging" }
```
**Response:** `201 TaskAction`

### `PATCH /api/tasks/[id]/actions/[actionId]`
Update checklist action text, position, or completion status. Completing an action (`isCompleted: true`) automatically triggers a system comment logging completion.

**Body examples:**
```json
{ "text": "New Action Text" }
{ "isCompleted": true }
```
**Response:** `TaskAction`

### `DELETE /api/tasks/[id]/actions/[actionId]`
Delete an action checklist item.

**Response:** `{ "success": true }`

---

## Schedules

### `GET /api/schedules`
Returns all schedules, or filtered by date. Includes nested `task` (with `categories`, `schedules`, `actions`). Ordered by `startTime` ascending.
If `date` is provided, virtual schedules are projected for active recurring tasks matching the recurrence rule on that date.

**Query params:**
- `date` (optional) — `YYYY-MM-DD` string to filter by day

**Response:** `ScheduleWithTask[]`

### `POST /api/schedules`
Create a schedule entry (time-block a task on the calendar).

**Body:**
```json
{
  "taskId": "...",
  "date": "2026-04-01",         // YYYY-MM-DD
  "startTime": "09:00",         // HH:mm
  "endTime": "10:30",           // HH:mm
  "isFixed": false,             // lock to time slot
  "isRecurring": false,
  "recurrenceRule": null,       // e.g. "WEEKLY:MON", "DAILY"
  "notes": null,
  "completedAt": null,          // optional ISO datetime string
  "actualStartTime": null,      // optional HH:mm string
  "actualEndTime": null,        // optional HH:mm string
  "actualMin": null,            // optional duration in minutes
  "metricValue": null           // optional float for habits (e.g. 2.5)
}
```
**Response:** `201 ScheduleWithTask`

### `PATCH /api/schedules/[id]`
Update schedule fields.

**Response:** `TaskSchedule`

### `DELETE /api/schedules/[id]`
Delete a schedule entry.

**Response:** `{ "success": true }`

---

## Seed

### `POST /api/seed`
Resets all database tables and loads sample boards, categories, tasks, and schedules. Used for development and demo purposes.

**Response:** `{ "success": true }`
