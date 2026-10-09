"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import * as XLSX from "xlsx";
import {
  TaskWithRelations, Category,
  TASK_STATUSES, TASK_PRIORITIES,
  STATUS_LABELS, PRIORITY_COLORS,
  TaskStatus, TaskPriority,
} from "@/types";
import ImportTasksModal from "./ImportTasksModal";

type SortKey = "title" | "categories" | "status" | "priority" | "dueDate" | "estimatedMin" | "actions" | "createdAt";
type SortDir = "asc" | "desc";

const PRIORITY_ORDER: Record<TaskPriority, number> = { LOW: 0, MEDIUM: 1, HIGH: 2, URGENT: 3 };
const STATUS_ORDER: Record<TaskStatus, number> = { TODO: 0, IN_PROGRESS: 1, DONE: 2 };

function compare(a: TaskWithRelations, b: TaskWithRelations, key: SortKey): number {
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
      const ra = a.actions.length ? a.actions.filter(x => x.isCompleted).length / a.actions.length : -1;
      const rb = b.actions.length ? b.actions.filter(x => x.isCompleted).length / b.actions.length : -1;
      return ra - rb;
    }
    default:
      return String(a[key as keyof TaskWithRelations] ?? "").localeCompare(String(b[key as keyof TaskWithRelations] ?? ""));
  }
}

interface TaskTableProps {
  tasks: TaskWithRelations[];
  categories: Category[];
  boardId?: string;
  boardName?: string;
  onAddTask?: () => void;
  onImportSuccess?: () => void;
}

interface ThProps {
  col: SortKey;
  label: string;
  className?: string;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
}

