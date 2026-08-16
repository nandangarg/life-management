"use client";

import { ScheduleWithTask, PRIORITY_COLORS, TaskPriority } from "@/types";

interface CalendarViewProps {
  date: string;
  schedules: ScheduleWithTask[];
  onDateChange: (date: string) => void;
  onAddSchedule: () => void;
  onPlanDay: () => void;
  onMarkComplete: (scheduleId: string) => void;
  onDeleteSchedule: (scheduleId: string) => void;
}

const HOURS = Array.from({ length: 20 }, (_, i) => i + 4); // 4 AM to 11 PM

export default function CalendarView({
  date,
  schedules,
  onDateChange,
  onAddSchedule,
  onPlanDay,
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
          const endLast = timeToMins(lastEvent.endTime);
          if (startVal >= endLast) {
            colEvents.push(event);
            placed = true;
            break;
          }
        }
        
        if (!placed) {
          columns.push([event]);
        }
      });

      const totalColumns = columns.length;
      columns.forEach((colEvents, colIndex) => {
        colEvents.forEach((event) => {
          const startVal = timeToMins(event.startTime);
          const endVal = timeToMins(event.endTime);
          
          const startOffset = Math.max(0, startVal - startHour * 60);
          const top = (startOffset / 60) * hourHeight;
          
          const duration = Math.max(15, endVal - startVal);
          const height = (duration / 60) * hourHeight;
          
          const width = `${100 / totalColumns}%`;
          const left = `${colIndex * (100 / totalColumns)}%`;

          layoutSchedules.push({
            schedule: event,
            top,
            height,
            left,
            width,
          });
        });
      });
    });
  }

  const displayDate = new Date(date + "T12:00:00");
  const dayName = displayDate.toLocaleDateString("en-US", { weekday: "long" });
  const formattedDate = displayDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={prevDay} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm">
            ← Prev
          </button>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{dayName}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{formattedDate}</div>
          </div>
          <button onClick={nextDay} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm">
            Next →
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onDateChange(new Date().toISOString().split("T")[0])}
            className="text-sm px-3 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg"
          >
            Today
          </button>
          <button
            onClick={onPlanDay}
            className="text-sm px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
          >
            Plan Day
          </button>
          <button
            onClick={onAddSchedule}
            className="text-sm px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            + Schedule
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex relative">
          
          {/* Hour labels column */}
          <div className="w-16 shrink-0 border-r border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20 select-none">
            {HOURS.map((hour) => (
              <div key={hour} className="h-12 text-xs text-gray-400 dark:text-gray-500 p-2 text-right border-b border-gray-100 dark:border-gray-700">
                {hour.toString().padStart(2, "0")}:00
              </div>
            ))}
          </div>

          {/* Grid rows and absolute events area */}
          <div className="flex-1 relative" style={{ height: `${HOURS.length * 48}px` }}>
            
            {/* Background Grid Lines */}
            <div className="absolute inset-0 pointer-events-none">
              {HOURS.map((hour) => (
                <div key={hour} className="h-12 border-b border-gray-100 dark:border-gray-700" />
              ))}
            </div>

            {/* Absolute Events Container */}
            <div className="absolute inset-y-0 left-0 right-2">
              {layoutSchedules.map(({ schedule, top, height, left, width }) => {
                const priorityColor =
                  PRIORITY_COLORS[schedule.task.priority as TaskPriority] || "#6b7280";
                
                const isShort = height < 45;
                const minHeight = 22;
                const finalHeight = Math.max(minHeight, height);
                
                return (
                  <div
                    key={schedule.id}
                    className="absolute rounded-md text-white shadow-sm transition-all hover:brightness-105 border border-white/10 overflow-hidden flex flex-col justify-start"
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
                          ({schedule.startTime} - {schedule.endTime}{schedule.isFixed && " *"})
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col justify-between h-full py-0.5">
                        <div className="font-semibold text-xs truncate pr-8 leading-tight">{schedule.task.title}</div>
                        <div className="opacity-90 text-[10px] truncate leading-none">
                          {schedule.startTime} - {schedule.endTime}
                          {schedule.isFixed && " (fixed)"}
                        </div>
                      </div>
                    )}
                    
                    <div className={`absolute flex gap-0.5 ${isShort ? "top-0.5 right-0.5 scale-80 origin-top-right" : "top-1 right-1"}`}>
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
