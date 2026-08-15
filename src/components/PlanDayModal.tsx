"use client";

import { useState, useMemo, useEffect } from "react";
import { Board, TaskWithRelations, ScheduleWithTask, TaskPriority, PRIORITY_COLORS } from "@/types";

interface PlanDayModalProps {
  date: string;
  boards: Board[];
  existingSchedules: ScheduleWithTask[];
  onSubmit: (schedules: Array<{ taskId: string; startTime: string; endTime: string }>) => void;
  onClose: () => void;
}

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6 AM to 9 PM

export default function PlanDayModal({
  date,
  boards,
  existingSchedules,
  onSubmit,
  onClose,
}: PlanDayModalProps) {
  // 1. Board filter selection
  const [selectedBoardIds, setSelectedBoardIds] = useState<string[]>([]);

  // Initialize selected boards with visible boards
  useEffect(() => {
    const visibleBoardIds = boards.filter((b) => !b.isHidden).map((b) => b.id);
    setSelectedBoardIds(visibleBoardIds);
  }, [boards]);

  // 2. Load candidate tasks (non-recurring, status !== DONE)
  const candidateTasks = useMemo(() => {
    return boards
      .filter((b) => selectedBoardIds.includes(b.id))
      .flatMap((b) =>
        b.tasks
          .filter((t) => t.status !== "DONE" && !t.isRecurring)
          .map((t) => ({ ...t, boardName: b.name, boardColor: b.color }))
      )
      .sort((a, b) => {
        const priorityWeight = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        const weightA = priorityWeight[a.priority as TaskPriority] || 0;
        const weightB = priorityWeight[b.priority as TaskPriority] || 0;
        return weightB - weightA; // Higher weight first
      });
  }, [boards, selectedBoardIds]);

  // 3. User selections
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [manualTimes, setManualTimes] = useState<Record<string, { startTime: string; endTime: string }>>({});

  const handleToggleTask = (taskId: string) => {
    setSelectedTaskIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  // Helper: check if a time slot is blocked by existing schedules (excluding virtual/auto-projected)
  const occupiedTimeRanges = useMemo(() => {
    return existingSchedules
      .filter((s) => !s.isCancelled)
      .map((s) => ({
        start: s.startTime,
        end: s.endTime,
        title: s.task.title,
      }));
  }, [existingSchedules]);

  // Convert HH:mm to minutes from midnight
  const timeToMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(":").map(Number);
    return h * 60 + m;
  };

  // Convert minutes from midnight to HH:mm
  const minutesToTime = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  };

  // 4. Auto-scheduler algorithm
  const plannedSchedules = useMemo(() => {
    const result: Array<{
      task: TaskWithRelations & { boardName: string; boardColor: string };
      startTime: string;
      endTime: string;
      isUnscheduled: boolean;
    }> = [];

    // Tracks blocked minutes. Represented as 30-minute intervals from 6:00 to 21:00 (15 hours = 30 intervals)
    const totalSlots = 30;
    const startMins = 6 * 60; // 6 AM
    const slotMins = 30;
    const occupiedSlots = new Array(totalSlots).fill(false);

    // Mark pre-existing occupied slots
    occupiedTimeRanges.forEach((range) => {
      const start = timeToMinutes(range.start);
      const end = timeToMinutes(range.end);

      for (let i = 0; i < totalSlots; i++) {
        const slotStart = startMins + i * slotMins;
        const slotEnd = slotStart + slotMins;
        if (slotStart < end && slotEnd > start) {
          occupiedSlots[i] = true;
        }
      }
    });

    const selectedTasks = candidateTasks.filter((t) => selectedTaskIds.includes(t.id));

    // First pass: Schedule Fixed-time Tasks
    selectedTasks.forEach((task) => {
      // Check if user set manual overrides, or task has defaults
      const custom = manualTimes[task.id];
      const startStr = custom?.startTime || task.startTime;
      const endStr = custom?.endTime || task.endTime;

      if (startStr && endStr) {
        result.push({
          task,
          startTime: startStr,
          endTime: endStr,
          isUnscheduled: false,
        });

        // Block these slots
        const start = timeToMinutes(startStr);
        const end = timeToMinutes(endStr);
        for (let i = 0; i < totalSlots; i++) {
          const slotStart = startMins + i * slotMins;
          const slotEnd = slotStart + slotMins;
          if (slotStart < end && slotEnd > start) {
            occupiedSlots[i] = true;
          }
        }
      }
    });

    // Second pass: Schedule Flexible Tasks (order by priority)
    selectedTasks.forEach((task) => {
      const custom = manualTimes[task.id];
      // Skip if already scheduled in first pass
      if (custom?.startTime || task.startTime) return;

      const durationMins = task.estimatedMin || 60;
      // Round to nearest slot count
      const slotsNeeded = Math.ceil(durationMins / slotMins);

      // Find first consecutive free slots
      let foundIndex = -1;
      for (let i = 0; i <= totalSlots - slotsNeeded; i++) {
        let isFree = true;
        for (let j = 0; j < slotsNeeded; j++) {
          if (occupiedSlots[i + j]) {
            isFree = false;
            break;
          }
        }
        if (isFree) {
          foundIndex = i;
          break;
        }
      }

      if (foundIndex !== -1) {
        const start = startMins + foundIndex * slotMins;
        const end = start + slotsNeeded * slotMins;

        const startTime = minutesToTime(start);
        const endTime = minutesToTime(end);

        result.push({
          task,
          startTime,
          endTime,
          isUnscheduled: false,
        });

        // Block these slots
        for (let j = 0; j < slotsNeeded; j++) {
          occupiedSlots[foundIndex + j] = true;
        }
      } else {
        // Unscheduled due to no time slot fitting
        result.push({
          task,
          startTime: "09:00",
          endTime: "10:00",
          isUnscheduled: true,
        });
      }
    });

    return result;
  }, [candidateTasks, selectedTaskIds, occupiedTimeRanges, manualTimes]);

  const handleManualTimeChange = (taskId: string, field: "startTime" | "endTime", value: string) => {
    setManualTimes((prev) => {
      const existing = prev[taskId] || { startTime: "09:00", endTime: "10:00" };
      return {
        ...prev,
        [taskId]: {
          ...existing,
          [field]: value,
        },
      };
    });
  };

  const handleBoardCheckboxChange = (boardId: string) => {
    setSelectedBoardIds((prev) =>
      prev.includes(boardId) ? prev.filter((id) => id !== boardId) : [...prev, boardId]
    );
  };

  const handleSave = () => {
    const schedulesToCreate = plannedSchedules
      .filter((p) => !p.isUnscheduled)
      .map((p) => ({
        taskId: p.task.id,
        startTime: p.startTime,
        endTime: p.endTime,
      }));

    onSubmit(schedulesToCreate);
  };

  const displayDate = new Date(date + "T12:00:00");
  const formattedDate = displayDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const sidebarInputCls = "border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500";

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-5xl h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Plan Day - {formattedDate}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Select boards, check tasks, and preview your daily schedule timeline</p>
          </div>
          <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-xl font-bold">✕</button>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Left Column: Boards Filter & Backlog Tasks */}
          <div className="w-1/2 p-6 border-r border-gray-200 dark:border-gray-700 flex flex-col min-h-0 overflow-y-auto">
            {/* Boards checkboxes */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Select Boards</label>
              <div className="flex flex-wrap gap-3">
                {boards.map((b) => (
                  <label key={b.id} className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedBoardIds.includes(b.id)}
                      onChange={() => handleBoardCheckboxChange(b.id)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: b.color }} />
                    {b.name}
                  </label>
                ))}
              </div>
            </div>

            {/* Candidate Backlog Tasks List */}
            <div className="flex-1 flex flex-col min-h-0">
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                Available Backlog Tasks ({candidateTasks.length})
              </label>
              <div className="flex-1 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2 bg-gray-50 dark:bg-gray-900/50 space-y-1.5">
                {candidateTasks.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500 italic p-4 text-center">No active tasks found in selected boards.</p>
                ) : (
                  candidateTasks.map((t) => {
                    const isSelected = selectedTaskIds.includes(t.id);
                    const priorityColor = PRIORITY_COLORS[t.priority as TaskPriority] || "#6b7280";
                    return (
                      <div
                        key={t.id}
                        onClick={() => handleToggleTask(t.id)}
                        className={`flex items-start gap-3 p-2.5 rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-blue-50/50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 shadow-sm"
                            : "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}} // Handled by div onClick
                          className="rounded text-blue-600 focus:ring-blue-500 mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{t.title}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full text-white font-medium" style={{ backgroundColor: t.boardColor }}>
                              {t.boardName}
                            </span>
                            <span className="text-[10px] text-gray-400 dark:text-gray-500">
                              Priority: <span style={{ color: priorityColor }} className="font-semibold">{t.priority}</span>
                            </span>
                            {t.estimatedMin && (
                              <span className="text-[10px] text-gray-400 dark:text-gray-500">⏱ {t.estimatedMin}m</span>
                            )}
                            {(t.startTime || t.endTime) && (
                              <span className="text-[10px] text-orange-500 font-medium">
                                📅 Fixed: {t.startTime || "—"} - {t.endTime || "—"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Day Schedule Timeline & Auto-schedule Preview */}
          <div className="w-1/2 p-6 flex flex-col min-h-0 overflow-y-auto bg-gray-50 dark:bg-gray-900/20">
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Planned Timeline Preview</label>
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-0">
              {/* Task allocation listing */}
              {selectedTaskIds.length === 0 ? (
                <div className="flex items-center justify-center h-full text-sm text-gray-400 dark:text-gray-500 italic text-center p-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                  Check tasks on the left backlog to add them to your schedule preview.
                </div>
              ) : (
                <div className="space-y-3">
                  {plannedSchedules.map((p) => {
                    const priorityColor = PRIORITY_COLORS[p.task.priority as TaskPriority] || "#6b7280";
                    return (
                      <div key={p.task.id} className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: priorityColor }} />
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{p.task.title}</div>
                          </div>
                          <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                            Board: {p.task.boardName} | Est: {p.task.estimatedMin || 60}m
                          </div>
                        </div>

                        {p.isUnscheduled ? (
                          <div className="text-xs text-red-500 font-semibold px-2 py-1 bg-red-50 dark:bg-red-900/20 rounded">No Free Slot</div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="time"
                              value={p.startTime}
                              onChange={(e) => handleManualTimeChange(p.task.id, "startTime", e.target.value)}
                              className={sidebarInputCls}
                            />
                            <span className="text-gray-400 text-xs">—</span>
                            <input
                              type="time"
                              value={p.endTime}
                              onChange={(e) => handleManualTimeChange(p.task.id, "endTime", e.target.value)}
                              className={sidebarInputCls}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Hour Blocks visualization */}
              {selectedTaskIds.length > 0 && (
                <div className="mt-6 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800">
                  <div className="bg-gray-50 dark:bg-gray-700 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                    Schedule Overview
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {HOURS.map((hour) => {
                      const hourStr = `${hour.toString().padStart(2, "0")}:00`;
                      
                      // Check if occupied by existing schedule
                      const existingMatch = occupiedTimeRanges.find((r) => {
                        const start = timeToMinutes(r.start);
                        const end = timeToMinutes(r.end);
                        const current = hour * 60;
                        return current >= start && current < end;
                      });

                      // Check if occupied by newly planned schedule
                      const plannedMatch = plannedSchedules.find((p) => {
                        if (p.isUnscheduled) return false;
                        const start = timeToMinutes(p.startTime);
                        const end = timeToMinutes(p.endTime);
                        const current = hour * 60;
                        return current >= start && current < end;
                      });

                      return (
                        <div key={hour} className="flex text-xs min-h-[36px] items-center">
                          <div className="w-12 shrink-0 p-2 text-right text-[10px] text-gray-400 dark:text-gray-500 border-r border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20">
                            {hourStr}
                          </div>
                          <div className="flex-1 px-3 py-1">
                            {existingMatch ? (
                              <div className="bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded text-[10px] truncate border border-gray-200 dark:border-gray-600">
                                🔒 {existingMatch.title} (Already Scheduled)
                              </div>
                            ) : plannedMatch ? (
                              <div
                                className="text-white px-2 py-0.5 rounded text-[10px] font-medium truncate flex items-center gap-1.5"
                                style={{ backgroundColor: PRIORITY_COLORS[plannedMatch.task.priority as TaskPriority] || "#6b7280" }}
                              >
                                ✍️ {plannedMatch.task.title}
                              </div>
                            ) : (
                              <span className="text-[10px] text-gray-300 dark:text-gray-600 italic">free</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 bg-gray-50 dark:bg-gray-900/50 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={plannedSchedules.filter(p => !p.isUnscheduled).length === 0}
            className="px-5 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            Confirm Schedule
          </button>
        </div>
      </div>
    </div>
  );
}
