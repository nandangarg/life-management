"use client";

import Link from "next/link";
import { TaskWithRelations, PRIORITY_COLORS, TaskPriority } from "@/types";

interface TaskCardProps {
  task: TaskWithRelations;
  onEdit: (task: TaskWithRelations) => void;
  onStatusChange: (taskId: string, status: string) => void;
  onDelete: (taskId: string) => void;
}

export default function TaskCard({ task, onEdit, onStatusChange, onDelete }: TaskCardProps) {
  const priorityColor = PRIORITY_COLORS[task.priority as TaskPriority] || "#6b7280";
  const totalActions = task.actions.length;
  const completedActions = task.actions.filter((a) => a.isCompleted).length;

  return (
    <div className="bg-white dark:bg-gray-700 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 p-3 mb-2 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/tasks/${task.id}`}
          className="text-sm font-medium text-gray-900 dark:text-gray-100 flex-1 hover:text-blue-600 dark:hover:text-blue-400"
          onClick={(e) => e.stopPropagation()}
        >
          {task.title}
        </Link>
        <span
          className="inline-block w-2 h-2 rounded-full mt-1.5 shrink-0"
          style={{ backgroundColor: priorityColor }}
          title={task.priority}
        />
      </div>

      {task.categories.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {task.categories.map((cat) => (
            <span
              key={cat.id}
              className="inline-block text-xs px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: cat.color }}
            >
              {cat.name}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
        {totalActions > 0 && (
          <span className={completedActions === totalActions ? "text-green-600 dark:text-green-400 font-medium" : ""}>
            ✓ {completedActions}/{totalActions}
          </span>
        )}
        {task.estimatedMin && <span>⏱ {task.estimatedMin}m</span>}
        {task.dueDate && <span>📅 {new Date(task.dueDate).toLocaleDateString()}</span>}
      </div>

      <div className="flex items-center gap-1 mt-2">
        {task.status !== "TODO" && (
          <button
            onClick={() => onStatusChange(task.id, task.status === "DONE" ? "IN_PROGRESS" : "TODO")}
            className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-600 dark:text-gray-300"
          >
            ←
          </button>
        )}
        {task.status !== "DONE" && (
          <button
            onClick={() => onStatusChange(task.id, task.status === "TODO" ? "IN_PROGRESS" : "DONE")}
            className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-600 dark:text-gray-300"
          >
            →
          </button>
        )}
        <button
          onClick={() => onEdit(task)}
          className="text-xs px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-500"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(task.id)}
          className="text-xs px-2 py-0.5 rounded bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-500 ml-auto"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