function Th({ col, label, className = "", sortKey, sortDir, onSort }: ThProps) {
  const active = sortKey === col;
  return (
    <th
      onClick={() => onSort(col)}
      className={`px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-700 whitespace-nowrap ${className}`}
    >
      {label}
      <span className={`ml-1 ${active ? "text-blue-600" : "text-gray-300 dark:text-gray-600"}`}>
        {active ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
      </span>
    </th>
  );
}

export default function TaskTable({
  tasks,
  categories,
  boardId,
  boardName,
  onAddTask,
  onImportSuccess,
}: TaskTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [filterCategory, setFilterCategory] = useState(() => searchParams.get("cat") ?? "");
  const [filterStatus, setFilterStatus] = useState(() => searchParams.get("status") ?? "");
  const [filterPriority, setFilterPriority] = useState(() => searchParams.get("priority") ?? "");
  const [focus, setFocus] = useState(() => searchParams.get("focus") === "1");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (filterCategory) params.set("cat", filterCategory);
    if (filterStatus) params.set("status", filterStatus);
    if (filterPriority) params.set("priority", filterPriority);
    if (focus) params.set("focus", "1");
    const qs = params.toString();
    router.replace(pathname + (qs ? "?" + qs : ""), { scroll: false });
  }, [search, filterCategory, filterStatus, filterPriority, focus, router, pathname]);

  function exitFocus() { setFocus(false); }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return tasks.filter((t) => {
      if (focus) {
        return t.priority === "URGENT" && t.status !== "DONE";
      }
      if (q && !t.title.toLowerCase().includes(q)) return false;
      if (filterCategory && !t.categories.some((c) => c.id === filterCategory)) return false;
      if (filterStatus === "ACTIVE") {
        if (t.status === "DONE") return false;
      } else if (filterStatus && t.status !== filterStatus) return false;
      if (filterPriority && t.priority !== filterPriority) return false;
      return true;
    });
  }, [tasks, search, filterCategory, filterStatus, filterPriority, focus]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      const c = compare(a, b, sortKey);
      return sortDir === "asc" ? c : -c;
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  }

  const hasFilters = search || filterCategory || filterStatus || filterPriority || focus;

  const exportTasks = (format: "xlsx" | "csv") => {
    if (sorted.length === 0) return;

    const data = sorted.map((t) => ({
      Title: t.title,
      Description: t.description || "",
      Categories: t.categories.map((c) => c.name).join(", "),
      Priority: t.priority,
      Status: t.status,
      DueDate: t.dueDate ? t.dueDate.split("T")[0] : "",
      EstimatedMinutes: t.estimatedMin ?? "",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tasks");

    const dateStr = new Date().toISOString().split("T")[0];
    const safeName = (boardName || "tasks").toLowerCase().replace(/[^a-z0-9_-]/g, "_");
    const filename = `${safeName}-${dateStr}.${format}`;

    if (format === "xlsx") {
      XLSX.writeFile(wb, filename);
    } else {
      XLSX.writeFile(wb, filename, { bookType: "csv" });
    }
  };

  const filterInputCls = "border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3 flex flex-wrap gap-3 items-center">
        <button
          onClick={() => setFocus(f => !f)}
          className={`text-sm px-3 py-1.5 rounded-lg font-medium border transition-colors ${
            focus
              ? "bg-red-500 text-white border-red-500 hover:bg-red-600"
              : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-red-400 hover:text-red-500"
          }`}
          title="Urgent + not done"
        >
          {focus ? "⚡ Focus" : "⚡ Focus"}
        </button>

        <input
          type="text"
          placeholder="Search tasks…"
          value={search}
          onChange={(e) => { exitFocus(); setSearch(e.target.value); }}
          className={`${filterInputCls} w-52`}
        />

        {categories.length > 0 && (
          <select
            value={filterCategory}
            onChange={(e) => { exitFocus(); setFilterCategory(e.target.value); }}
            className={filterInputCls}
          >
            <option value="">All categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}

        <select
          value={filterStatus}
          onChange={(e) => { exitFocus(); setFilterStatus(e.target.value); }}
          className={filterInputCls}
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Todo</option>
          {TASK_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>

        <select
          value={filterPriority}
          onChange={(e) => { exitFocus(); setFilterPriority(e.target.value); }}
          className={filterInputCls}
        >
          <option value="">All priorities</option>
          {TASK_PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>)}
        </select>

        {hasFilters && (
          <button
            onClick={() => { setSearch(""); setFilterCategory(""); setFilterStatus(""); setFilterPriority(""); setFocus(false); }}
            className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 underline"
          >
            Clear
          </button>
        )}

        <div className="flex items-center gap-2 ml-auto">
          <span className="text-sm text-gray-400 dark:text-gray-500 mr-1">
            {sorted.length} of {tasks.length}
          </span>

          {/* Export dropdown */}
          <div className="relative" ref={exportMenuRef}>
            <button
              type="button"
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={sorted.length === 0}
              className="text-sm px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-650 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 font-medium transition-colors cursor-pointer"
              title="Export current filtered list"
            >
              <span>📤</span> Export
              <span className="text-[10px]">▼</span>
            </button>
            {showExportMenu && (
              <div className="absolute right-0 mt-1 w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-20 py-1 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    exportTasks("xlsx");
                    setShowExportMenu(false);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 cursor-pointer text-gray-800 dark:text-gray-200"
                >
                  <span>📊</span> Excel (.xlsx)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    exportTasks("csv");
                    setShowExportMenu(false);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 cursor-pointer text-gray-800 dark:text-gray-200"
                >
                  <span>📄</span> CSV (.csv)
                </button>
              </div>
            )}
          </div>

          {/* Import button */}
          {boardId && (
            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              className="text-sm px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-650 flex items-center gap-1.5 font-medium transition-colors cursor-pointer"
              title="Import tasks from Excel or CSV"
            >
              <span>📥</span> Import
            </button>
          )}

          {/* Add Task button */}
          {onAddTask && (
            <button
              type="button"
              onClick={onAddTask}
              className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium cursor-pointer"
            >
              + Add Task
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-x-auto">
        {sorted.length === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500">
            {tasks.length === 0 ? "No tasks yet. Add one to get started." : "No tasks match your filters."}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <tr>
                <Th col="title" label="Title" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <Th col="categories" label="Categories" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <Th col="status" label="Status" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <Th col="priority" label="Priority" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <Th col="actions" label="Actions" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <Th col="dueDate" label="Due" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <Th col="estimatedMin" label="Est." sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <Th col="createdAt" label="Created" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {sorted.map((task) => {
                const total = task.actions.length;
                const done = task.actions.filter(a => a.isCompleted).length;
                return (
                  <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer" onClick={() => window.location.href = `/tasks/${task.id}`}>
                    <td className="px-3 py-2.5 max-w-xs" onClick={e => e.stopPropagation()}>
                      <Link href={`/tasks/${task.id}`} className="font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 block truncate">
                        {task.title}
                      </Link>
                      {task.description && (
                        <div className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">{task.description}</div>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {task.categories.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {task.categories.map(c => (
                            <span key={c.id} className="inline-block text-xs px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: c.color }}>
                              {c.name}
                            </span>
                          ))}
                        </div>
                      ) : <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        task.status === "DONE" ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" :
                        task.status === "IN_PROGRESS" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" :
                        "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                      }`}>
                        {STATUS_LABELS[task.status as TaskStatus]}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PRIORITY_COLORS[task.priority as TaskPriority] }} />
                        <span className="text-gray-700 dark:text-gray-300 text-xs">{task.priority.charAt(0) + task.priority.slice(1).toLowerCase()}</span>
                      </span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-xs">
                      {total > 0 ? (
                        <span className={done === total ? "text-green-600 dark:text-green-400 font-medium" : "text-gray-500 dark:text-gray-400"}>
                          ✓ {done}/{total}
                        </span>
                      ) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : <span className="text-gray-300 dark:text-gray-600">—</span>}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                      {task.estimatedMin != null ? `${task.estimatedMin}m` : <span className="text-gray-300 dark:text-gray-600">—</span>}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-xs text-gray-400 dark:text-gray-500">
                      {new Date(task.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {boardId && (
        <ImportTasksModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          boardId={boardId}
          boardName={boardName}
          categories={categories}
          onSuccess={() => onImportSuccess?.()}
        />
      )}
    </div>
  );
}
