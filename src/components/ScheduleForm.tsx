"use client";

import { useState } from "react";
import { TaskWithRelations } from "@/types";
import TimePicker from "./TimePicker";

interface ScheduleFormProps {
  tasks: TaskWithRelations[];
  date: string;
  onSubmit: (data: Record<string, unknown>) => void;
  onClose: () => void;
}

export default function ScheduleForm({ tasks, date, onSubmit, onClose }: ScheduleFormProps) {
  const [taskId, setTaskId] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [isFixed, setIsFixed] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskId) return;

    onSubmit({
      taskId,
      date,
      startTime,
      endTime,
      isFixed,
      isRecurring,
      recurrenceRule: isRecurring ? recurrenceRule : null,
    });
  };

  const inputCls = "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Schedule Task for {date}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Task *</label>
            <select
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              className={inputCls}
            >
              <option value="">Select a task</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Time</label>
              <TimePicker
                value={startTime}
                onChange={(val) => setStartTime(val)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Time</label>
              <TimePicker
                value={endTime}
                onChange={(val) => setEndTime(val)}
                className={inputCls}
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={isFixed}
                onChange={(e) => setIsFixed(e.target.checked)}
                className="rounded"
              />
              Fixed time (immovable)
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="rounded"
              />
              Recurring
            </label>
          </div>

          {isRecurring && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Recurrence Rule</label>
              <select
                value={recurrenceRule}
                onChange={(e) => setRecurrenceRule(e.target.value)}
                className={inputCls}
              >
                <option value="">Select pattern</option>
                <option value="DAILY">Daily</option>
                <option value="WEEKLY:MON">Weekly - Monday</option>
                <option value="WEEKLY:TUE">Weekly - Tuesday</option>
                <option value="WEEKLY:WED">Weekly - Wednesday</option>
                <option value="WEEKLY:THU">Weekly - Thursday</option>
                <option value="WEEKLY:FRI">Weekly - Friday</option>
                <option value="WEEKLY:SAT">Weekly - Saturday</option>
                <option value="WEEKLY:SUN">Weekly - Sunday</option>
              </select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Schedule
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
