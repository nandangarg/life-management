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

  // Inline edit state
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState("");

  // New action / comment
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
    const res = await fetch(`/api/tasks/${id}`);
    const data = await res.json();
    setTask(data);
    setLoading(false);
  }, []);

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

  // ── Title ──────────────────────────────────────────────────────────────────
  function startEditTitle() {
    setTitleDraft(task!.title);
    setEditingTitle(true);
  }
  async function saveTitle() {
    if (!titleDraft.trim()) return;
    await patchTask({ title: titleDraft.trim() });
    setEditingTitle(false);
  }

  // ── Description ────────────────────────────────────────────────────────────
  function startEditDesc() {
    setDescDraft(task!.description || "");
    setEditingDesc(true);
  }
  async function saveDesc() {
    await patchTask({ description: descDraft.trim() || null });
    setEditingDesc(false);
  }

  // ── Actions ────────────────────────────────────────────────────────────────
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

  // ── Comments ───────────────────────────────────────────────────────────────
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

  if (loading || !task) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  const sortedActions = [...task.actions].sort((a, b) => a.position - b.position);
  const completedActions = sortedActions.filter((a) => a.isCompleted).length;
  const isAutoComment = (text: string) => text.startsWith("✓ Completed action:");

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3 text-sm text-gray-500">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-gray-400 hover:text-gray-700 shrink-0"
          >
            ← Back
          </button>
          <span className="text-gray-300">|</span>
          <Link href="/" className="hover:text-gray-800 inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: task.board.color }} />
            {task.board.name}
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-medium truncate max-w-xs">{task.title}</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex gap-6 items-start">

          {/* ── Left: main content ─────────────────────────────────────────── */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* Title */}
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              {editingTitle ? (
                <div className="flex gap-2 items-center">
                  <input
                    ref={titleInputRef}
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") setEditingTitle(false); }}
                    className="flex-1 text-xl font-bold border border-blue-300 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button onClick={saveTitle} className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save</button>
                  <button onClick={() => setEditingTitle(false)} className="text-sm px-3 py-1.5 text-gray-500 hover:bg-gray-100 rounded-lg">Cancel</button>
                </div>
              ) : (
                <div className="flex items-start gap-2 group">
                  <h1 className="text-xl font-bold text-gray-900 flex-1">{task.title}</h1>
                  <button
                    onClick={startEditTitle}
                    className="opacity-0 group-hover:opacity-100 text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded"
                  >
                    ✎
                  </button>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Description</h2>
                {!editingDesc && (
                  <button onClick={startEditDesc} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded">
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
                    className="w-full border border-blue-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex gap-2">
                    <button onClick={saveDesc} className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save</button>
                    <button onClick={() => setEditingDesc(false)} className="text-sm px-3 py-1.5 text-gray-500 hover:bg-gray-100 rounded-lg">Cancel</button>
                  </div>
                </div>
              ) : (
                <p
                  onClick={startEditDesc}
                  className="text-sm text-gray-600 whitespace-pre-wrap cursor-pointer hover:bg-gray-50 rounded p-1 -m-1 min-h-[2rem]"
                >
                  {task.description || <span className="text-gray-400 italic">Add a description…</span>}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                  Actions
                  {sortedActions.length > 0 && (
                    <span className="ml-2 font-normal text-gray-400">
                      {completedActions}/{sortedActions.length} completed
                    </span>
                  )}
                </h2>
              </div>

              {sortedActions.length > 0 && (
                <table className="w-full text-sm mb-4">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-1.5 pr-2 text-xs font-medium text-gray-400 w-6"></th>
                      <th className="text-left py-1.5 text-xs font-medium text-gray-400">Action</th>
                      <th className="text-left py-1.5 px-3 text-xs font-medium text-gray-400 whitespace-nowrap">Completed at</th>
                      <th className="py-1.5 text-xs font-medium text-gray-400 w-20"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {sortedActions.map((action, idx) => (
                      <tr key={action.id} className="group hover:bg-gray-50">
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
                                className="flex-1 border border-blue-300 rounded px-2 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                autoFocus
                              />
                              <button onClick={() => saveActionEdit(action)} className="text-xs text-blue-600 hover:text-blue-800">Save</button>
                              <button onClick={() => setEditingActionId(null)} className="text-xs text-gray-400 hover:text-gray-600">✕</button>
                            </div>
                          ) : (
                            <span
                              className={`cursor-pointer ${action.isCompleted ? "line-through text-gray-400" : "text-gray-800"}`}
                              onDoubleClick={() => { setEditingActionId(action.id); setEditingActionText(action.text); }}
                              title="Double-click to edit"
                            >
                              {action.text}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-xs text-gray-400 whitespace-nowrap">
                          {action.completedAt
                            ? new Date(action.completedAt).toLocaleString()
                            : "—"}
                        </td>
                        <td className="py-2">
                          <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100">
                            <button
                              onClick={() => moveAction(action, "up")}
                              disabled={idx === 0}
                              className="text-xs px-1.5 py-0.5 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-30"
                              title="Move up"
                            >↑</button>
                            <button
                              onClick={() => moveAction(action, "down")}
                              disabled={idx === sortedActions.length - 1}
                              className="text-xs px-1.5 py-0.5 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-30"
                              title="Move down"
                            >↓</button>
                            <button
                              onClick={() => deleteAction(action.id)}
                              className="text-xs px-1.5 py-0.5 rounded bg-red-50 hover:bg-red-100 text-red-500"
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
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                Comments <span className="font-normal text-gray-400">({task.comments.length})</span>
              </h2>

              <div className="space-y-1 mb-4">
                {task.comments.length === 0 && (
                  <p className="text-sm text-gray-400 italic">No comments yet.</p>
                )}
                {task.comments.map((comment: TaskComment) => (
                  <div
                    key={comment.id}
                    className={`rounded-lg px-3 py-2 text-sm group ${
                      isAutoComment(comment.text)
                        ? "bg-green-50 border border-green-100"
                        : "bg-gray-50 border border-gray-100"
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
                          className="flex-1 border border-blue-300 rounded px-2 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          autoFocus
                        />
                        <button onClick={() => saveCommentEdit(comment.id)} className="text-xs text-blue-600 hover:text-blue-800">Save</button>
                        <button onClick={() => setEditingCommentId(null)} className="text-xs text-gray-400 hover:text-gray-600">✕</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <p className={`flex-1 ${isAutoComment(comment.text) ? "text-green-800" : "text-gray-800"}`}>
                          {comment.text}
                        </p>
                        <span className="text-xs text-gray-400 shrink-0 whitespace-nowrap">
                          {new Date(comment.createdAt).toLocaleString()}
                        </span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 shrink-0">
                          <button
                            onClick={() => { setEditingCommentId(comment.id); setEditingCommentText(comment.text); }}
                            className="text-xs text-gray-400 hover:text-gray-600 px-1"
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
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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

            <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Status</label>
                <select
                  value={task.status}
                  onChange={(e) => patchTask({ status: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {TASK_STATUSES.map((s) => (
                    <option key={s} value={s}>{STATUS_LABELS[s as TaskStatus]}</option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Priority</label>
                <select
                  value={task.priority}
                  onChange={(e) => patchTask({ priority: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Board</label>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: task.board.color }} />
                  {task.board.name}
                </div>
              </div>

              {/* Categories */}
              {task.board.categories.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Categories</label>
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
                            active ? "text-white border-transparent" : "bg-white border-gray-300 text-gray-600 hover:border-gray-400"
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
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Due Date</label>
                <input
                  type="date"
                  defaultValue={task.dueDate ? task.dueDate.split("T")[0] : ""}
                  onBlur={(e) => patchTask({ dueDate: e.target.value || null })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Estimated */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Estimated (min)</label>
                <input
                  type="number"
                  defaultValue={task.estimatedMin ?? ""}
                  onBlur={(e) => patchTask({ estimatedMin: e.target.value ? parseInt(e.target.value) : null })}
                  min="0"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Tags</label>
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
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Timestamps */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-1 text-xs text-gray-400">
              <div>Created {new Date(task.createdAt).toLocaleString()}</div>
              <div>Updated {new Date(task.updatedAt).toLocaleString()}</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
