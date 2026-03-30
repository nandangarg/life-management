"use client";

import { ScheduleWithTask, PRIORITY_COLORS, TaskPriority } from "@/types";

interface CalendarViewProps {
  date: string;
  schedules: ScheduleWithTask[];
  onDateChange: (date: string) => void;
  onAddSchedule: () => void;
  onMarkComplete: (scheduleId: string) => void;
  onDeleteSchedule: (scheduleId: string) => void;
}

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6 AM to 9 PM

export default function CalendarView({
  date,
  schedules,
  onDateChange,
  onAddSchedule,
  onMarkComplete,
  onDeleteSchedule,
}: CalendarViewProps) {
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

  const getScheduleForHour = (hour: number) => {
    return schedules.filter((s) => {
      const startHour = parseInt(s.startTime.split(":")[0]);
      const endHour = parseInt(s.endTime.split(":")[0]);
      return hour >= startHour && hour < endHour;
    });
  };

  const isStartHour = (schedule: ScheduleWithTask, hour: number) => {
    return parseInt(schedule.startTime.split(":")[0]) === hour;
  };

  const getSpanHours = (schedule: ScheduleWithTask) => {
    const start = parseInt(schedule.startTime.split(":")[0]);
    const end = parseInt(schedule.endTime.split(":")[0]);
    return end - start;
  };

  const displayDate = new Date(date + "T12:00:00");
  const dayName = displayDate.toLocaleDateString("en-US", { weekday: "long" });
  const formattedDate = displayDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Track rendered schedules to avoid duplicates
  const rendered = new Set<string>();

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={prevDay} className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm">
            ← Prev
          </button>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">{dayName}</div>
            <div className="text-sm text-gray-500">{formattedDate}</div>
          </div>
          <button onClick={nextDay} className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm">
            Next →
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onDateChange(new Date().toISOString().split("T")[0])}
            className="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            Today
          </button>
          <button
            onClick={onAddSchedule}
            className="text-sm px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + Schedule
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        {HOURS.map((hour) => {
          const hourSchedules = getScheduleForHour(hour);
          return (
            <div key={hour} className="flex border-b border-gray-100 min-h-[48px]">
              <div className="w-16 shrink-0 text-xs text-gray-400 p-2 text-right border-r border-gray-100">
                {hour.toString().padStart(2, "0")}:00
              </div>
              <div className="flex-1 p-1 flex gap-1">
                {hourSchedules.map((schedule) => {
                  if (rendered.has(schedule.id)) return null;
                  if (!isStartHour(schedule, hour)) return null;
                  rendered.add(schedule.id);
                  const span = getSpanHours(schedule);
                  const priorityColor =
                    PRIORITY_COLORS[schedule.task.priority as TaskPriority] || "#6b7280";

                  return (
                    <div
                      key={schedule.id}
                      className="flex-1 rounded-md px-2 py-1 text-xs text-white relative"
                      style={{
                        backgroundColor: priorityColor,
                        height: `${span * 48 - 4}px`,
                        opacity: schedule.completedAt ? 0.5 : 1,
                      }}
                    >
                      <div className="font-medium">{schedule.task.title}</div>
                      <div className="opacity-80">
                        {schedule.startTime} - {schedule.endTime}
                        {schedule.isFixed && " (fixed)"}
                      </div>
                      <div className="absolute top-1 right-1 flex gap-1">
                        {!schedule.completedAt && (
                          <button
                            onClick={() => onMarkComplete(schedule.id)}
                            className="bg-white/30 hover:bg-white/50 rounded px-1"
                            title="Mark complete"
                          >
                            ✓
                          </button>
                        )}
                        <button
                          onClick={() => onDeleteSchedule(schedule.id)}
                          className="bg-white/30 hover:bg-white/50 rounded px-1"
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
          );
        })}
      </div>
    </div>
  );
}
