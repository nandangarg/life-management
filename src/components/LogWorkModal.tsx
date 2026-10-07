"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Board, ScheduleWithTask, TimeLogWithTask, PRIORITY_COLORS, TaskPriority } from "@/types";
import TimePicker from "./TimePicker";

interface LogWorkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    id?: string;
    title: string;
    taskId?: string | null;
    date: string;
    startTime: string;
    endTime: string;
    durationMin: number;
    notes?: string | null;
  }) => Promise<void>;
  initialLog?: Partial<TimeLogWithTask> | null;
  defaultDate: string;
  boards: Board[];
  schedules?: ScheduleWithTask[];
}

function getNowTimeStr(): string {
  const now = new Date();
  const h = now.getHours().toString().padStart(2, "0");
  const m = Math.floor(now.getMinutes() / 5) * 5;
  const mStr = (m === 60 ? 55 : m).toString().padStart(2, "0");
  return `${h}:${mStr}`;
}

function timeToMins(timeStr: string): number {
  if (!timeStr || !timeStr.includes(":")) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function calcDiffMin(start: string, end: string): number {
  const s = timeToMins(start);
  const e = timeToMins(end);
  let diff = e - s;
  if (diff < 0) diff += 24 * 60;
  return diff;
}

export default function LogWorkModal({
  isOpen,
  onClose,
  onSave,
  initialLog,
  defaultDate,
  boards,
  schedules = [],
}: LogWorkModalProps) {
  const allTasks = useMemo(() => {
    return boards.flatMap((b) =>
      b.tasks.map((t) => ({
        ...t,
        boardName: b.name,
        boardColor: b.color,
      }))
    );
  }, [boards]);

  const [date, setDate] = useState(initialLog?.date || defaultDate);
  const [title, setTitle] = useState(initialLog?.title || "");
  const [selectedTaskId, setSelectedTaskId] = useState<string>(initialLog?.taskId || "");
  const [startTime, setStartTime] = useState(initialLog?.startTime || getNowTimeStr());
  const [endTime, setEndTime] = useState(initialLog?.endTime || getNowTimeStr());
  const [durationMin, setDurationMin] = useState<number>(
    initialLog?.durationMin ||
      calcDiffMin(
        initialLog?.startTime || getNowTimeStr(),
        initialLog?.endTime || getNowTimeStr()
      ) ||
      30
  );
  const [notes, setNotes] = useState(initialLog?.notes || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Searchable Task Combobox state
  const [taskSearchQuery, setTaskSearchQuery] = useState("");
  const [isTaskDropdownOpen, setIsTaskDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Selected task object
  const selectedTask = useMemo(() => {
    return allTasks.find((t) => t.id === selectedTaskId);
  }, [allTasks, selectedTaskId]);

  // Filter tasks by typing
  const filteredTasks = useMemo(() => {
    if (!taskSearchQuery.trim()) return allTasks;
    const q = taskSearchQuery.toLowerCase().trim();
    return allTasks.filter((t) => {
      return (
        t.title.toLowerCase().includes(q) ||
        t.boardName.toLowerCase().includes(q) ||
        t.categories.some((c) => c.name.toLowerCase().includes(q))
      );
    });
  }, [allTasks, taskSearchQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsTaskDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isOpen) return null;

  const handleTaskSelect = (taskId: string) => {
    setSelectedTaskId(taskId);
    setIsTaskDropdownOpen(false);
    setTaskSearchQuery("");
    if (taskId) {
      const task = allTasks.find((t) => t.id === taskId);
      if (task) {
        setTitle(task.title);

        // Check if there is a matching schedule for this task on the selected date
        const matchingSchedule = schedules?.find(
          (s) => s.taskId === taskId && s.date === date
        );

        if (matchingSchedule?.startTime && matchingSchedule?.endTime) {
          setStartTime(matchingSchedule.startTime);
          setEndTime(matchingSchedule.endTime);
          const diff = calcDiffMin(matchingSchedule.startTime, matchingSchedule.endTime);
          setDurationMin(diff > 0 ? diff : (task.estimatedMin || 30));
        } else if (task.startTime) {
          // Task has fixed/default start time
          setStartTime(task.startTime);
          if (task.endTime) {
            setEndTime(task.endTime);
            const diff = calcDiffMin(task.startTime, task.endTime);
            setDurationMin(diff > 0 ? diff : (task.estimatedMin || 30));
          } else if (task.estimatedMin) {
            const startM = timeToMins(task.startTime);
            const endM = (startM + task.estimatedMin) % (24 * 60);
            const endHStr = Math.floor(endM / 60).toString().padStart(2, "0");
            const endMStr = (endM % 60).toString().padStart(2, "0");
            setEndTime(`${endHStr}:${endMStr}`);
            setDurationMin(task.estimatedMin);
          }
        } else if (task.estimatedMin) {
          // If no specific start time, but estimated duration exists, adjust duration
          setDurationMin(task.estimatedMin);
          const startM = timeToMins(startTime);
          const endM = (startM + task.estimatedMin) % (24 * 60);
          const endHStr = Math.floor(endM / 60).toString().padStart(2, "0");
          const endMStr = (endM % 60).toString().padStart(2, "0");
          setEndTime(`${endHStr}:${endMStr}`);
        }
      }
    }
  };

  const handleClearTaskSelection = () => {
    setSelectedTaskId("");
    setTaskSearchQuery("");
    setTimeout(() => {
      searchInputRef.current?.focus();
      setIsTaskDropdownOpen(true);
    }, 50);
  };

  const handleStartTimeChange = (val: string) => {
    setStartTime(val);
    const diff = calcDiffMin(val, endTime);
    setDurationMin(diff > 0 ? diff : 30);
  };

  const handleEndTimeChange = (val: string) => {
    setEndTime(val);
    const diff = calcDiffMin(startTime, val);
    setDurationMin(diff > 0 ? diff : 30);
  };

  // Keyboard navigation inside task combobox
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isTaskDropdownOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setIsTaskDropdownOpen(true);
      }
      return;
    }

    const totalOptions = filteredTasks.length + 1; // +1 for "Unplanned" option

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % totalOptions);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + totalOptions) % totalOptions);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex === 0) {
        // "Unplanned" option selected
        if (taskSearchQuery.trim()) {
          setTitle(taskSearchQuery.trim());
        }
        handleTaskSelect("");
      } else if (filteredTasks[highlightedIndex - 1]) {
        handleTaskSelect(filteredTasks[highlightedIndex - 1].id);
      }
    } else if (e.key === "Escape") {
      setIsTaskDropdownOpen(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      await onSave({
        id: initialLog?.id,
        title: title.trim(),
        taskId: selectedTaskId || null,
        date,
        startTime,
        endTime,
        durationMin: Number(durationMin) || calcDiffMin(startTime, endTime) || 1,
        notes: notes.trim() || null,
      });
      onClose();
    } catch (err) {
      console.error("Failed to save log:", err);
    } finally {
      setIsSubmitting(false);
    }
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
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <span>⏱</span> {initialLog?.id ? "Edit Daily Log Entry" : "Log Activity / Work"}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl font-medium w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ── Searchable Task Combobox ─────────────────────────────────── */}
          <div className="relative" ref={dropdownRef}>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Link to Task / Board (Optional)
              </label>
              {selectedTaskId && (
                <button
                  type="button"
                  onClick={handleClearTaskSelection}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Clear task association
                </button>
              )}
            </div>

            {/* Selected Task Pill or Search Input */}
            {selectedTask ? (
              <div className="flex items-center justify-between border border-blue-300 dark:border-blue-600 bg-blue-50/60 dark:bg-blue-900/20 rounded-xl px-3.5 py-2.5">
                <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: selectedTask.boardColor || "#6366f1" }}
                  />
                  <span className="font-bold text-sm text-gray-900 dark:text-gray-100 truncate">
                    {selectedTask.title}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
                    ({selectedTask.boardName})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleClearTaskSelection}
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
                  value={taskSearchQuery}
                  onChange={(e) => {
                    setTaskSearchQuery(e.target.value);
                    setIsTaskDropdownOpen(true);
                    setHighlightedIndex(0);
                  }}
                  onFocus={() => setIsTaskDropdownOpen(true)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type to filter tasks by name, board, or category..."
                  className={inputCls}
                />
                <span className="absolute right-3 top-2.5 text-gray-400 text-xs pointer-events-none">
                  🔍
                </span>
              </div>
            )}

            {/* Dropdown Menu */}
            {!selectedTaskId && isTaskDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 max-h-60 overflow-y-auto z-50 divide-y divide-gray-100 dark:divide-gray-700/60">
                {/* Option 0: Unplanned / Ad-hoc */}
                <div
                  onClick={() => {
                    if (taskSearchQuery.trim() && !title) {
                      setTitle(taskSearchQuery.trim());
                    }
                    handleTaskSelect("");
                  }}
                  className={`px-3.5 py-2.5 text-xs font-semibold cursor-pointer transition-colors ${
                    highlightedIndex === 0
                      ? "bg-blue-50 dark:bg-blue-900/40 text-blue-900 dark:text-blue-200"
                      : "hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                  }`}
                >
                  {taskSearchQuery.trim() ? (
                    <span>
                      ✨ Use &quot;<strong className="text-blue-600 dark:text-blue-400">{taskSearchQuery.trim()}</strong>&quot; as Ad-hoc activity (No specific task)
                    </span>
                  ) : (
                    <span>— Unplanned / Ad-hoc activity (No specific task) —</span>
                  )}
                </div>

                {/* Filtered Task Results */}
                {filteredTasks.length > 0 ? (
                  <div className="py-1">
                    {filteredTasks.map((t, idx) => {
                      const isHighlighted = idx + 1 === highlightedIndex;
                      return (
                        <div
                          key={t.id}
                          onClick={() => handleTaskSelect(t.id)}
                          className={`px-3.5 py-2 flex items-center justify-between text-sm cursor-pointer transition-colors ${
                            isHighlighted
                              ? "bg-blue-50 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100"
                              : "hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200"
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: t.boardColor || "#6366f1" }}
                            />
                            <span className="font-medium truncate">{t.title}</span>
                          </div>
                          <div className="flex items-center gap-1.5 ml-2 shrink-0">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                              {t.boardName}
                            </span>
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
                    No matching tasks found for &quot;{taskSearchQuery}&quot;. You can use it as an ad-hoc title above!
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Activity Title */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
              Activity Name / Summary *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Design review meeting, Deep work on database, Doctor visit"
              className={inputCls}
            />
          </div>

          {/* Date, Start Time, End Time */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                Start Time
              </label>
              <TimePicker
                value={startTime}
                onChange={handleStartTimeChange}
                className={inputCls}
                align="left"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                End Time
              </label>
              <TimePicker
                value={endTime}
                onChange={handleEndTimeChange}
                className={inputCls}
                align="right"
              />
            </div>
          </div>

          {/* Duration display / override */}
          <div className="flex items-center justify-between p-3 bg-blue-50/70 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/50">
            <span className="text-sm font-medium text-blue-900 dark:text-blue-300">
              Total Duration:
            </span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                value={durationMin}
                onChange={(e) => setDurationMin(parseInt(e.target.value) || 0)}
                className="w-20 px-2 py-1 text-right text-sm font-bold bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-800 rounded-lg text-blue-900 dark:text-blue-200 focus:outline-none"
              />
              <span className="text-xs text-blue-800 dark:text-blue-300 font-semibold">
                minutes ({Math.floor(durationMin / 60)}h {durationMin % 60}m)
              </span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
              Notes / What was done (Optional)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Discussed roadmap timelines, finalized tech spec..."
              className={inputCls}
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? "Saving..." : initialLog?.id ? "Save Changes" : "✓ Save to Log"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
