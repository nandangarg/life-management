"use client";

import { useState, useEffect } from "react";
import { Category, TaskWithRelations, TASK_PRIORITIES, TaskPriority } from "@/types";

interface TaskFormProps {
  boardId: string;
  categories: Category[];
  task?: TaskWithRelations | null;
  onSubmit: (data: Record<string, unknown>) => void;
  onSubmitAndEdit?: (data: Record<string, unknown>) => void;
  onClose: () => void;
}

export default function TaskForm({ boardId, categories, task, onSubmit, onSubmitAndEdit, onClose }: TaskFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [estimatedMin, setEstimatedMin] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState("");

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || "");
      setCategoryIds(task.categories.map((c) => c.id));
      setPriority(task.priority as TaskPriority);
      setEstimatedMin(task.estimatedMin?.toString() || "");
      setDueDate(task.dueDate ? task.dueDate.split("T")[0] : "");
      setStartTime(task.startTime || "");
      setEndTime(task.endTime || "");
      setIsRecurring(task.isRecurring || false);
      setRecurrenceRule(task.recurrenceRule || "");
    }
  }, [task]);

  function toggleCategory(id: string) {
    setCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  function buildData() {
    return {
      boardId,
      categoryIds,
      title: title.trim(),
      description: description.trim() || null,
      priority,
      estimatedMin: estimatedMin ? parseInt(estimatedMin) : null,
      dueDate: dueDate || null,
      startTime: startTime || null,
      endTime: endTime || null,
      isRecurring,
      recurrenceRule: isRecurring && recurrenceRule ? recurrenceRule : null,
    };
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit(buildData());
  };

  const inputCls = "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{task ? "Edit Task" : "New Task"}</h3>
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputCls}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className={inputCls}
            />
          </div>

          {categories.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Categories</label>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => {
                  const checked = categoryIds.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleCategory(cat.id)}
                      className={`text-xs px-3 py-1 rounded-full border-2 transition-all ${
                        checked ? "text-white border-transparent" : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300"
                      }`}
                      style={checked ? { backgroundColor: cat.color, borderColor: cat.color } : undefined}
                    >
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className={inputCls}
              >
                {TASK_PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Estimated (min)</label>
              <input
                type="number"
                value={estimatedMin}
                onChange={(e) => setEstimatedMin(e.target.value)}
                className={inputCls}
                min="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Default Start Time</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Default End Time</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 py-1">
            <input
              type="checkbox"
              id="isRecurring"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 w-4 h-4"
            />
            <label htmlFor="isRecurring" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer select-none">
              Is Recurring Routine
            </label>
          </div>

          {isRecurring && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Recurrence Pattern</label>
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

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              Cancel
            </button>
            {!task && onSubmitAndEdit && (
              <button
                type="button"
                onClick={() => { if (title.trim()) onSubmitAndEdit(buildData()); }}
                className="px-4 py-2 text-sm border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30"
              >
                Save & Edit
              </button>
            )}
            <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              {task ? "Update" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
