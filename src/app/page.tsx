"use client";

import { useState, useEffect, useCallback } from "react";
import { Board, TaskWithRelations, ScheduleWithTask } from "@/types";
import BoardView from "@/components/BoardView";
import BoardManager from "@/components/BoardManager";
import TaskForm from "@/components/TaskForm";
import CalendarView from "@/components/CalendarView";
import ScheduleForm from "@/components/ScheduleForm";

type Tab = "boards" | "calendar" | "settings";

export default function Home() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [schedules, setSchedules] = useState<ScheduleWithTask[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("boards");
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [calendarDate, setCalendarDate] = useState(new Date().toISOString().split("T")[0]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithRelations | null>(null);
  const [taskFormBoardId, setTaskFormBoardId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const fetchBoards = useCallback(async () => {
    const res = await fetch("/api/boards");
    const data = await res.json();
    setBoards(data);
    if (!activeBoardId && data.length > 0) {
      setActiveBoardId(data[0].id);
    }
    setLoading(false);
  }, [activeBoardId]);

  const fetchSchedules = useCallback(async () => {
    const res = await fetch(`/api/schedules?date=${calendarDate}`);
    const data = await res.json();
    setSchedules(data);
  }, [calendarDate]);

  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  useEffect(() => {
    if (activeTab === "calendar") {
      fetchSchedules();
    }
  }, [activeTab, calendarDate, fetchSchedules]);

  // Board CRUD
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

  const handleDeleteBoard = async (id: string) => {
    if (!confirm("Delete this board and all its tasks?")) return;
    await fetch(`/api/boards/${id}`, { method: "DELETE" });
    if (activeBoardId === id) setActiveBoardId(null);
    fetchBoards();
  };

  // Category CRUD
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

  // Task CRUD
  const handleAddTask = (boardId: string) => {
    setTaskFormBoardId(boardId);
    setEditingTask(null);
    setShowTaskForm(true);
  };

  const handleEditTask = (task: TaskWithRelations) => {
    setTaskFormBoardId(task.boardId);
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
        body: JSON.stringify(data),
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

  // Schedule CRUD
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

  // Seed
  const handleSeed = async () => {
    if (!confirm("This will reset all data and load sample data. Continue?")) return;
    await fetch("/api/seed", { method: "POST" });
    setActiveBoardId(null);
    fetchBoards();
  };

  const activeBoard = boards.find((b) => b.id === activeBoardId);
  const allTasks = boards.flatMap((b) => b.tasks);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Life Manager</h1>
          <nav className="flex gap-1">
            {(["boards", "calendar", "settings"] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm rounded-lg capitalize ${
                  activeTab === tab
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Boards Tab */}
        {activeTab === "boards" && (
          <>
            {boards.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-gray-500 mb-4">No boards yet. Create one or load sample data.</p>
                <button
                  onClick={handleSeed}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Load Sample Data
                </button>
              </div>
            ) : (
              <>
                {/* Board tabs */}
                <div className="flex gap-2 mb-6 border-b border-gray-200 pb-3">
                  {boards.map((board) => (
                    <button
                      key={board.id}
                      onClick={() => setActiveBoardId(board.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
                        activeBoardId === board.id
                          ? "text-white"
                          : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
                      }`}
                      style={
                        activeBoardId === board.id
                          ? { backgroundColor: board.color }
                          : undefined
                      }
                    >
                      {board.name}
                      <span className="text-xs opacity-75">({board.tasks.length})</span>
                    </button>
                  ))}
                </div>

                {/* Active board */}
                {activeBoard && (
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
          </>
        )}

        {/* Calendar Tab */}
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

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <div className="space-y-6">
            <BoardManager
              boards={boards}
              onAddBoard={handleAddBoard}
              onEditBoard={handleEditBoard}
              onDeleteBoard={handleDeleteBoard}
              onAddCategory={handleAddCategory}
              onEditCategory={handleEditCategory}
              onDeleteCategory={handleDeleteCategory}
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

      {/* Task Form Modal */}
      {showTaskForm && (
        <TaskForm
          boardId={taskFormBoardId}
          categories={boards.find((b) => b.id === taskFormBoardId)?.categories || []}
          task={editingTask}
          onSubmit={handleTaskSubmit}
          onClose={() => { setShowTaskForm(false); setEditingTask(null); }}
        />
      )}

      {/* Schedule Form Modal */}
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
