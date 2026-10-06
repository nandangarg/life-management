"use client";

import { useState, useMemo } from "react";
import { Board, TaskWithRelations, TimeLogWithTask } from "@/types";
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
    initialLog?.durationMin || calcDiffMin(initialLog?.startTime || getNowTimeStr(), initialLog?.endTime || getNowTimeStr()) || 30
  );
  const [notes, setNotes] = useState(initialLog?.notes || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customTitleMode, setCustomTitleMode] = useState(!initialLog?.taskId);

  if (!isOpen) return null;

  const handleTaskSelect = (taskId: string) => {
    setSelectedTaskId(taskId);
    if (taskId) {
      const task = allTasks.find((t) => t.id === taskId);
      if (task) {
        setTitle(task.title);
      }
    }
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
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-lg border border-gray-100 dark:border-gray-700 space-y-5"
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
          {/* Link to existing Task or Custom */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Link to Task / Board (Optional)
              </label>
              <button
                type="button"
                onClick={() => {
                  setCustomTitleMode(!customTitleMode);
                  if (customTitleMode) setSelectedTaskId("");
                }}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                {selectedTaskId ? "Clear task association" : "Choose from existing tasks"}
              </button>
            </div>

            <select
              value={selectedTaskId}
              onChange={(e) => handleTaskSelect(e.target.value)}
              className={inputCls}
            >
              <option value="">— Unplanned / Ad-hoc activity (No specific task) —</option>
              {boards.map((board) => {
                const boardTasks = allTasks.filter((t) => t.boardId === board.id);
                if (boardTasks.length === 0) return null;
                return (
                  <optgroup key={board.id} label={board.name}>
                    {boardTasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
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
              <span className="text-xs text-blue-800 dark:text-blue-300 font-semibold">minutes ({Math.floor(durationMin / 60)}h {durationMin % 60}m)</span>
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
              placeholder="e.g. Discussed roadmap timelines with Nandangarg, finalized tech spec..."
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
