"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Board, TaskWithRelations, Category, TASK_STATUSES, TASK_PRIORITIES, STATUS_LABELS, PRIORITY_COLORS, TaskStatus, TaskPriority } from "@/types";

interface FlatTask extends TaskWithRelations {
  boardName: string;
  boardColor: string;
}

type SortKey = "title" | "boardName" | "categories" | "status" | "priority" | "dueDate" | "estimatedMin" | "createdAt" | "actions";
type SortDir = "asc" | "desc";

const PRIORITY_ORDER: Record<TaskPriority, number> = { LOW: 0, MEDIUM: 1, HIGH: 2, URGENT: 3 };
const STATUS_ORDER: Record<TaskStatus, number> = { TODO: 0, IN_PROGRESS: 1, DONE: 2 };

function compare(a: FlatTask, b: FlatTask, key: SortKey): number {
  switch (key) {
    case "priority":
      return PRIORITY_ORDER[a.priority as TaskPriority] - PRIORITY_ORDER[b.priority as TaskPriority];
    case "status":
      return STATUS_ORDER[a.status as TaskStatus] - STATUS_ORDER[b.status as TaskStatus];
    case "dueDate":
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    case "estimatedMin":
      return (a.estimatedMin ?? -1) - (b.estimatedMin ?? -1);
    case "categories":
      return (a.categories[0]?.name ?? "").localeCompare(b.categories[0]?.name ?? "");
    case "actions": {
      const aRatio = a.actions.length ? a.actions.filter(x => x.isCompleted).length / a.actions.length : -1;
      const bRatio = b.actions.length ? b.actions.filter(x => x.isCompleted).length / b.actions.length : -1;
      return aRatio - bRatio;
    }
    default:
      return String(a[key as keyof FlatTask] ?? "").localeCompare(String(b[key as keyof FlatTask] ?? ""));
  }
}

export default function TasksPage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterBoard, setFilterBoard] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    fetch("/api/boards")
      .then((r) => r.json())
      .then((data) => { setBoards(data); setLoading(false); });
  }, []);

  const allTasks = useMemo<FlatTask[]>(() => {
    return boards.flatMap((board) =>
      board.tasks.map((task) => ({ ...task, boardName: board.name, boardColor: board.color }))
    );
  }, [boards]);

  const allCategories = useMemo(() => {
    const seen = new Set<string>();
    const result: Category[] = [];
    boards.forEach((b) => b.categories.forEach((c) => { if (!seen.has(c.id)) { seen.add(c.id); result.push(c); } }));
    return result;
  }, [boards]);

  const visibleCategories = useMemo(() => {
    if (!filterBoard) return allCategories;
    return allCategories.filter((c) => c.boardId === filterBoard);
  }, [allCategories, filterBoard]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allTasks.filter((t) => {
      if (q && !t.title.toLowerCase().includes(q)) return false;
      if (filterBoard && t.boardId !== filterBoard) return false;
      if (filterCategory && !t.categories.some((c) => c.id === filterCategory)) return false;
      if (filterStatus && t.status !== filterStatus) return false;
      if (filterPriority && t.priority !== filterPriority) return false;
      return true;
    });
  }, [allTasks, search, filterBoard, filterCategory, filterStatus, filterPriority]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      const c = compare(a, b, sortKey);
      return sortDir === "asc" ? c : -c;
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span className="ml-1 text-gray-300">↕</span>;
    return <span className="ml-1 text-blue-600">{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  function Th({ col, label }: { col: SortKey; label: string }) {
    return (
      <th
        className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:bg-gray-100 whitespace-nowrap"
        onClick={() => handleSort(col)}
      >
        {label}<SortIcon col={col} />
      </th>
    );
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="text-gray-500">Loading…</div></div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-800">← Life Manager</Link>
          <h1 className="text-xl font-bold text-gray-900">All Tasks</h1>
          <span className="text-sm text-gray-400 ml-auto">{sorted.length} of {allTasks.length} tasks</span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4 flex flex-wrap gap-3 items-center">
          <input
            type="text"
            placeholder="Search tasks…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
          />
          <select
            value={filterBoard}
            onChange={(e) => { setFilterBoard(e.target.value); setFilterCategory(""); }}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All boards</option>
            {boards.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={visibleCategories.length === 0}
          >
            <option value="">All categories</option>
            {visibleCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All statuses</option>
            {TASK_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All priorities</option>
            {TASK_PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>)}
          </select>
          {(search || filterBoard || filterCategory || filterStatus || filterPriority) && (
            <button
              onClick={() => { setSearch(""); setFilterBoard(""); setFilterCategory(""); setFilterStatus(""); setFilterPriority(""); }}
              className="text-sm text-gray-500 hover:text-gray-800 underline"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
          {sorted.length === 0 ? (
            <div className="text-center py-16 text-gray-400">No tasks match your filters.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <Th col="title" label="Title" />
                  <Th col="boardName" label="Board" />
                  <Th col="categories" label="Categories" />
                  <Th col="status" label="Status" />
                  <Th col="priority" label="Priority" />
                  <Th col="actions" label="Actions" />
                  <Th col="dueDate" label="Due Date" />
                  <Th col="estimatedMin" label="Est." />
                  <Th col="createdAt" label="Created" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sorted.map((task) => {
                  const totalActions = task.actions.length;
                  const completedActions = task.actions.filter((a) => a.isCompleted).length;
                  return (
                    <tr key={task.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2.5 max-w-xs">
                        <Link href={`/tasks/${task.id}`} className="font-medium text-gray-900 hover:text-blue-600 truncate block">
                          {task.title}
                        </Link>
                        {task.description && <div className="text-xs text-gray-400 truncate">{task.description}</div>}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: task.boardColor }} />
                          {task.boardName}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        {task.categories.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {task.categories.map((c) => (
                              <span key={c.id} className="inline-block text-xs px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: c.color }}>
                                {c.name}
                              </span>
                            ))}
                          </div>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          task.status === "DONE" ? "bg-green-100 text-green-700" :
                          task.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-700" :
                          "bg-gray-100 text-gray-600"
                        }`}>
                          {STATUS_LABELS[task.status as TaskStatus]}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PRIORITY_COLORS[task.priority as TaskPriority] }} />
                          {task.priority.charAt(0) + task.priority.slice(1).toLowerCase()}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-xs">
                        {totalActions > 0 ? (
                          <span className={completedActions === totalActions ? "text-green-600 font-medium" : "text-gray-500"}>
                            ✓ {completedActions}/{totalActions}
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-gray-500">
                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-gray-500">
                        {task.estimatedMin != null ? `${task.estimatedMin}m` : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-gray-400 text-xs">
                        {new Date(task.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
