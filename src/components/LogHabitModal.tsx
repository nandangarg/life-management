"use client";

import { useState } from "react";
import { ScheduleWithTask } from "@/types";
import TimePicker from "./TimePicker";

interface LogHabitModalProps {
  schedule: ScheduleWithTask;
  onSubmit: (data: {
    actualStartTime: string;
    actualEndTime: string;
    actualMin: number;
    metricValue: number | null;
    notes: string;
  }) => void;
  onClose: () => void;
}

export default function LogHabitModal({ schedule, onSubmit, onClose }: LogHabitModalProps) {
  const [startTime, setStartTime] = useState(schedule.startTime || "06:00");
  const [endTime, setEndTime] = useState(schedule.endTime || "07:00");
  const [actualMin, setActualMin] = useState(60);
  const [metricValue, setMetricValue] = useState("");
  const [notes, setNotes] = useState(schedule.notes || "");

  // Convert HH:mm to minutes from midnight
  const timeToMins = (timeStr: string) => {
    const [h, m] = timeStr.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const handleStartTimeChange = (val: string) => {
    setStartTime(val);
    const start = timeToMins(val);
    const end = timeToMins(endTime);
    let diff = end - start;
    if (diff < 0) diff += 24 * 60;
    setActualMin(diff);
  };

  const handleEndTimeChange = (val: string) => {
    setEndTime(val);
    const start = timeToMins(startTime);
    const end = timeToMins(val);
    let diff = end - start;
    if (diff < 0) diff += 24 * 60;
    setActualMin(diff);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      actualStartTime: startTime,
      actualEndTime: endTime,
      actualMin,
      metricValue: metricValue ? parseFloat(metricValue) : null,
      notes,
    });
  };

  const inputCls = "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            🧘 Log Routine: {schedule.task.title}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Actual Start Time</label>
              <TimePicker
                value={startTime}
                onChange={handleStartTimeChange}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Actual End Time</label>
              <TimePicker
                value={endTime}
                onChange={handleEndTimeChange}
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Duration (minutes)</label>
              <input
                type="number"
                value={actualMin}
                onChange={(e) => setActualMin(parseInt(e.target.value) || 0)}
                className={inputCls}
                min="0"
                required
              />
            </div>

            {schedule.task.habitUnit && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                  Count ({schedule.task.habitUnit})
                </label>
                <input
                  type="number"
                  step="any"
                  value={metricValue}
                  onChange={(e) => setMetricValue(e.target.value)}
                  className={inputCls}
                  placeholder={`e.g. 16`}
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Execution Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. Focused Japa in morning slot..."
              className={inputCls}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm"
            >
              ✓ Complete & Log
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
