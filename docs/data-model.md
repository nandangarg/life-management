# Data Model

## Prisma Schema (`prisma/schema.prisma`)

```prisma
model Board {
  id        String     @id @default(uuid())
  name      String
  color     String     @default("#6366f1")
  position  Int        @default(0)
  isHidden  Boolean    @default(false)
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt

  categories Category[]
  tasks      Task[]
}

model Category {
  id        String   @id @default(uuid())
  boardId   String
  name      String
  color     String   @default("#8b5cf6")
  position  Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  board Board          @relation(fields: [boardId], references: [id], onDelete: Cascade)
  tasks TaskCategory[]
}

model Task {
  id           String    @id @default(uuid())
  boardId      String
  title        String
  description  String?
  status       String    @default("TODO") // TODO | IN_PROGRESS | DONE
  priority     String    @default("MEDIUM") // LOW | MEDIUM | HIGH | URGENT
  estimatedMin Int?
  dueDate      DateTime?
  position     Int       @default(0)
  tags         String    @default("[]") // JSON array stored as string
  startTime    String?
  endTime      String?
  isFixed      Boolean   @default(false)
  isRecurring  Boolean   @default(false)
  recurrenceRule String?   // e.g. "DAILY", "WEEKLY:MON", etc.
  isHabit      Boolean   @default(false)
  habitUnit    String?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  board      Board          @relation(fields: [boardId], references: [id], onDelete: Cascade)
  categories TaskCategory[]
  schedules  TaskSchedule[]
  comments   TaskComment[]
  actions    TaskAction[]
}

model TaskCategory {
  taskId     String
  categoryId String

  task     Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
  category Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)

  @@id([taskId, categoryId])
}

model TaskSchedule {
  id              String    @id @default(uuid())
  taskId          String
  date            String    // YYYY-MM-DD
  startTime       String    // HH:mm
  endTime         String    // HH:mm
  isFixed         Boolean   @default(false)
  isRecurring     Boolean   @default(false)
  recurrenceRule  String?   // e.g. "WEEKLY:SUN", "DAILY"
  completedAt     DateTime?
  notes           String?
  isCancelled     Boolean   @default(false)
  actualStartTime String?
  actualEndTime   String?
  actualMin       Int?
  metricValue     Float?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  task Task @relation(fields: [taskId], references: [id], onDelete: Cascade)
}

model TaskComment {
  id        String   @id @default(uuid())
  taskId    String
  text      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  task Task @relation(fields: [taskId], references: [id], onDelete: Cascade)
}

model TaskAction {
  id          String    @id @default(uuid())
  taskId      String
  text        String
  isCompleted Boolean   @default(false)
  completedAt DateTime?
  position    Int       @default(0)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  task Task @relation(fields: [taskId], references: [id], onDelete: Cascade)
}
```

## Cascade Rules

| Deleted model | Effect on related records |
|---|---|
| Board | Deletes all its Categories and Tasks (Cascade) |
| Category | Deletes TaskCategory joins (Cascade). Tasks are NOT deleted. |
| Task | Deletes TaskCategory joins, TaskSchedules, TaskComments, and TaskActions (Cascade) |

## TypeScript Types (`src/types/index.ts`)

These are the shapes returned from API routes — they match the Prisma models but with dates serialized to strings.

```ts
export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface Board {
  id: string;
  name: string;
  color: string;
  position: number;
  isHidden: boolean;
  categories: Category[];
  tasks: TaskWithRelations[];
}

export interface Category {
  id: string;
  boardId: string;
  name: string;
  color: string;
  position: number;
}

export interface Task {
  id: string;
  boardId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  estimatedMin: number | null;
  dueDate: string | null;
  position: number;
  tags: string;
  startTime: string | null;
  endTime: string | null;
  isFixed: boolean;
  isRecurring: boolean;
  recurrenceRule: string | null;
  isHabit: boolean;
  habitUnit: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskSchedule {
  id: string;
  taskId: string;
  date: string;
  startTime: string;
  endTime: string;
  isFixed: boolean;
  isRecurring: boolean;
  recurrenceRule: string | null;
  completedAt: string | null;
  notes: string | null;
  isCancelled: boolean;
  actualStartTime: string | null;
  actualEndTime: string | null;
  actualMin: number | null;
  metricValue: number | null;
}

export interface TaskComment {
  id: string;
  taskId: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskAction {
  id: string;
  taskId: string;
  text: string;
  isCompleted: boolean;
  completedAt: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskWithRelations extends Task {
  categories: Category[];
  schedules: TaskSchedule[];
  actions: TaskAction[];
}

export interface TaskDetail extends TaskWithRelations {
  comments: TaskComment[];
  board: {
    id: string;
    name: string;
    color: string;
    categories: Category[];
  };
}

export interface ScheduleWithTask extends TaskSchedule {
  task: TaskWithRelations;
}
```

## Enums and Constants

```ts
export const TASK_STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "DONE"];
export const TASK_PRIORITIES: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: "To Start",
  IN_PROGRESS: "In Progress",
  DONE: "Done",
};

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  LOW: "#6b7280",
  MEDIUM: "#3b82f6",
  HIGH: "#f59e0b",
  URGENT: "#ef4444",
};
```

## Notable Quirks

- **`tags` is a JSON string**, not a relation or array column. Always `JSON.parse(task.tags)` to read, `JSON.stringify(arr)` to write.
- **`date`, `startTime`, `endTime` on TaskSchedule are plain strings** (`YYYY-MM-DD`, `HH:mm`), not `DateTime`. This avoids timezone conversion issues.
- **`status` and `priority` are plain strings**, not SQLite enums. TypeScript types enforce valid values client-side; the DB doesn't enforce constraints.
- **`position` is manually managed** — new records get `max(position) + 1` via aggregate query. There's no drag-and-drop reorder yet.
