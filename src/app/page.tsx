"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { Board, TaskWithRelations, ScheduleWithTask } from "@/types";
import TaskTable from "@/components/TaskTable";
import BoardView from "@/components/BoardView";
import BoardManager from "@/components/BoardManager";
import TaskForm from "@/components/TaskForm";
import CalendarView from "@/components/CalendarView";
import ScheduleForm from "@/components/ScheduleForm";

type Tab = "tasks" | "kanban" | "calendar" | "settings";

const BOARD_KEY = "life-manager-active-board";

function readStoredBoardId(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(BOARD_KEY) ?? "";
}

export default function Home() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [schedules, setSchedules] = useState<ScheduleWithTask[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("tasks");
  const [activeBoardId, setActiveBoardId] = useState<string>(readStoredBoardId);
  const [calendarDate, setCalendarDate] = useState(new Date().toISOString().split("T")[0]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithRelations | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchBoards = useCallback(async () => {
    const res = await fetch("/api/boards");
    const data: Board[] = await res.json();
    setBoards(data);
    setLoading(false);
  }, []);

  const fetchSchedules = useCallback(async () => {
    const res = await fetch(`/api/schedules?date=${calendarDate}`);
    const data = await res.json();
    setSchedules(data);
  }, [calendarDate]);

  useEffect(() => { fetchBoards(); }, [fetchBoards]);

  useEffect(() => {
    if (activeTab === "calendar") fetchSchedules();
  }, [activeTab, calendarDate, fetchSchedules]);

  // After boards load, validate stored board id and fall back to first visible
  useEffect(() => {
    if (boards.length === 0) return;
    const visible = boards.filter(b => !b.isHidden);
    if (visible.length === 0) return;
    const stored = readStoredBoardId();
    const valid = visible.some(b => b.id === stored);
    if (!valid) {
      setActiveBoardId(visible[0].id);
      localStorage.setItem(BOARD_KEY, visible[0].id);
    }
  }, [boards]);

  function handleBoardChange(id: string) {
    setActiveBoardId(id);
    localStorage.setItem(BOARD_KEY, id);
  }

  // ── Board CRUD ─────────────────────────────────────────────────────────────

  const handleAddBoard = async (data: { name: string; color: string }) => {
    await fetch("/api/boards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    fetchBoards();
  };

  const handleEditBoard = async (id: string, data: { name: string; color: string }) => {
    await fetch(`/api/boards/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    fetchBoards();
  };

  const handleToggleHidden = async (id: string, isHidden: boolean) => {
    await fetch(`/api/boards/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isHidden }),
    });
    // If we just hid the active board, move to another visible board
    if (isHidden && id === activeBoardId) {
      const nextVisible = boards.filter(b => !b.isHidden && b.id !== id)[0];
      if (nextVisible) handleBoardChange(nextVisible.id);
    }
    fetchBoards();
  };

  const handleDeleteBoard = async (id: string) => {
    if (!confirm("Delete this board and all its tasks?")) return;
    await fetch(`/api/boards/${id}`, { method: "DELETE" });
    if (id === activeBoardId) {
      const next = boards.filter(b => !b.isHidden && b.id !== id)[0];
      if (next) handleBoardChange(next.id);
    }
    fetchBoards();
  };

  // ── Category CRUD ──────────────────────────────────────────────────────────

  const handleAddCategory = async (data: { boardId: string; name: string; color: string }) => {
    await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    fetchBoards();
  };

  const handleEditCategory = async (id: string, data: { name: string; color: string }) => {
    await fetch(`/api/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    fetchBoards();
  };

  const handleDeleteCategory = async (id: string) => {
    await fetch(`/api/categories/${id}`, { method: "DELETE" });
    fetchBoards();
  };

  const handleRandomizeCategoryColors = async () => {
    await fetch("/api/categories", { method: "PATCH" });
    fetchBoards();
  };

  // ── Task CRUD ──────────────────────────────────────────────────────────────

  const handleAddTask = () => {
    setEditingTask(null);
    setShowTaskForm(true);
  };

  const handleEditTask = (task: TaskWithRelations) => {
    setEditingTask(task);
    setShowTaskForm(true);
  };

  const handleTaskSubmit = async (data: Record<string, unknown>) => {
    if (editingTask) {
      await fetch(`/api/tasks/${editingTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } else {
      await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, boardId: activeBoardId }),
      });
    }
    setShowTaskForm(false);
    setEditingTask(null);
    fetchBoards();
  };

  const handleStatusChange = async (taskId: string, status: string) => {
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchBoards();
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Delete this task?")) return;
    await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    fetchBoards();
  };

  // ── Schedule CRUD ──────────────────────────────────────────────────────────

  const handleScheduleSubmit = async (data: Record<string, unknown>) => {
    await fetch("/api/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setShowScheduleForm(false);
    fetchSchedules();
  };

  const handleMarkComplete = async (scheduleId: string) => {
    await fetch(`/api/schedules/${scheduleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completedAt: new Date().toISOString() }),
    });
    fetchSchedules();
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    await fetch(`/api/schedules/${scheduleId}`, { method: "DELETE" });
    fetchSchedules();
  };

  const handleSeed = async () => {
    if (!confirm("This will reset all data and load sample data. Continue?")) return;
    await fetch("/api/seed", { method: "POST" });
    localStorage.removeItem(BOARD_KEY);
    setActiveBoardId("");
    fetchBoards();
  };

  // ── Derived ────────────────────────────────────────────────────────────────

  const visibleBoards = boards.filter(b => !b.isHidden);
  const activeBoard = boards.find(b => b.id === activeBoardId);
  // Calendar is global — all tasks across all boards
  const allTasks = boards.flatMap(b => b.tasks);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading…</div>
      </div>
    );
  }

  const TAB_LABELS: Record<Tab, string> = {
    tasks: "Tasks",
    kanban: "Kanban",
    calendar: "Calendar",
    settings: "Settings",
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <h1 className="text-xl font-bold text-gray-900 shrink-0">Life Manager</h1>

          {/* Board selector */}
          {visibleBoards.length > 0 && (
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: activeBoard?.color ?? "#6366f1" }}
              />
              <select
                value={activeBoardId}
                onChange={(e) => handleBoardChange(e.target.value)}
                className="bg-transparent text-sm font-medium text-gray-800 focus:outline-none cursor-pointer pr-1"
              >
                {visibleBoards.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Tab nav */}
          <nav className="flex gap-1 ml-auto">
            {(["tasks", "kanban", "calendar", "settings"] as Tab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm rounded-lg ${
                  activeTab === tab
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {TAB_LABELS[tab]}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* ── Main ───────────────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 py-6">

        {/* Tasks tab — main view */}
        {activeTab === "tasks" && (
          <>
            {!activeBoard ? (
              <div className="text-center py-16">
                <p className="text-gray-500 mb-4">No boards yet. Create one in Settings or load sample data.</p>
                <button onClick={handleSeed} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                  Load Sample Data
                </button>
              </div>
            ) : (
              <Suspense>
                <TaskTable
                  tasks={activeBoard.tasks}
                  categories={activeBoard.categories}
                  onAddTask={handleAddTask}
                />
              </Suspense>
            )}
          </>
        )}

        {/* Kanban tab — secondary, single board only */}
        {activeTab === "kanban" && (
          <>
            {!activeBoard ? (
              <div className="text-center py-16 text-gray-400">Select a board to view its kanban.</div>
            ) : (
              <BoardView
                board={activeBoard}
                onAddTask={handleAddTask}
                onEditTask={handleEditTask}
                onStatusChange={handleStatusChange}
                onDeleteTask={handleDeleteTask}
              />
            )}
          </>
        )}

        {/* Calendar tab — global across all boards */}
        {activeTab === "calendar" && (
          <CalendarView
            date={calendarDate}
            schedules={schedules}
            onDateChange={setCalendarDate}
            onAddSchedule={() => setShowScheduleForm(true)}
            onMarkComplete={handleMarkComplete}
            onDeleteSchedule={handleDeleteSchedule}
          />
        )}

        {/* Settings tab */}
        {activeTab === "settings" && (
          <div className="space-y-6">
            <BoardManager
              boards={boards}
              onAddBoard={handleAddBoard}
              onEditBoard={handleEditBoard}
              onDeleteBoard={handleDeleteBoard}
              onToggleHidden={handleToggleHidden}
              onAddCategory={handleAddCategory}
              onEditCategory={handleEditCategory}
              onDeleteCategory={handleDeleteCategory}
              onRandomizeCategoryColors={handleRandomizeCategoryColors}
            />
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Data</h3>
              <button
                onClick={handleSeed}
                className="text-sm px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
              >
                Reset & Load Sample Data
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ── Task form modal ─────────────────────────────────────────────────── */}
      {showTaskForm && activeBoard && (
        <TaskForm
          boardId={activeBoard.id}
          categories={activeBoard.categories}
          task={editingTask}
          onSubmit={handleTaskSubmit}
          onClose={() => { setShowTaskForm(false); setEditingTask(null); }}
        />
      )}

      {/* ── Schedule form modal ─────────────────────────────────────────────── */}
      {showScheduleForm && (
        <ScheduleForm
          tasks={allTasks}
          date={calendarDate}
          onSubmit={handleScheduleSubmit}
          onClose={() => setShowScheduleForm(false)}
        />
      )}
    </div>
  );
}
