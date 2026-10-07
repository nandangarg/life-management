"use client";

import { useState } from "react";
import { Category, TaskWithRelations, TASK_PRIORITIES, TaskPriority } from "@/types";
import TimePicker from "./TimePicker";

interface TaskFormProps {
  boardId: string;
  categories: Category[];
  task?: TaskWithRelations | null;
  initialDueDate?: string;
  initialStartTime?: string;
  initialEndTime?: string;
  onSubmit: (data: Record<string, unknown>) => void;
  onSubmitAndEdit?: (data: Record<string, unknown>) => void;
  onClose: () => void;
}

function parseRecurrenceRule(ruleStr: string | null) {
  const defaultRule = { frequency: "week" as const, interval: 1, weekdays: [] as string[], until: "" };
  if (!ruleStr) return defaultRule;
  try {
    if (ruleStr.startsWith("{")) {
      const parsed = JSON.parse(ruleStr);
      return {
        frequency: parsed.frequency || "week",
        interval: parsed.interval || 1,
        weekdays: parsed.weekdays || [],
        until: parsed.until || "",
      };
    } else {
      if (ruleStr === "DAILY") {
        return { frequency: "day" as const, interval: 1, weekdays: [], until: "" };
      } else if (ruleStr.startsWith("WEEKLY:")) {
        const day = ruleStr.split(":")[1];
        return { frequency: "week" as const, interval: 1, weekdays: [day], until: "" };
      }
    }
  } catch (err) {
    console.error("Failed to parse recurrence rule:", err);
  }
  return defaultRule;
}

