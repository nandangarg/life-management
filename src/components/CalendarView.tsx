"use client";

import { useState } from "react";
import { ScheduleWithTask, Board, PRIORITY_COLORS, TaskPriority } from "@/types";

interface CalendarViewProps {
  date: string;
  schedules: ScheduleWithTask[];
  boards?: Board[];
  activeBoardId?: string;
  onDateChange: (date: string) => void;
  onAddSchedule: (startTime?: string, endTime?: string) => void;
  onAddNewTaskAndSchedule: (startTime?: string, endTime?: string) => void;
  onQuickTaskCreate?: (title: string, boardId: string) => Promise<void>;
  onPlanDay: () => void;
  onMarkComplete: (scheduleId: string) => void;
  onDeleteSchedule: (scheduleId: string) => void;
}

const HOURS = Array.from({ length: 20 }, (_, i) => i + 4); // 4 AM to 11 PM

export default function CalendarView({
  date,
  schedules,
  boards = [],
  activeBoardId = "",
  onDateChange,
  onAddSchedule,
  onAddNewTaskAndSchedule,
  onQuickTaskCreate,
  onPlanDay,
  onMarkComplete,
  onDeleteSchedule,
}: CalendarViewProps) {
  const [showQuickTask, setShowQuickTask] = useState(false);
  const [quickTaskTitle, setQuickTaskTitle] = useState("");
  const [quickTaskBoardId, setQuickTaskBoardId] = useState(activeBoardId || boards[0]?.id || "");
  const [isSubmittingQuickTask, setIsSubmittingQuickTask] = useState(false);

  const prevDay = () => {
    const d = new Date(date);
    d.setDate(d.getDate() - 1);
    onDateChange(d.toISOString().split("T")[0]);
  };

  const nextDay = () => {
    const d = new Date(date);
    d.setDate(d.getDate() + 1);
    onDateChange(d.toISOString().split("T")[0]);
  };

  const timeToMins = (timeStr: string) => {
    const [h, m] = timeStr.split(":").map(Number);
    return h * 60 + m;
  };

  const startHour = 4;
  const hourHeight = 48;

  interface LayoutEvent {
    schedule: ScheduleWithTask;
    top: number;
    height: number;
    left: string;
    width: string;
  }

  const layoutSchedules: LayoutEvent[] = [];

  if (schedules.length > 0) {
    const sorted = [...schedules].sort((a, b) => {
      const startA = timeToMins(a.startTime);
      const startB = timeToMins(b.startTime);
      if (startA !== startB) return startA - startB;

      const endA = timeToMins(a.endTime);
      const endB = timeToMins(b.endTime);
      return (endB - startB) - (endA - startA);
    });

    const clusters: ScheduleWithTask[][] = [];
    sorted.forEach((event) => {
      let added = false;
      const startVal = timeToMins(event.startTime);
      const endVal = timeToMins(event.endTime);

      for (const cluster of clusters) {
        const overlaps = cluster.some((other) => {
          const startOther = timeToMins(other.startTime);
          const endOther = timeToMins(other.endTime);
          return startVal < endOther && endVal > startOther;
        });

        if (overlaps) {
          cluster.push(event);
          added = true;
          break;
        }
      }

      if (!added) {
        clusters.push([event]);
      }
    });

    clusters.forEach((cluster) => {
      const columns: ScheduleWithTask[][] = [];
      cluster.forEach((event) => {
        let placed = false;
        const startVal = timeToMins(event.startTime);

        for (let c = 0; c < columns.length; c++) {
          const colEvents = columns[c];
          const lastEvent = colEvents[colEvents.length - 1];
          if (timeToMins(lastEvent.endTime) <= startVal) {
            colEvents.push(event);
            placed = true;
            break;
          }
        }

        if (!placed) {
          columns.push([event]);
        }
      });

      const numCols = columns.length;
      columns.forEach((colEvents, colIdx) => {
        colEvents.forEach((event) => {
          const startVal = timeToMins(event.startTime);
          const endVal = timeToMins(event.endTime);

          const eventTop = ((startVal - startHour * 60) / 60) * hourHeight;
          const eventHeight = Math.max(18, ((endVal - startVal) / 60) * hourHeight);

          const widthPercent = 100 / numCols;
          const leftPercent = colIdx * widthPercent;

          layoutSchedules.push({
            schedule: event,
            top: eventTop,
            height: eventHeight,
            left: `${leftPercent}%`,
            width: `${widthPercent}%`,
          });
        });
      });
    });
  }

  const currentDateObj = new Date(date + "T00:00:00");
  const formattedDate = currentDateObj.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const dayName = currentDateObj.toLocaleDateString("en-US", { weekday: "long" });

  const handleQuickTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTaskTitle.trim() || !onQuickTaskCreate || isSubmittingQuickTask) return;
    setIsSubmittingQuickTask(true);
    try {
      await onQuickTaskCreate(quickTaskTitle.trim(), quickTaskBoardId || boards[0]?.id || "");
      setQuickTaskTitle("");
      setShowQuickTask(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingQuickTask(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* ── Calendar Header Toolbar ──────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-gray-700 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Date Selector */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-between md:justify-start">
          <button
            onClick={prevDay}
            className="px-2.5 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm transition-colors cursor-pointer"
            title="Previous Day"
          >
            ← Prev
          </button>
          <div className="text-center">
            <div className="text-base font-bold text-gray-900 dark:text-gray-100 leading-tight">
              {dayName}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{formattedDate}</div>
          </div>
          <button
            onClick={nextDay}
            className="px-2.5 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm transition-colors cursor-pointer"
            title="Next Day"
          >
            Next →
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
          <button
            onClick={() => onDateChange(new Date().toISOString().split("T")[0])}
            className="text-xs px-2.5 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-medium transition-colors"
          >
            Today
          </button>
          <button
            onClick={onPlanDay}
            className="text-xs px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors cursor-pointer"
          >
            Plan Day
          </button>

          {/* Quick Task Shortcut */}
          <button
            onClick={() => setShowQuickTask(!showQuickTask)}
            className={`text-xs px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
              showQuickTask
                ? "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700"
                : "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-amber-200 dark:border-amber-800"
            }`}
            title="Create an unscheduled quick task"
          >
            <span>⚡</span> + Quick Task
          </button>

          {/* Schedule Existing */}
          <button
            onClick={() => onAddSchedule()}
            className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1"
          >
            <span>+</span> Schedule
          </button>

          {/* New Task & Schedule */}
          <button
            onClick={() => onAddNewTaskAndSchedule()}
            className="text-xs px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1"
            title="Create a new task and schedule it immediately"
          >
            <span>✨</span> + New Task & Schedule
          </button>
        </div>
      </div>

      {/* ── Quick Task Inline Drawer ─────────────────────────────────────── */}
      {showQuickTask && (
        <form
          onSubmit={handleQuickTaskSubmit}
          className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 flex flex-col sm:flex-row items-center gap-2 animate-fade-in"
        >
          <span className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wide shrink-0">
            ⚡ Quick Todo:
          </span>
          <input
            type="text"
            autoFocus
            required
            value={quickTaskTitle}
            onChange={(e) => setQuickTaskTitle(e.target.value)}
            placeholder="Type quick task name (e.g. Buy printer paper, Send invoice)..."
            className="flex-1 w-full border border-amber-300 dark:border-amber-700 rounded-lg px-3 py-1.5 text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <select
              value={quickTaskBoardId}
              onChange={(e) => setQuickTaskBoardId(e.target.value)}
              className="text-xs border border-amber-300 dark:border-amber-700 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none"
            >
              {boards.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={isSubmittingQuickTask || !quickTaskTitle.trim()}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmittingQuickTask ? "Adding..." : "Add to Board"}
            </button>
            <button
              type="button"
              onClick={() => setShowQuickTask(false)}
              className="p-1.5 text-gray-400 hover:text-gray-600 text-xs rounded"
            >
              ✕
            </button>
          </div>
        </form>
      )}

      {/* ── Main Interactive Calendar Grid ───────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-xs">
        <div className="flex relative">
          {/* Hour labels column */}
          <div className="w-16 shrink-0 border-r border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20 select-none">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="h-12 text-xs text-gray-400 dark:text-gray-500 p-2 text-right border-b border-gray-100 dark:border-gray-700"
              >
                {hour.toString().padStart(2, "0")}:00
              </div>
            ))}
          </div>

          {/* Grid rows & interactive 30-min clickable slots */}
          <div className="flex-1 relative" style={{ height: `${HOURS.length * 48}px` }}>
            {/* Interactive 30-minute Background Slots */}
            <div className="absolute inset-0 z-0">
              {HOURS.map((hour) => {
                const hStr = hour.toString().padStart(2, "0");
                const nextHStr = (hour + 1).toString().padStart(2, "0");
                const slot1Start = `${hStr}:00`;
                const slot1End = `${hStr}:30`;
                const slot2Start = `${hStr}:30`;
                const slot2End = `${nextHStr}:00`;

                return (
                  <div key={hour} className="h-12 border-b border-gray-100 dark:border-gray-700 flex flex-col">
                    {/* Top 30-min slot (:00 to :30) */}
                    <div
                      onClick={() => onAddSchedule(slot1Start, slot1End)}
                      className="h-6 border-b border-dashed border-gray-100/70 dark:border-gray-700/40 hover:bg-blue-50/60 dark:hover:bg-blue-900/20 transition-colors cursor-pointer group"
                      title={`Click to schedule 30m slot (${slot1Start} - ${slot1End})`}
                    />
                    {/* Bottom 30-min slot (:30 to :00) */}
                    <div
                      onClick={() => onAddSchedule(slot2Start, slot2End)}
                      className="h-6 hover:bg-blue-50/60 dark:hover:bg-blue-900/20 transition-colors cursor-pointer group"
                      title={`Click to schedule 30m slot (${slot2Start} - ${slot2End})`}
                    />
                  </div>
                );
              })}
            </div>

            {/* Absolute Events Container */}
            <div className="absolute inset-y-0 left-0 right-2 pointer-events-none z-10">
              {layoutSchedules.map(({ schedule, top, height, left, width }) => {
                const priorityColor =
                  PRIORITY_COLORS[schedule.task.priority as TaskPriority] || "#6b7280";

                const isShort = height < 45;
                const minHeight = 22;
                const finalHeight = Math.max(minHeight, height);

                return (
                  <div
                    key={schedule.id}
                    className="absolute pointer-events-auto rounded-md text-white shadow-sm transition-all hover:brightness-105 border border-white/10 overflow-hidden flex flex-col justify-start"
                    style={{
                      top: `${top + 1}px`,
                      height: `${finalHeight - 2}px`,
                      left: left,
                      width: `calc(${width} - 4px)`,
                      backgroundColor: priorityColor,
                      opacity: schedule.completedAt ? 0.6 : 1,
                      zIndex: 10,
                      padding: isShort ? "1px 6px" : "4px 8px",
                    }}
                  >
                    {isShort ? (
                      <div className="flex items-center gap-1.5 truncate w-full pr-8 text-[10px] leading-none h-full align-middle">
                        <span className="font-bold truncate">{schedule.task.title}</span>
                        <span className="opacity-80 text-[9px] shrink-0 font-medium">
                          ({schedule.startTime} - {schedule.endTime}
                          {schedule.isFixed && " *"})
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col justify-between h-full py-0.5">
                        <div className="font-semibold text-xs truncate pr-8 leading-tight">
                          {schedule.task.title}
                        </div>
                        <div className="opacity-90 text-[10px] truncate leading-none">
                          {schedule.startTime} - {schedule.endTime}
                          {schedule.isFixed && " (fixed)"}
                        </div>
                      </div>
                    )}

                    <div
                      className={`absolute flex gap-0.5 ${
                        isShort ? "top-0.5 right-0.5 scale-80 origin-top-right" : "top-1 right-1"
                      }`}
                    >
                      {!schedule.completedAt && (
                        <button
                          onClick={() => onMarkComplete(schedule.id)}
                          className="bg-white/30 hover:bg-white/50 rounded px-1 text-[10px] leading-none py-0.5 cursor-pointer"
                          title="Mark complete"
                        >
                          ✓
                        </button>
                      )}
                      <button
                        onClick={() => onDeleteSchedule(schedule.id)}
                        className="bg-white/30 hover:bg-white/50 rounded px-1 text-[10px] leading-none py-0.5 cursor-pointer"
                        title="Remove"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
