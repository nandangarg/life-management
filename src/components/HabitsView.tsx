"use client";

import { useState, useEffect, useMemo } from "react";
import { Board, TaskWithRelations, TaskPriority, PRIORITY_COLORS } from "@/types";

interface HabitsViewProps {
  boards: Board[];
}

interface HabitStats {
  task: TaskWithRelations;
  totalCompletions: number;
  totalMin: number;
  avgMetricValue: number | null;
  currentStreak: number;
  longestStreak: number;
  completedDates: string[];
  recentLogs: Array<{
    date: string;
    actualStartTime: string | null;
    actualEndTime: string | null;
    actualMin: number | null;
    metricValue: number | null;
    notes: string | null;
  }>;
}

export default function HabitsView({ boards }: HabitsViewProps) {
  const [habitStats, setHabitStats] = useState<HabitStats[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all tasks and filter habits
  useEffect(() => {
    async function fetchHabitData() {
      try {
        setLoading(true);
        // Fetch all tasks for all active boards
        const activeBoardIds = boards.filter((b) => !b.isHidden).map((b) => b.id);
        
        // Fetch tasks
        const tasksRes = await fetch("/api/tasks");
        const tasksData: TaskWithRelations[] = await tasksRes.json();
        
        // Filter habits belonging to visible boards
        const habitTasks = tasksData.filter(
          (t) => t.isHabit && activeBoardIds.includes(t.boardId)
        );

        // Fetch all schedules to compute streaks & metrics
        const schedulesRes = await fetch("/api/schedules");
        const schedulesData: any[] = await schedulesRes.json();

        // Process statistics for each habit task
        const stats: HabitStats[] = habitTasks.map((task) => {
          // Find all schedules associated with this task that were completed
          const taskSchedules = schedulesData.filter(
            (s) => s.taskId === task.id && s.completedAt && !s.isCancelled
          );

          // Calculate completed dates
          const completedDates = Array.from(
            new Set(taskSchedules.map((s) => s.date))
          ).sort();

          // Calculate streaks
          const { currentStreak, longestStreak } = calculateStreaks(completedDates);

          // Calculate metrics
          const totalCompletions = taskSchedules.length;
          const totalMin = taskSchedules.reduce((acc, s) => acc + (s.actualMin || s.task.estimatedMin || 0), 0);
          
          const metricLogs = taskSchedules.filter((s) => s.metricValue !== null);
          const avgMetricValue = metricLogs.length > 0
            ? metricLogs.reduce((acc, s) => acc + s.metricValue, 0) / metricLogs.length
            : null;

          // Recent logs (last 5)
          const recentLogs = [...taskSchedules]
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, 5)
            .map((s) => ({
              date: s.date,
              actualStartTime: s.actualStartTime,
              actualEndTime: s.actualEndTime,
              actualMin: s.actualMin,
              metricValue: s.metricValue,
              notes: s.notes,
            }));

          return {
            task,
            totalCompletions,
            totalMin,
            avgMetricValue,
            currentStreak,
            longestStreak,
            completedDates,
            recentLogs,
          };
        });

        setHabitStats(stats);
      } catch (err) {
        console.error("Failed to load habits data:", err);
      } finally {
        setLoading(false);
      }
    }

    if (boards.length > 0) {
      fetchHabitData();
    }
  }, [boards]);

  // Generate helper to calculate streaks
  function calculateStreaks(completedDates: string[]) {
    if (completedDates.length === 0) {
      return { currentStreak: 0, longestStreak: 0 };
    }

    const getDayTimestamp = (dateStr: string) => {
      const [y, m, d] = dateStr.split("-").map(Number);
      return new Date(y, m - 1, d).getTime();
    };

    const MS_PER_DAY = 24 * 60 * 60 * 1000;

    let longestStreak = 0;
    let currentStreak = 0;
    let tempStreak = 0;
    let lastTimestamp: number | null = null;

    // Longest Streak
    for (let i = 0; i < completedDates.length; i++) {
      const ts = getDayTimestamp(completedDates[i]);
      if (lastTimestamp === null) {
        tempStreak = 1;
      } else {
        const diff = (ts - lastTimestamp) / MS_PER_DAY;
        if (Math.round(diff) === 1) {
          tempStreak++;
        } else {
          if (tempStreak > longestStreak) longestStreak = tempStreak;
          tempStreak = 1;
        }
      }
      lastTimestamp = ts;
    }
    if (tempStreak > longestStreak) longestStreak = tempStreak;

    // Current Streak (check if last completed is today or yesterday)
    const todayStr = new Date().toISOString().split("T")[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    const lastCompletedDate = completedDates[completedDates.length - 1];

    if (lastCompletedDate === todayStr || lastCompletedDate === yesterdayStr) {
      currentStreak = 1;
      let currTs = getDayTimestamp(lastCompletedDate);
      
      for (let i = completedDates.length - 2; i >= 0; i--) {
        const prevTs = getDayTimestamp(completedDates[i]);
        const diff = (currTs - prevTs) / MS_PER_DAY;
        if (Math.round(diff) === 1) {
          currentStreak++;
          currTs = prevTs;
        } else {
          break;
        }
      }
    } else {
      currentStreak = 0;
    }

    return { currentStreak, longestStreak };
  }

  // Generate array of last 30 dates for completion grid
  const last30Dates = useMemo(() => {
    const list = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      list.push(d.toISOString().split("T")[0]);
    }
    return list;
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-gray-500 dark:text-gray-400">Loading Habits...</div>
      </div>
    );
  }

  if (habitStats.length === 0) {
    return (
      <div className="text-center p-12 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl max-w-lg mx-auto mt-8 shadow-sm">
        <div className="text-4xl mb-4">🧘</div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">No active habits found</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          To start tracking habits, create or edit a task and check the "Track as Habit" option in the details panel!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          🔥 Habit Tracker
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {habitStats.map(({ task, totalCompletions, totalMin, avgMetricValue, currentStreak, longestStreak, completedDates, recentLogs }) => {
          const priorityColor = PRIORITY_COLORS[task.priority as TaskPriority] || "#6b7280";
          const board = boards.find((b) => b.id === task.boardId);

          return (
            <div key={task.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
              
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 truncate">{task.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] px-2 py-0.5 rounded-full text-white font-medium" style={{ backgroundColor: board?.color || "#94a3b8" }}>
                        {board?.name}
                      </span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">
                        Priority: <span style={{ color: priorityColor }} className="font-semibold">{task.priority}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-right">
                    <div className="bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 px-3 py-1.5 rounded-lg border border-orange-100 dark:border-orange-900/20 text-center shrink-0">
                      <div className="text-xs font-bold leading-none">{currentStreak}</div>
                      <div className="text-[8px] uppercase font-bold tracking-wider mt-0.5">Streak</div>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-lg border border-blue-100 dark:border-blue-900/20 text-center shrink-0">
                      <div className="text-xs font-bold leading-none">{longestStreak}</div>
                      <div className="text-[8px] uppercase font-bold tracking-wider mt-0.5">Best</div>
                    </div>
                  </div>
                </div>

                {/* Contribution Heatmap */}
                <div className="mt-4">
                  <span className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Last 30 Days</span>
                  <div className="flex flex-wrap gap-1.5 bg-gray-50 dark:bg-gray-900/30 p-2.5 rounded-lg border border-gray-100 dark:border-gray-700">
                    {last30Dates.map((dateStr) => {
                      const completed = completedDates.includes(dateStr);
                      const dObj = new Date(dateStr + "T12:00:00");
                      const label = `${dObj.toLocaleDateString("en-US", { month: "short", day: "numeric" })}: ${completed ? "Completed" : "No record"}`;
                      return (
                        <div
                          key={dateStr}
                          title={label}
                          className={`w-4.5 h-4.5 rounded-md transition-all ${
                            completed
                              ? "bg-green-500 dark:bg-green-600 shadow-sm shadow-green-500/20 scale-105"
                              : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Core Stats */}
                <div className="grid grid-cols-3 gap-3 mt-4 text-center">
                  <div className="bg-gray-50 dark:bg-gray-900/10 p-2 rounded-lg border border-gray-100 dark:border-gray-700/50">
                    <div className="text-sm font-bold text-gray-800 dark:text-gray-200">{totalCompletions}</div>
                    <div className="text-[9px] text-gray-400 dark:text-gray-500 uppercase tracking-wider mt-0.5">Completions</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900/10 p-2 rounded-lg border border-gray-100 dark:border-gray-700/50">
                    <div className="text-sm font-bold text-gray-800 dark:text-gray-200">{Math.round(totalMin / 60 * 10) / 10}h</div>
                    <div className="text-[9px] text-gray-400 dark:text-gray-500 uppercase tracking-wider mt-0.5">Time Done</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900/10 p-2 rounded-lg border border-gray-100 dark:border-gray-700/50">
                    <div className="text-sm font-bold text-gray-800 dark:text-gray-200">
                      {avgMetricValue !== null ? `${Math.round(avgMetricValue * 10) / 10}` : "—"}
                    </div>
                    <div className="text-[9px] text-gray-400 dark:text-gray-500 uppercase tracking-wider mt-0.5">
                      Avg {task.habitUnit || "Count"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent execution log */}
              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                <span className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Recent Session Logs</span>
                {recentLogs.length === 0 ? (
                  <div className="text-center text-[10px] text-gray-400 italic py-2">No completed sessions logged yet.</div>
                ) : (
                  <div className="space-y-1.5">
                    {recentLogs.map((log, index) => {
                      const logDate = new Date(log.date + "T12:00:00");
                      const formattedDate = logDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                      return (
                        <div key={index} className="flex justify-between items-start text-[11px] text-gray-600 dark:text-gray-400 bg-gray-50/50 dark:bg-gray-900/20 px-2 py-1.5 rounded border border-gray-100 dark:border-gray-700">
                          <div className="font-semibold text-gray-700 dark:text-gray-300 w-16">{formattedDate}</div>
                          <div className="flex-1 truncate">
                            {log.actualStartTime && log.actualEndTime ? (
                              <span>⏰ {log.actualStartTime} - {log.actualEndTime} ({log.actualMin}m)</span>
                            ) : (
                              <span>Completed</span>
                            )}
                            {log.notes && <span className="text-[10px] text-gray-400 block truncate mt-0.5">Notes: {log.notes}</span>}
                          </div>
                          {log.metricValue !== null && task.habitUnit && (
                            <div className="font-bold text-green-600 dark:text-green-400 shrink-0 pl-2">
                              +{log.metricValue} {task.habitUnit}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}
