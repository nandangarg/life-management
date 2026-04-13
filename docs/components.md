# Components Reference

All components are client components (`"use client"`). There are no server components besides the root layout. State is lifted to `page.tsx` — components receive data and callbacks as props.

---

## `page.tsx` — App Shell

**Location:** `src/app/page.tsx`

The root client component. Owns all application state and orchestrates data fetching and mutation.

**State:**
- `boards: Board[]` — full board tree including tasks and categories
- `schedules: ScheduleWithTask[]` — schedules for the currently viewed calendar date
- `activeTab: "boards" | "calendar" | "settings"`
- `activeBoardId: string | null`
- `calendarDate: string` — `YYYY-MM-DD`
- `showTaskForm`, `showScheduleForm` — modal visibility
- `editingTask: TaskWithRelations | null` — null = create mode, set = edit mode
- `taskFormBoardId: string` — which board the task form is for
- `loading: boolean`

**Data fetching:**
- `fetchBoards()` — called on mount and after every mutation
- `fetchSchedules()` — called when calendar tab is active or date changes

**Key behaviors:**
- Auto-selects first visible board on initial load
- Schedules are only fetched when on the calendar tab

---

## `BoardView` — Kanban Board

**Location:** `src/components/BoardView.tsx`

Renders one board as three kanban columns (TODO / IN_PROGRESS / DONE).

**Props:**
```ts
{
  board: Board;
  onAddTask: (boardId: string) => void;
  onEditTask: (task: TaskWithRelations) => void;
  onStatusChange: (taskId: string, status: string) => void;
  onDeleteTask: (taskId: string) => void;
}
```

Tasks are grouped by status client-side using `TASK_STATUSES`. Renders `TaskCard` for each task.

---

## `TaskCard` — Individual Task

**Location:** `src/components/TaskCard.tsx`

Displays a single task with priority color indicator, metadata, and action buttons.

**Props:**
```ts
{
  task: TaskWithRelations;
  onEdit: (task: TaskWithRelations) => void;
  onStatusChange: (taskId: string, status: string) => void;
  onDelete: (taskId: string) => void;
}
```

Shows: title, category badge, priority dot (colored via `PRIORITY_COLORS`), due date, estimated time, tags, schedule count.

---

## `TaskForm` — Create/Edit Task Modal

**Location:** `src/components/TaskForm.tsx`

Full-screen modal form for creating or editing a task.

**Props:**
```ts
{
  boardId: string;
  categories: Category[];
  task: TaskWithRelations | null;  // null = create, set = edit
  onSubmit: (data: Record<string, unknown>) => void;
  onClose: () => void;
}
```

Fields: title, description, category (select), status, priority, estimated minutes, due date, tags (comma-separated).

**Submit payload keys:** `boardId`, `categoryId`, `title`, `description`, `status`, `priority`, `estimatedMin`, `dueDate`, `tags` (JSON string).

---

## `BoardManager` — Settings Panel

**Location:** `src/components/BoardManager.tsx`

Shown in the Settings tab. Manages board and category CRUD in a single inline form.

**Props:**
```ts
{
  boards: Board[];
  onAddBoard: (data: { name: string; color: string }) => void;
  onEditBoard: (id: string, data: { name: string; color: string }) => void;
  onDeleteBoard: (id: string) => void;
  onToggleHidden: (id: string, isHidden: boolean) => void;
  onAddCategory: (data: { boardId: string; name: string; color: string }) => void;
  onEditCategory: (id: string, data: { name: string; color: string }) => void;
  onDeleteCategory: (id: string) => void;
}
```

Internal state tracks which form mode is active (`editingBoard`, `editingCategory`, `addCategoryForBoard`). A single `<form>` handles all four modes.

Hidden boards display with strikethrough and a "Show" button instead of "Hide".

---

## `CalendarView` — Day Schedule View

**Location:** `src/components/CalendarView.tsx`

Shows all `TaskSchedule` entries for a given day, ordered by start time.

**Props:**
```ts
{
  date: string;                    // YYYY-MM-DD
  schedules: ScheduleWithTask[];
  onDateChange: (date: string) => void;
  onAddSchedule: () => void;
  onMarkComplete: (scheduleId: string) => void;
  onDeleteSchedule: (scheduleId: string) => void;
}
```

Includes prev/next day navigation and a date picker.

---

## `ScheduleForm` — Schedule a Task Modal

**Location:** `src/components/ScheduleForm.tsx`

Modal form to create a `TaskSchedule` entry — pick a task, date, start/end times, and optional recurrence.

**Props:**
```ts
{
  tasks: TaskWithRelations[];      // all tasks across all boards (for the select dropdown)
  date: string;                    // pre-fills date field
  onSubmit: (data: Record<string, unknown>) => void;
  onClose: () => void;
}
```

**Submit payload keys:** `taskId`, `date`, `startTime`, `endTime`, `isFixed`, `isRecurring`, `recurrenceRule`, `notes`.
