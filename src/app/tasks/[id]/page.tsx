"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  TaskDetail, TaskAction, TaskComment,
  TASK_STATUSES, TASK_PRIORITIES, STATUS_LABELS, PRIORITY_COLORS,
  TaskStatus, TaskPriority,
} from "@/types";

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [taskId, setTaskId] = useState<string | null>(null);
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState("");

  const [newActionText, setNewActionText] = useState("");
  const [editingActionId, setEditingActionId] = useState<string | null>(null);
  const [editingActionText, setEditingActionText] = useState("");
  const [newCommentText, setNewCommentText] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const titleInputRef = useRef<HTMLInputElement>(null);
  const descInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    params.then((p) => setTaskId(p.id));
  }, [params]);

  const fetchTask = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/tasks/${id}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch task: status ${res.status}`);
      }
      const data = await res.json();
      setTask(data);
    } catch (err) {
      console.error(err);
      router.push("/");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (taskId) fetchTask(taskId);
  }, [taskId, fetchTask]);

  useEffect(() => {
    if (editingTitle && titleInputRef.current) titleInputRef.current.focus();
  }, [editingTitle]);

  useEffect(() => {
    if (editingDesc && descInputRef.current) descInputRef.current.focus();
  }, [editingDesc]);

  async function patchTask(data: Record<string, unknown>) {
    if (!taskId) return;
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const updated = await res.json();
    setTask(updated);
  }

  function startEditTitle() {
    setTitleDraft(task!.title);
    setEditingTitle(true);
  }
  async function saveTitle() {
    if (!titleDraft.trim()) return;
    await patchTask({ title: titleDraft.trim() });
    setEditingTitle(false);
  }

  function startEditDesc() {
    setDescDraft(task!.description || "");
    setEditingDesc(true);
  }
  async function saveDesc() {
    await patchTask({ description: descDraft.trim() || null });
    setEditingDesc(false);
  }

  async function addAction() {
    if (!newActionText.trim() || !taskId) return;
    setSubmitting(true);
    await fetch(`/api/tasks/${taskId}/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: newActionText.trim() }),
    });
    setNewActionText("");
    setSubmitting(false);
    fetchTask(taskId);
  }

  async function toggleAction(action: TaskAction) {
    if (!taskId) return;
    await fetch(`/api/tasks/${taskId}/actions/${action.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isCompleted: !action.isCompleted }),
    });
    fetchTask(taskId);
  }

  async function deleteAction(actionId: string) {
    if (!taskId) return;
    await fetch(`/api/tasks/${taskId}/actions/${actionId}`, { method: "DELETE" });
    fetchTask(taskId);
  }

  async function saveActionEdit(action: TaskAction) {
    if (!taskId || !editingActionText.trim()) return;
    await fetch(`/api/tasks/${taskId}/actions/${action.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: editingActionText.trim() }),
    });
    setEditingActionId(null);
    fetchTask(taskId);
  }

  async function moveAction(action: TaskAction, direction: "up" | "down") {
    if (!task || !taskId) return;
    const sorted = [...task.actions].sort((a, b) => a.position - b.position);
    const idx = sorted.findIndex((a) => a.id === action.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const other = sorted[swapIdx];
    await Promise.all([
      fetch(`/api/tasks/${taskId}/actions/${action.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position: other.position }),
      }),
      fetch(`/api/tasks/${taskId}/actions/${other.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position: action.position }),
      }),
    ]);
    fetchTask(taskId);
  }

  async function addComment() {
    if (!newCommentText.trim() || !taskId) return;
    setSubmitting(true);
    await fetch(`/api/tasks/${taskId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: newCommentText.trim() }),
    });
    setNewCommentText("");
    setSubmitting(false);
    fetchTask(taskId);
  }

  async function deleteComment(commentId: string) {
    if (!taskId) return;
    await fetch(`/api/tasks/${taskId}/comments/${commentId}`, { method: "DELETE" });
    fetchTask(taskId);
  }

  async function saveCommentEdit(commentId: string) {
    if (!taskId || !editingCommentText.trim()) return;
    await fetch(`/api/tasks/${taskId}/comments/${commentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: editingCommentText.trim() }),
    });
    setEditingCommentId(null);
    fetchTask(taskId);
  }

  async function deleteTask() {
    if (!taskId) return;
    if (!confirm("Are you sure you want to delete this task? This action cannot be undone.")) return;
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/");
      } else {
        alert("Failed to delete task.");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred while deleting the task.");
    }
  }

  const parsedRule = (() => {
    const defaultRule = { frequency: "week" as const, interval: 1, weekdays: [] as string[], until: "" };
    if (!task || !task.recurrenceRule) return defaultRule;
    try {
      if (task.recurrenceRule.startsWith("{")) {
        const parsed = JSON.parse(task.recurrenceRule);
        return {
          frequency: parsed.frequency || "week",
          interval: parsed.interval || 1,
          weekdays: parsed.weekdays || [],
          until: parsed.until || "",
        };
      } else {
        if (task.recurrenceRule === "DAILY") {
          return { frequency: "day" as const, interval: 1, weekdays: [], until: "" };
        } else if (task.recurrenceRule.startsWith("WEEKLY:")) {
          const day = task.recurrenceRule.split(":")[1];
          return { frequency: "week" as const, interval: 1, weekdays: [day], until: "" };
        }
      }
    } catch (err) {
      console.error(err);
    }
    return defaultRule;
  })();

  const updateRecurrenceRule = (updates: Partial<{
    frequency: "day" | "week" | "month" | "year";
    interval: number;
    weekdays: string[];
    until: string | null;
  }>) => {
    const nextRule = {
      frequency: updates.frequency !== undefined ? updates.frequency : parsedRule.frequency,
      interval: updates.interval !== undefined ? updates.interval : parsedRule.interval,
      weekdays: updates.weekdays !== undefined ? updates.weekdays : parsedRule.weekdays,
      until: updates.until !== undefined ? updates.until : (parsedRule.until || null),
    };
    
    if (nextRule.frequency !== "week") {
      delete (nextRule as any).weekdays;
    }
    
    patchTask({ recurrenceRule: JSON.stringify(nextRule) });
  };

  if (loading || !task) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  const sortedActions = [...task.actions].sort((a, b) => a.position - b.position);
  const completedActions = sortedActions.filter((a) => a.isCompleted).length;
  const isAutoComment = (text: string) => text.startsWith("✓ Completed action:");

  const sidebarInputCls = "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 shrink-0"
            >
              ← Back
            </button>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <Link href="/" className="hover:text-gray-800 dark:hover:text-gray-100 inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: task.board.color }} />
              {task.board.name}
            </Link>
            <span>/</span>
            <span className="text-gray-900 dark:text-gray-100 font-medium truncate max-w-xs">{task.title}</span>
          </div>
          <button
            onClick={deleteTask}
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-500 hover:text-red-600 font-medium transition-colors cursor-pointer"
          >
            🗑 Delete Task
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex gap-6 items-start">

          {/* ── Left: main content ─────────────────────────────────────────── */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* Title */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
              {editingTitle ? (
                <div className="flex gap-2 items-center">
                  <input
                    ref={titleInputRef}
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") setEditingTitle(false); }}
                    className="flex-1 text-xl font-bold border border-blue-300 dark:border-blue-500 rounded-lg px-3 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button onClick={saveTitle} className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save</button>
                  <button onClick={() => setEditingTitle(false)} className="text-sm px-3 py-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Cancel</button>
                </div>
              ) : (
                <div className="flex items-start gap-2 group">
                  <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex-1">{task.title}</h1>
                  <button
                    onClick={startEditTitle}
                    className="opacity-0 group-hover:opacity-100 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 px-2 py-1 rounded"
                  >
                    ✎
                  </button>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Description</h2>
                {!editingDesc && (
                  <button onClick={startEditDesc} className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 px-2 py-1 rounded">
                    ✎
                  </button>
                )}
              </div>
              {editingDesc ? (
                <div className="space-y-2">
                  <textarea
                    ref={descInputRef}
                    value={descDraft}
                    onChange={(e) => setDescDraft(e.target.value)}
                    rows={5}
                    className="w-full border border-blue-300 dark:border-blue-500 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex gap-2">
                    <button onClick={saveDesc} className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save</button>
                    <button onClick={() => setEditingDesc(false)} className="text-sm px-3 py-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Cancel</button>
                  </div>
                </div>
              ) : (
                <p
                  onClick={startEditDesc}
                  className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded p-1 -m-1 min-h-[2rem]"
                >
                  {task.description || <span className="text-gray-400 dark:text-gray-500 italic">Add a description…</span>}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  Actions
                  {sortedActions.length > 0 && (
                    <span className="ml-2 font-normal text-gray-400 dark:text-gray-500">
                      {completedActions}/{sortedActions.length} completed
                    </span>
                  )}
                </h2>
              </div>

              {sortedActions.length > 0 && (
                <table className="w-full text-sm mb-4">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-700">
                      <th className="text-left py-1.5 pr-2 text-xs font-medium text-gray-400 dark:text-gray-500 w-6"></th>
                      <th className="text-left py-1.5 text-xs font-medium text-gray-400 dark:text-gray-500">Action</th>
                      <th className="text-left py-1.5 px-3 text-xs font-medium text-gray-400 dark:text-gray-500 whitespace-nowrap">Completed at</th>
                      <th className="py-1.5 text-xs font-medium text-gray-400 dark:text-gray-500 w-20"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                    {sortedActions.map((action, idx) => (
                      <tr key={action.id} className="group hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="py-2 pr-2">
                          <input
                            type="checkbox"
                            checked={action.isCompleted}
                            onChange={() => toggleAction(action)}
                            className="w-4 h-4 accent-blue-600 cursor-pointer"
                          />
                        </td>
                        <td className="py-2">
                          {editingActionId === action.id ? (
                            <div className="flex gap-2">
                              <input
                                value={editingActionText}
                                onChange={(e) => setEditingActionText(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") saveActionEdit(action); if (e.key === "Escape") setEditingActionId(null); }}
                                className="flex-1 border border-blue-300 dark:border-blue-500 rounded px-2 py-0.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                autoFocus
                              />
                              <button onClick={() => saveActionEdit(action)} className="text-xs text-blue-600 hover:text-blue-800">Save</button>
                              <button onClick={() => setEditingActionId(null)} className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">✕</button>
                            </div>
                          ) : (
                            <span
                              className={`cursor-pointer ${action.isCompleted ? "line-through text-gray-400 dark:text-gray-500" : "text-gray-800 dark:text-gray-200"}`}
                              onDoubleClick={() => { setEditingActionId(action.id); setEditingActionText(action.text); }}
                              title="Double-click to edit"
                            >
                              {action.text}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                          {action.completedAt
                            ? new Date(action.completedAt).toLocaleString()
                            : "—"}
                        </td>
                        <td className="py-2">
                          <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100">
                            <button
                              onClick={() => moveAction(action, "up")}
                              disabled={idx === 0}
                              className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 disabled:opacity-30"
                              title="Move up"
                            >↑</button>
                            <button
                              onClick={() => moveAction(action, "down")}
                              disabled={idx === sortedActions.length - 1}
                              className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 disabled:opacity-30"
                              title="Move down"
                            >↓</button>
                            <button
                              onClick={() => deleteAction(action.id)}
                              className="text-xs px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-500"
                              title="Delete"
                            >✕</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Add action */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newActionText}
                  onChange={(e) => setNewActionText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addAction(); }}
                  placeholder="Add an action…"
                  className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={addAction}
                  disabled={!newActionText.trim() || submitting}
                  className="text-sm px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Comments */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-4">
                Comments <span className="font-normal text-gray-400 dark:text-gray-500">({task.comments.length})</span>
              </h2>

              <div className="space-y-1 mb-4">
                {task.comments.length === 0 && (
                  <p className="text-sm text-gray-400 dark:text-gray-500 italic">No comments yet.</p>
                )}
                {task.comments.map((comment: TaskComment) => (
                  <div
                    key={comment.id}
                    className={`rounded-lg px-3 py-2 text-sm group ${
                      isAutoComment(comment.text)
                        ? "bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/50"
                        : "bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600"
                    }`}
                  >
                    {editingCommentId === comment.id ? (
                      <div className="flex gap-2 items-center">
                        <input
                          value={editingCommentText}
                          onChange={(e) => setEditingCommentText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveCommentEdit(comment.id);
                            if (e.key === "Escape") setEditingCommentId(null);
                          }}
                          className="flex-1 border border-blue-300 dark:border-blue-500 rounded px-2 py-0.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          autoFocus
                        />
                        <button onClick={() => saveCommentEdit(comment.id)} className="text-xs text-blue-600 hover:text-blue-800">Save</button>
                        <button onClick={() => setEditingCommentId(null)} className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">✕</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <p className={`flex-1 ${isAutoComment(comment.text) ? "text-green-800 dark:text-green-300" : "text-gray-800 dark:text-gray-200"}`}>
                          {comment.text}
                        </p>
                        <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0 whitespace-nowrap">
                          {new Date(comment.createdAt).toLocaleString()}
                        </span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 shrink-0">
                          <button
                            onClick={() => { setEditingCommentId(comment.id); setEditingCommentText(comment.text); }}
                            className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 px-1"
                            title="Edit"
                          >✎</button>
                          <button
                            onClick={() => deleteComment(comment.id)}
                            className="text-xs text-red-400 hover:text-red-600 px-1"
                            title="Delete"
                          >✕</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <textarea
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  rows={3}
                  placeholder="Add a comment…"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={addComment}
                  disabled={!newCommentText.trim() || submitting}
                  className="text-sm px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Save comment
                </button>
              </div>
            </div>
          </div>

          {/* ── Right: metadata sidebar ────────────────────────────────────── */}
          <div className="w-64 shrink-0 space-y-4">

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Status</label>
                <select
                  value={task.status}
                  onChange={(e) => patchTask({ status: e.target.value })}
                  className={sidebarInputCls}
                >
                  {TASK_STATUSES.map((s) => (
                    <option key={s} value={s}>{STATUS_LABELS[s as TaskStatus]}</option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Priority</label>
                <select
                  value={task.priority}
                  onChange={(e) => patchTask({ priority: e.target.value })}
                  className={sidebarInputCls}
                >
                  {TASK_PRIORITIES.map((p) => (
                    <option key={p} value={p} style={{ color: PRIORITY_COLORS[p as TaskPriority] }}>
                      {p.charAt(0) + p.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Board */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Board</label>
                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: task.board.color }} />
                  {task.board.name}
                </div>
              </div>

              {/* Categories */}
              {task.board.categories.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Categories</label>
                  <div className="flex flex-wrap gap-1.5">
                    {task.board.categories.map((cat) => {
                      const active = task.categories.some((c) => c.id === cat.id);
                      return (
                        <button
                          key={cat.id}
                          onClick={() => {
                            const next = active
                              ? task.categories.filter((c) => c.id !== cat.id).map((c) => c.id)
                              : [...task.categories.map((c) => c.id), cat.id];
                            patchTask({ categoryIds: next });
                          }}
                          className={`text-xs px-2.5 py-1 rounded-full border-2 transition-all ${
                            active ? "text-white border-transparent" : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500"
                          }`}
                          style={active ? { backgroundColor: cat.color, borderColor: cat.color } : undefined}
                        >
                          {cat.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Due Date */}
              <div>
                <label className="block text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Due Date</label>
                <input
                  type="date"
                  defaultValue={task.dueDate ? task.dueDate.split("T")[0] : ""}
                  onBlur={(e) => patchTask({ dueDate: e.target.value || null })}
                  className={sidebarInputCls}
                />
              </div>

              {/* Time defaults & IsFixed */}
              <div className="space-y-3 pt-1">
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={task.isFixed}
                    onChange={(e) => patchTask({ isFixed: e.target.checked })}
                    className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  Fixed Time (Immovable)
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Start Time</label>
                    <input
                      type="time"
                      value={task.startTime || ""}
                      onChange={(e) => patchTask({ startTime: e.target.value || null })}
                      className={sidebarInputCls}
                      step="300"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">End Time</label>
                    <input
                      type="time"
                      value={task.endTime || ""}
                      onChange={(e) => patchTask({ endTime: e.target.value || null })}
                      className={sidebarInputCls}
                      step="300"
                    />
                  </div>
                </div>
              </div>

              {/* Recurring Routine */}
              <div className="space-y-3 pt-1">
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={task.isRecurring}
                    onChange={(e) => patchTask({ isRecurring: e.target.checked })}
                    className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  Is Recurring Routine
                </label>

                {task.isRecurring && (
                  <div className="space-y-3 bg-gray-50 dark:bg-gray-900/50 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs">
                    <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                      <span>Repeat every</span>
                      <select
                        value={parsedRule.interval}
                        onChange={(e) => updateRecurrenceRule({ interval: parseInt(e.target.value) })}
                        className="border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        {Array.from({ length: 30 }, (_, i) => i + 1).map((val) => (
                          <option key={val} value={val}>{val}</option>
                        ))}
                      </select>
                      <select
                        value={parsedRule.frequency}
                        onChange={(e) => updateRecurrenceRule({ frequency: e.target.value as any })}
                        className="border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="day">day{parsedRule.interval > 1 && "s"}</option>
                        <option value="week">week{parsedRule.interval > 1 && "s"}</option>
                        <option value="month">month{parsedRule.interval > 1 && "s"}</option>
                        <option value="year">year{parsedRule.interval > 1 && "s"}</option>
                      </select>
                    </div>

                    {parsedRule.frequency === "week" && (
                      <div>
                        <span className="block text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Repeat on</span>
                        <div className="flex flex-wrap gap-1">
                          {[
                            { label: "M", value: "MON" },
                            { label: "T", value: "TUE" },
                            { label: "W", value: "WED" },
                            { label: "T", value: "THU" },
                            { label: "F", value: "FRI" },
                            { label: "S", value: "SAT" },
                            { label: "S", value: "SUN" },
                          ].map((d) => {
                            const active = parsedRule.weekdays.includes(d.value);
                            return (
                              <button
                                key={d.value}
                                type="button"
                                onClick={() => {
                                  const nextDays = active
                                    ? parsedRule.weekdays.filter((val: string) => val !== d.value)
                                    : [...parsedRule.weekdays, d.value];
                                  updateRecurrenceRule({ weekdays: nextDays });
                                }}
                                className={`w-6 h-6 rounded-full text-[10px] font-bold transition-all border ${
                                  active
                                    ? "bg-blue-600 text-white border-transparent"
                                    : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                                }`}
                              >
                                {d.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Until</label>
                      <input
                        type="date"
                        value={parsedRule.until ? parsedRule.until.split("T")[0] : ""}
                        onChange={(e) => updateRecurrenceRule({ until: e.target.value || null })}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Estimated */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Estimated (min)</label>
                <input
                  type="number"
                  defaultValue={task.estimatedMin ?? ""}
                  onBlur={(e) => patchTask({ estimatedMin: e.target.value ? parseInt(e.target.value) : null })}
                  min="0"
                  className={sidebarInputCls}
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Tags</label>
                <input
                  type="text"
                  defaultValue={JSON.parse(task.tags || "[]").join(", ")}
                  onBlur={(e) => {
                    const tags = e.target.value
                      .split(",")
                      .map((t) => t.trim())
                      .filter(Boolean);
                    patchTask({ tags: JSON.stringify(tags) });
                  }}
                  placeholder="tag1, tag2"
                  className={sidebarInputCls}
                />
              </div>
            </div>

            {/* Timestamps */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-1 text-xs text-gray-400 dark:text-gray-500">
              <div>Created {new Date(task.createdAt).toLocaleString()}</div>
              <div>Updated {new Date(task.updatedAt).toLocaleString()}</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