export default function TaskForm({
  boardId,
  categories,
  task,
  initialDueDate,
  initialStartTime,
  initialEndTime,
  onSubmit,
  onSubmitAndEdit,
  onClose,
}: TaskFormProps) {
  const [prevTaskId, setPrevTaskId] = useState<string | null>(task?.id || null);

  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [categoryIds, setCategoryIds] = useState<string[]>(task?.categories.map((c) => c.id) || []);
  const [priority, setPriority] = useState<TaskPriority>((task?.priority as TaskPriority) || "MEDIUM");
  const [estimatedMin, setEstimatedMin] = useState(task?.estimatedMin?.toString() || "");
  const [dueDate, setDueDate] = useState(
    task?.dueDate ? task.dueDate.split("T")[0] : initialDueDate || ""
  );
  const [startTime, setStartTime] = useState(task?.startTime || initialStartTime || "");
  const [endTime, setEndTime] = useState(task?.endTime || initialEndTime || "");
  const [isFixed, setIsFixed] = useState(task?.isFixed || false);
  const [isRecurring, setIsRecurring] = useState(task?.isRecurring || false);
  const [isHabit, setIsHabit] = useState(task?.isHabit || false);
  const [habitUnit, setHabitUnit] = useState(task?.habitUnit || "");

  // Advanced Recurrence state
  const initialRule = parseRecurrenceRule(task?.recurrenceRule || null);
  const [freq, setFreq] = useState<"day" | "week" | "month" | "year">(initialRule.frequency);
  const [interval, setIntervalVal] = useState(initialRule.interval);
  const [weekdays, setWeekdays] = useState<string[]>(initialRule.weekdays);
  const [until, setUntil] = useState(initialRule.until ? initialRule.until.split("T")[0] : "");

  const DAYS = [
    { label: "M", value: "MON" },
    { label: "T", value: "TUE" },
    { label: "W", value: "WED" },
    { label: "T", value: "THU" },
    { label: "F", value: "FRI" },
    { label: "S", value: "SAT" },
    { label: "S", value: "SUN" },
  ];

  const currentTaskId = task?.id ?? null;
  if (currentTaskId !== prevTaskId) {
    setPrevTaskId(currentTaskId);
    setTitle(task?.title || "");
    setDescription(task?.description || "");
    setCategoryIds(task?.categories.map((c) => c.id) || []);
    setPriority((task?.priority as TaskPriority) || "MEDIUM");
    setEstimatedMin(task?.estimatedMin?.toString() || "");
    setDueDate(task?.dueDate ? task.dueDate.split("T")[0] : "");
    setStartTime(task?.startTime || "");
    setEndTime(task?.endTime || "");
    setIsFixed(task?.isFixed || false);
    setIsRecurring(task?.isRecurring || false);
    setIsHabit(task?.isHabit || false);
    setHabitUnit(task?.habitUnit || "");

    const parsed = parseRecurrenceRule(task?.recurrenceRule || null);
    setFreq(parsed.frequency);
    setIntervalVal(parsed.interval);
    setWeekdays(parsed.weekdays);
    setUntil(parsed.until ? parsed.until.split("T")[0] : "");
  }

  function toggleCategory(id: string) {
    setCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  function toggleWeekday(val: string) {
    setWeekdays((prev) =>
      prev.includes(val) ? prev.filter((d) => d !== val) : [...prev, val]
    );
  }

  function buildData() {
    const recurrenceRuleStr = isRecurring
      ? JSON.stringify({
          frequency: freq,
          interval,
          weekdays: freq === "week" ? weekdays : undefined,
          until: until || null,
        })
      : null;

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
      isFixed,
      isRecurring,
      recurrenceRule: recurrenceRuleStr,
      isHabit,
      habitUnit: isHabit && habitUnit.trim() ? habitUnit.trim() : null,
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
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-xl md:max-w-2xl max-h-[90vh] flex flex-col mx-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{task ? "Edit Task" : "New Task"}</h3>
        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-1 flex-1 pb-20">
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
              <TimePicker
                value={startTime}
                onChange={(val) => setStartTime(val)}
                className={inputCls}
                align="left"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Default End Time</label>
              <TimePicker
                value={endTime}
                onChange={(val) => setEndTime(val)}
                className={inputCls}
                align="right"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 py-1">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isFixed}
                onChange={(e) => setIsFixed(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 w-4 h-4"
              />
              Is Task Fixed Time (Immovable)
            </label>

            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 w-4 h-4"
              />
              Is Recurring Routine
            </label>

            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isHabit}
                onChange={(e) => setIsHabit(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 w-4 h-4"
              />
              Track as Habit
            </label>
          </div>

          {isHabit && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Habit Unit (e.g. rounds, pages, beads)</label>
              <input
                type="text"
                value={habitUnit}
                onChange={(e) => setHabitUnit(e.target.value)}
                placeholder="rounds"
                className={inputCls}
              />
            </div>
          )}

          {isRecurring && (
            <div className="space-y-3 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <span>Repeat every</span>
                <select
                  value={interval}
                  onChange={(e) => setIntervalVal(parseInt(e.target.value))}
                  className="border border-gray-300 dark:border-gray-600 rounded px-1.5 py-0.5 bg-white dark:bg-gray-700 text-gray-950 dark:text-gray-50 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {Array.from({ length: 30 }, (_, i) => i + 1).map((val) => (
                    <option key={val} value={val}>{val}</option>
                  ))}
                </select>
                <select
                  value={freq}
                  onChange={(e) => setFreq(e.target.value as "day" | "week" | "month" | "year")}
                  className="border border-gray-300 dark:border-gray-600 rounded px-1.5 py-0.5 bg-white dark:bg-gray-700 text-gray-950 dark:text-gray-50 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="day">day{interval > 1 && "s"}</option>
                  <option value="week">week{interval > 1 && "s"}</option>
                  <option value="month">month{interval > 1 && "s"}</option>
                  <option value="year">year{interval > 1 && "s"}</option>
                </select>
              </div>

              {freq === "week" && (
                <div>
                  <span className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Repeat on</span>
                  <div className="flex gap-1.5">
                    {DAYS.map((d) => {
                      const active = weekdays.includes(d.value);
                      return (
                        <button
                          key={d.value}
                          type="button"
                          onClick={() => toggleWeekday(d.value)}
                          className={`w-7 h-7 rounded-full text-xs font-bold transition-all border ${
                            active
                              ? "bg-blue-600 text-white border-transparent"
                              : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                          }`}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Until</label>
                <input
                  type="date"
                  value={until}
                  onChange={(e) => setUntil(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
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
