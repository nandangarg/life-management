"use client";

import { TaskWithRelations, PRIORITY_COLORS, TaskPriority } from "@/types";

interface TaskCardProps {
  task: TaskWithRelations;
  onEdit: (task: TaskWithRelations) => void;
  onStatusChange: (taskId: string, status: string) => void;
  onDelete: (taskId: string) => void;
}

export default function TaskCard({ task, onEdit, onStatusChange, onDelete }: TaskCardProps) {
  const priorityColor = PRIORITY_COLORS[task.priority as TaskPriority] || "#6b7280";

  return (
    <div
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 mb-2 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onEdit(task)}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium text-gray-900 flex-1">{task.title}</h4>
        <span
          className="inline-block w-2 h-2 rounded-full mt-1.5 shrink-0"
          style={{ backgroundColor: priorityColor }}
          title={task.priority}
        />
      </div>

      {task.category && (
        <span
          className="inline-block text-xs px-2 py-0.5 rounded-full mt-1.5 text-white"
          style={{ backgroundColor: task.category.color }}
        >
          {task.category.name}
        </span>
      )}

      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
        {task.estimatedMin && (
          <span>⏱ {task.estimatedMin}m</span>
        )}
        {task.dueDate && (
          <span>📅 {new Date(task.dueDate).toLocaleDateString()}</span>
        )}
      </div>

      <div className="flex items-center gap-1 mt-2" onClick={(e) => e.stopPropagation()}>
        {task.status !== "TODO" && (
          <button
            onClick={() => onStatusChange(task.id, task.status === "DONE" ? "IN_PROGRESS" : "TODO")}
            className="text-xs px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-600"
          >
            ←
          </button>
        )}
        {task.status !== "DONE" && (
          <button
            onClick={() => onStatusChange(task.id, task.status === "TODO" ? "IN_PROGRESS" : "DONE")}
            className="text-xs px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-600"
          >
            →
          </button>
        )}
        <button
          onClick={() => onDelete(task.id)}
          className="text-xs px-2 py-0.5 rounded bg-red-50 hover:bg-red-100 text-red-500 ml-auto"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
