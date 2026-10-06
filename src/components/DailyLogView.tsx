"use client";

import { useState, useEffect, useMemo } from "react";
import { Board, ScheduleWithTask, TimeLogWithTask } from "@/types";
import LogWorkModal from "./LogWorkModal";

interface DailyLogViewProps {
  date: string;
  onDateChange: (date: string) => void;
  boards: Board[];
  schedules: ScheduleWithTask[];
}

interface ActiveWorkStash {
  title: string;
  taskId?: string | null;
  startTime: string; // HH:mm
  startDate: string; // YYYY-MM-DD
}

const STASH_KEY = "life_mgmt_active_work_stash";

function getNowTimeStr(): string {
  const now = new Date();
  const h = now.getHours().toString().padStart(2, "0");
  const m = Math.floor(now.getMinutes() / 5) * 5;
  const mStr = (m === 60 ? 55 : m).toString().padStart(2, "0");
  return `${h}:${mStr}`;
}

export default function DailyLogView({
  date,
  onDateChange,
  boards,
  schedules,
}: DailyLogViewProps) {
  const [logs, setLogs] = useState<TimeLogWithTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<TimeLogWithTask | null>(null);

  // Zero-CPU Active Work Stash (stored in localStorage)
  const [activeStash, setActiveStash] = useState<ActiveWorkStash | null>(null);
  const [quickTitle, setQuickTitle] = useState("");
  const [quickTaskId, setQuickTaskId] = useState("");
  const [editingStartTime, setEditingStartTime] = useState(false);

  // Load active work stash on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STASH_KEY);
      if (saved) {
        setActiveStash(JSON.parse(saved));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const saveStash = (stash: ActiveWorkStash | null) => {
    setActiveStash(stash);
    if (stash) {
      localStorage.setItem(STASH_KEY, JSON.stringify(stash));
    } else {
      localStorage.removeItem(STASH_KEY);
    }
  };

  // Fetch logs for current date
  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/logs?date=${date}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error("Failed fetching logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [date]);

  // Date shifts
  const shiftDay = (days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    onDateChange(d.toISOString().split("T")[0]);
  };

  const isToday = date === new Date().toISOString().split("T")[0];

  // Start activity action
  const handleStartActivity = () => {
    const finalTitle = quickTitle.trim() ||
      (quickTaskId ? boards.flatMap(b => b.tasks).find(t => t.id === quickTaskId)?.title : "") ||
      "Deep Work";

    const stash: ActiveWorkStash = {
      title: finalTitle,
      taskId: quickTaskId || null,
      startTime: getNowTimeStr(),
      startDate: new Date().toISOString().split("T")[0],
    };
    saveStash(stash);
    setQuickTitle("");
    setQuickTaskId("");
  };

  // Stop & Log action
  const handleStopAndLog = () => {
    if (!activeStash) return;
    setEditingLog({
      id: "",
      title: activeStash.title,
      taskId: activeStash.taskId || null,
      date: activeStash.startDate,
      startTime: activeStash.startTime,
      endTime: getNowTimeStr(),
      durationMin: 0,
      notes: null,
      userId: null,
      createdAt: "",
      updatedAt: "",
      task: null,
    });
    setModalOpen(true);
  };

  // Save log (new or edit)
  const handleSaveLog = async (data: {
    id?: string;
    title: string;
    taskId?: string | null;
    date: string;
    startTime: string;
    endTime: string;
    durationMin: number;
    notes?: string | null;
  }) => {
    if (data.id) {
      // Edit existing
      await fetch(`/api/logs/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } else {
      // Create new
      await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      // Clear stash if finishing current active work
      if (activeStash) {
        saveStash(null);
      }
    }
    fetchLogs();
  };

  const handleDeleteLog = async (id: string) => {
    if (!confirm("Are you sure you want to delete this log entry?")) return;
    await fetch(`/api/logs/${id}`, { method: "DELETE" });
    fetchLogs();
  };

  // Quick log from scheduled task
  const handleQuickLogSchedule = (schedule: ScheduleWithTask) => {
    setEditingLog({
      id: "",
      title: schedule.task.title,
      taskId: schedule.taskId,
      date: schedule.date,
      startTime: schedule.actualStartTime || schedule.startTime,
      endTime: schedule.actualEndTime || schedule.endTime,
      durationMin: schedule.actualMin || 0,
      notes: schedule.notes || null,
      userId: null,
      createdAt: "",
      updatedAt: "",
      task: null,
    });
    setModalOpen(true);
  };

  // Stats
  const totalMin = useMemo(() => {
    return logs.reduce((acc, curr) => acc + (curr.durationMin || 0), 0);
  }, [logs]);

  const totalHours = Math.floor(totalMin / 60);
  const remainingMin = totalMin % 60;

  const boardStats = useMemo(() => {
    const map: Record<string, { name: string; color: string; min: number }> = {};
    for (const log of logs) {
      const bName = log.task?.board?.name || "Unplanned / Ad-hoc";
      const bColor = log.task?.board?.color || "#6b7280";
      if (!map[bName]) {
        map[bName] = { name: bName, color: bColor, min: 0 };
      }
      map[bName].min += log.durationMin || 0;
    }
    return Object.values(map).sort((a, b) => b.min - a.min);
  }, [logs]);

  // Filter schedules for current date that haven't already been logged with the exact same title & time
  const daySchedules = useMemo(() => {
    return schedules.filter((s) => s.date === date);
  }, [schedules, date]);

  const allTasks = useMemo(() => {
    return boards.flatMap((b) => b.tasks);
  }, [boards]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* ── Top Bar: Date Nav & Quick Action ──────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Date Selector */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-start">
          <button
            onClick={() => shiftDay(-1)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
            title="Previous Day"
          >
            ◀
          </button>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={date}
              onChange={(e) => onDateChange(e.target.value)}
              className="text-base font-bold bg-transparent border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            />
            {!isToday && (
              <button
                onClick={() => onDateChange(new Date().toISOString().split("T")[0])}
                className="text-xs px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 font-semibold rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
              >
                Today
              </button>
            )}
          </div>
          <button
            onClick={() => shiftDay(1)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
            title="Next Day"
          >
            ▶
          </button>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={() => {
              setEditingLog(null);
              setModalOpen(true);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>+</span> Log Work Manually
          </button>
        </div>
      </div>

      {/* ── Active Work Stash Bar (Zero-CPU Live Logger) ───────────────────── */}
      {activeStash ? (
        <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-blue-950/40 rounded-2xl p-4 sm:p-5 border-2 border-emerald-500/40 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <div>
              <div className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wide">
                Active Task in Progress
              </div>
              <div className="text-base font-bold text-gray-900 dark:text-gray-100">
                {activeStash.title}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-0.5">
                <span>Started at:</span>
                {editingStartTime ? (
                  <input
                    type="time"
                    value={activeStash.startTime}
                    onChange={(e) => {
                      const updated = { ...activeStash, startTime: e.target.value };
                      saveStash(updated);
                    }}
                    onBlur={() => setEditingStartTime(false)}
                    autoFocus
                    className="border border-emerald-400 rounded px-1.5 py-0.2 text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                ) : (
                  <span
                    onClick={() => setEditingStartTime(true)}
                    className="font-bold text-gray-800 dark:text-gray-200 cursor-pointer underline hover:text-emerald-600"
                    title="Click to edit start time"
                  >
                    {activeStash.startTime} ✎
                  </span>
                )}
                <span>(No background battery/CPU drain)</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => {
                if (confirm("Discard this active tracking session?")) saveStash(null);
              }}
              className="px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 font-medium transition-colors"
            >
              Discard
            </button>
            <button
              onClick={handleStopAndLog}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>⏹</span> Stop & Log Work
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-3">
          <div className="flex-1 w-full sm:w-auto flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleStartActivity();
              }}
              placeholder="What are you starting to work on? (e.g. Q2 Roadmap, Customer Call...)"
              className="flex-1 border border-gray-300 dark:border-gray-600 rounded-xl px-3.5 py-2 text-sm bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <select
              value={quickTaskId}
              onChange={(e) => {
                setQuickTaskId(e.target.value);
                if (e.target.value) {
                  const t = allTasks.find((item) => item.id === e.target.value);
                  if (t) setQuickTitle(t.title);
                }
              }}
              className="border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-xs bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 focus:outline-none max-w-xs"
            >
              <option value="">— Or pick task —</option>
              {allTasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleStartActivity}
            className="w-full sm:w-auto px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
          >
            <span>▶</span> Start Activity
          </button>
        </div>
      )}

      {/* ── Summary Stats Card ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 shadow-xs">
          <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
            Total Time Logged
          </div>
          <div className="text-2xl font-black text-gray-900 dark:text-gray-100 mt-1">
            {totalHours}h {remainingMin}m
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {totalMin} total minutes recorded
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 shadow-xs">
          <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
            Logged Activities
          </div>
          <div className="text-2xl font-black text-gray-900 dark:text-gray-100 mt-1">
            {logs.length}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {logs.length === 1 ? "1 session recorded" : `${logs.length} sessions recorded`}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 shadow-xs">
          <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">
            Time by Project / Area
          </div>
          {boardStats.length === 0 ? (
            <div className="text-xs text-gray-400 italic">No activity data yet</div>
          ) : (
            <div className="space-y-1.5">
              {boardStats.slice(0, 3).map((b) => (
                <div key={b.name} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 truncate text-gray-700 dark:text-gray-300">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: b.color }} />
                    <span className="truncate">{b.name}</span>
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100 shrink-0 ml-2">
                    {Math.floor(b.min / 60)}h {b.min % 60}m
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Today's Scheduled Tasks (Quick Import) ────────────────────────── */}
      {daySchedules.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
              <span>📅</span> Planned For Today ({daySchedules.length} items)
            </h4>
            <span className="text-xs text-gray-400">Click &apos;+ Quick Log&apos; to record execution</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {daySchedules.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700/80 bg-gray-50/60 dark:bg-gray-700/30 text-xs"
              >
                <div className="truncate flex-1">
                  <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {s.task.title}
                  </div>
                  <div className="text-gray-500 dark:text-gray-400 text-[11px]">
                    {s.startTime} - {s.endTime}
                  </div>
                </div>
                <button
                  onClick={() => handleQuickLogSchedule(s)}
                  className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/70 font-semibold rounded-lg shrink-0 transition-colors cursor-pointer"
                >
                  + Log
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Chronological Day Timeline ────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
          <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base flex items-center gap-2">
            <span>📖</span> Daily Log & Journal Timeline
          </h3>
          <span className="text-xs text-gray-400 font-medium">
            {logs.length} {logs.length === 1 ? "entry" : "entries"}
          </span>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading timeline...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <div className="text-4xl">📝</div>
            <div className="text-base font-semibold text-gray-700 dark:text-gray-300">
              No entries logged for this date
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
              Start an activity using the button above as you work, or log past meetings and chores retroactively.
            </p>
            <button
              onClick={() => {
                setEditingLog(null);
                setModalOpen(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors inline-block mt-2 cursor-pointer"
            >
              + Log Work Now
            </button>
          </div>
        ) : (
          <div className="relative pl-6 sm:pl-8 space-y-4 before:absolute before:top-3 before:bottom-3 before:left-2.5 sm:before:left-3.5 before:w-0.5 before:bg-gray-200 dark:before:bg-gray-700">
            {logs.map((log) => {
              const bColor = log.task?.board?.color || "#94a3b8";
              const bName = log.task?.board?.name;

              return (
                <div
                  key={log.id}
                  className="relative group bg-gray-50/70 dark:bg-gray-700/30 hover:bg-white dark:hover:bg-gray-700/60 p-4 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 hover:shadow-md transition-all"
                >
                  {/* Timeline bullet dot */}
                  <div
                    className="absolute -left-[27px] sm:-left-[31px] top-4 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-gray-800 shadow-xs"
                    style={{ backgroundColor: bColor }}
                  />

                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div className="space-y-1 flex-1 min-w-0">
                      {/* Time badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-md bg-gray-200/80 dark:bg-gray-600 text-gray-800 dark:text-gray-200">
                          {log.startTime} – {log.endTime}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                          {Math.floor(log.durationMin / 60) > 0 ? `${Math.floor(log.durationMin / 60)}h ` : ""}
                          {log.durationMin % 60}m
                        </span>
                        {bName && (
                          <span
                            className="text-[11px] font-medium px-2 py-0.5 rounded-full text-white truncate max-w-[140px]"
                            style={{ backgroundColor: bColor }}
                          >
                            {bName}
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h4 className="text-base font-bold text-gray-900 dark:text-gray-100 pt-0.5">
                        {log.title}
                      </h4>

                      {/* Notes / Execution thoughts */}
                      {log.notes && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap pt-1 font-normal leading-relaxed">
                          {log.notes}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 sm:opacity-0 group-hover:opacity-100 transition-opacity self-end sm:self-start">
                      <button
                        onClick={() => {
                          setEditingLog(log);
                          setModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                        title="Edit Entry"
                      >
                        ✎
                      </button>
                      <button
                        onClick={() => handleDeleteLog(log.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                        title="Delete Entry"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Log Work Modal ────────────────────────────────────────────────── */}
      <LogWorkModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingLog(null);
        }}
        onSave={handleSaveLog}
        initialLog={editingLog}
        defaultDate={date}
        boards={boards}
      />
    </div>
  );
}
