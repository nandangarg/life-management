export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

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

export interface TimeLog {
  id: string;
  userId: string | null;
  taskId: string | null;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMin: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TimeLogWithTask extends TimeLog {
  task: (Task & { board: { id: string; name: string; color: string } }) | null;
}
