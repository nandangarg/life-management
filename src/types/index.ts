export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export const TASK_STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "DONE"];
export const TASK_PRIORITIES: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  DONE: "Done",
};

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  LOW: "#6b7280",
  MEDIUM: "#3b82f6",
  HIGH: "#f59e0b",
  URGENT: "#ef4444",
};

export interface Board {
  id: string;
  name: string;
  color: string;
  position: number;
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
  categoryId: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  estimatedMin: number | null;
  dueDate: string | null;
  position: number;
  tags: string;
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
}

export interface TaskWithRelations extends Task {
  category: Category | null;
  schedules: TaskSchedule[];
}

export interface ScheduleWithTask extends TaskSchedule {
  task: TaskWithRelations;
}
