"use client";

import { Board, TaskWithRelations, TASK_STATUSES, STATUS_LABELS, TaskStatus } from "@/types";
import TaskCard from "./TaskCard";

interface BoardViewProps {
  board: Board;
  onAddTask: () => void;
  onEditTask: (task: TaskWithRelations) => void;
  onStatusChange: (taskId: string, status: string) => void;
  onDeleteTask: (taskId: string) => void;
}

export default function BoardView({ board, onAddTask, onEditTask, onStatusChange, onDeleteTask }: BoardViewProps) {
  const tasksByStatus = TASK_STATUSES.reduce(
    (acc, status) => {
      acc[status] = board.tasks.filter((t) => t.status === status);
      return acc;
    },
    {} as Record<TaskStatus, TaskWithRelations[]>
  );

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: board.color }} />
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{board.name}</h2>
        <span className="text-sm text-gray-500 dark:text-gray-400">({board.tasks.length} tasks)</span>
        <button
          onClick={() => onAddTask()}
          className="ml-auto text-sm px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Add Task
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {TASK_STATUSES.map((status) => (
          <div key={status} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 min-h-[120px]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                {STATUS_LABELS[status]}
              </h3>
              <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-200 dark:bg-gray-700 rounded-full px-2 py-0.5">
                {tasksByStatus[status].length}
              </span>
            </div>
            {tasksByStatus[status].map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onEdit={onEditTask}
                onStatusChange={onStatusChange}
                onDelete={onDeleteTask}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
