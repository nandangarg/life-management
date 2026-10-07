"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Board, TaskWithRelations, PRIORITY_COLORS, TaskPriority } from "@/types";
import TimePicker from "./TimePicker";

interface ScheduleFormProps {
  tasks: TaskWithRelations[];
  boards?: Board[];
  defaultBoardId?: string;
  date: string;
  initialStartTime?: string;
  initialEndTime?: string;
  onSubmit: (data: Record<string, unknown>) => void;
  onOpenTaskForm?: (startTime: string, endTime: string) => void;
  onTaskCreated?: () => void;
  onClose: () => void;
}

export default function ScheduleForm({
  tasks,
  boards = [],
  defaultBoardId = "",
  date,
  initialStartTime = "09:00",
  initialEndTime = "09:30",
  onSubmit,
  onOpenTaskForm,
  onTaskCreated,
  onClose,
}: ScheduleFormProps) {
  const [taskList, setTaskList] = useState<TaskWithRelations[]>(tasks);
  const [taskId, setTaskId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const [selectedBoardId, setSelectedBoardId] = useState(
    defaultBoardId || boards[0]?.id || ""
  );
  const [isQuickCreating, setIsQuickCreating] = useState(false);

  const [startTime, setStartTime] = useState(initialStartTime);
  const [endTime, setEndTime] = useState(initialEndTime);
  const [isFixed, setIsFixed] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState("");

  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync tasks when prop changes
  useEffect(() => {
    setTaskList(tasks);
  }, [tasks]);

  // Lookup board info
  const boardMap = useMemo(() => {
    return new Map(boards.map((b) => [b.id, b]));
  }, [boards]);

  // Selected task
  const selectedTask = useMemo(() => {
    return taskList.find((t) => t.id === taskId);
  }, [taskList, taskId]);

  // Filtered task results
  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return taskList;
    const q = searchQuery.toLowerCase().trim();
    return taskList.filter((t) => {
      const bName = boardMap.get(t.boardId)?.name || "";
      return (
        t.title.toLowerCase().includes(q) ||
        bName.toLowerCase().includes(q) ||
        t.categories.some((c) => c.name.toLowerCase().includes(q))
      );
    });
  }, [taskList, searchQuery, boardMap]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Quick create task inline
  const handleQuickCreateTask = async (taskTitle: string) => {
    if (!taskTitle.trim() || !selectedBoardId || isQuickCreating) return;
    setIsQuickCreating(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: taskTitle.trim(),
          boardId: selectedBoardId,
        }),
      });
      if (res.ok) {
        const newTask: TaskWithRelations = await res.json();
        setTaskList((prev) => [newTask, ...prev]);
        setTaskId(newTask.id);
        setSearchQuery("");
        setIsDropdownOpen(false);
        if (onTaskCreated) onTaskCreated();
      }
    } catch (err) {
      console.error("Failed to quick create task:", err);
    } finally {
      setIsQuickCreating(false);
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isDropdownOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setIsDropdownOpen(true);
      }
      return;
    }

    const totalOptions = filteredTasks.length + (searchQuery.trim() ? 1 : 0);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % Math.max(1, totalOptions));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + totalOptions) % Math.max(1, totalOptions));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredTasks.length > 0 && highlightedIndex < filteredTasks.length) {
        const item = filteredTasks[highlightedIndex];
        setTaskId(item.id);
        setIsDropdownOpen(false);
        setSearchQuery("");
      } else if (searchQuery.trim()) {
        handleQuickCreateTask(searchQuery);
      }
    } else if (e.key === "Escape") {
      setIsDropdownOpen(false);
    }
  };

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

  const inputCls =
    "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-lg border border-gray-100 dark:border-gray-700 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <span>📅</span> Schedule Task for {date}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ── Searchable Task Combobox ─────────────────────────────────── */}
          <div className="relative" ref={dropdownRef}>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Task *
              </label>
              {onOpenTaskForm && (
                <button
                  type="button"
                  onClick={() => onOpenTaskForm(startTime, endTime)}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
                >
                  <span>+</span> Full Task Form
                </button>
              )}
            </div>

            {/* Selected Task Pill or Search Input */}
            {selectedTask ? (
              <div className="flex items-center justify-between border border-blue-300 dark:border-blue-600 bg-blue-50/50 dark:bg-blue-900/20 rounded-xl px-3.5 py-2.5">
                <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{
                      backgroundColor:
                        boardMap.get(selectedTask.boardId)?.color || "#6366f1",
                    }}
                  />
                  <span className="font-bold text-sm text-gray-900 dark:text-gray-100 truncate">
                    {selectedTask.title}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
                    ({boardMap.get(selectedTask.boardId)?.name || "Task"})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTaskId("");
                    setSearchQuery("");
                    setTimeout(() => searchInputRef.current?.focus(), 50);
                  }}
                  className="text-gray-400 hover:text-red-500 text-xs px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ml-2"
                >
                  Change ✕
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsDropdownOpen(true);
                    setHighlightedIndex(0);
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type to search or create a task..."
                  className={inputCls}
                />
                <span className="absolute right-3 top-2.5 text-gray-400 text-xs pointer-events-none">
                  🔍
                </span>
              </div>
            )}

            {/* Dropdown Menu */}
            {!taskId && isDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 max-h-64 overflow-y-auto z-50 divide-y divide-gray-100 dark:divide-gray-700/60">
                {/* Matching Tasks */}
                {filteredTasks.length > 0 ? (
                  <div className="py-1">
                    {filteredTasks.map((t, idx) => {
                      const b = boardMap.get(t.boardId);
                      const isHighlighted = idx === highlightedIndex;
                      return (
                        <div
                          key={t.id}
                          onClick={() => {
                            setTaskId(t.id);
                            setIsDropdownOpen(false);
                            setSearchQuery("");
                          }}
                          className={`px-3.5 py-2 flex items-center justify-between text-sm cursor-pointer transition-colors ${
                            isHighlighted
                              ? "bg-blue-50 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100"
                              : "hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200"
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: b?.color || "#6366f1" }}
                            />
                            <span className="font-medium truncate">{t.title}</span>
                          </div>
                          <div className="flex items-center gap-1.5 ml-2 shrink-0">
                            {b && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                {b.name}
                              </span>
                            )}
                            <span
                              className="text-[10px] font-bold"
                              style={{
                                color: PRIORITY_COLORS[t.priority as TaskPriority] || "#6b7280",
                              }}
                            >
                              {t.priority}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-3 text-center text-xs text-gray-400">
                    No matching existing tasks found.
                  </div>
                )}

                {/* Quick Create Option */}
                {searchQuery.trim().length > 0 && (
                  <div className="p-2.5 bg-gray-50/70 dark:bg-gray-700/30">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Board for new task:
                      </span>
                      <select
                        value={selectedBoardId}
                        onChange={(e) => setSelectedBoardId(e.target.value)}
                        className="text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-gray-800 dark:text-gray-200 focus:outline-none"
                      >
                        {boards.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      disabled={isQuickCreating}
                      onClick={() => handleQuickCreateTask(searchQuery)}
                      className="w-full text-left px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <span>
                        ✨ Quick create & select &quot;{searchQuery.trim()}&quot;
                      </span>
                      <span className="text-[10px] opacity-75">
                        {isQuickCreating ? "Creating..." : "Press Enter ↵"}
                      </span>
                    </button>
                  </div>
                )}

                {/* Open full task modal link */}
                {onOpenTaskForm && (
                  <div className="p-2 bg-gray-50 dark:bg-gray-800/80 text-center">
                    <button
                      type="button"
                      onClick={() => onOpenTaskForm(startTime, endTime)}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                    >
                      ➕ Create task with full details (checklist, description)...
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Time Slots (Default 30 Minutes) ─────────────────────────── */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                Start Time
              </label>
              <TimePicker
                value={startTime}
                onChange={(val) => setStartTime(val)}
                className={inputCls}
                align="left"
                position="top"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                End Time
              </label>
              <TimePicker
                value={endTime}
                onChange={(val) => setEndTime(val)}
                className={inputCls}
                align="right"
                position="top"
              />
            </div>
          </div>

          {/* ── Options: Fixed & Recurring ────────────────────────────────── */}
          <div className="flex items-center gap-6 pt-1">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isFixed}
                onChange={(e) => setIsFixed(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              Fixed time (immovable)
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              Recurring
            </label>
          </div>

          {isRecurring && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                Recurrence Rule
              </label>
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

          {/* ── Action Buttons ───────────────────────────────────────────── */}
          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!taskId}
              className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              ✓ Schedule
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
