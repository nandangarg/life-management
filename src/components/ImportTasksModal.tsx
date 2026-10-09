"use client";

import { useState, useRef, DragEvent } from "react";
import * as XLSX from "xlsx";
import { Category } from "@/types";

interface ImportTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardId: string;
  boardName?: string;
  categories: Category[];
  onSuccess: () => void;
}

interface ParsedTask {
  title: string;
  description?: string;
  categories?: string;
  priority?: string;
  status?: string;
  dueDate?: string;
  estimatedMin?: number;
}

export default function ImportTasksModal({
  isOpen,
  onClose,
  boardId,
  boardName = "Board",
  categories,
  onSuccess,
}: ImportTasksModalProps) {
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [parsedTasks, setParsedTasks] = useState<ParsedTask[]>([]);
  const [skippedCount, setSkippedCount] = useState<number>(0);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const toggleCategory = (id: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  // Download blank template
  const handleDownloadTemplate = (format: "xlsx" | "csv") => {
    const sampleCategory = categories.length > 0 ? categories[0].name : "Work";
    const templateData = [
      {
        Title: "Review quarterly goals",
        Description: "Align with project lead on upcoming milestones",
        Categories: sampleCategory,
        Priority: "HIGH",
        Status: "TODO",
        DueDate: new Date().toISOString().split("T")[0],
        EstimatedMinutes: 60,
      },
      {
        Title: "Team sync and status update",
        Description: "Quick weekly check-in",
        Categories: categories.length > 1 ? categories[1].name : sampleCategory,
        Priority: "MEDIUM",
        Status: "TODO",
        DueDate: "",
        EstimatedMinutes: 30,
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tasks");

    if (format === "xlsx") {
      XLSX.writeFile(wb, "tasks-import-template.xlsx");
    } else {
      XLSX.writeFile(wb, "tasks-import-template.csv", { bookType: "csv" });
    }
  };

  // Process File
  const processFile = (file: File) => {
    setErrorMsg("");
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary", cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        if (!worksheet) {
          setErrorMsg("Could not read sheet from the uploaded file.");
          return;
        }

        const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
          defval: "",
        });

        if (rawRows.length === 0) {
          setErrorMsg("No rows found in spreadsheet.");
          setParsedTasks([]);
          return;
        }

        const validTasks: ParsedTask[] = [];
        let emptyTitleCount = 0;

        for (const row of rawRows) {
          // Normalize row keys to lower-case trimmed for resilient column header matching
          const normalizedRow: Record<string, unknown> = {};
          for (const key of Object.keys(row)) {
            normalizedRow[key.trim().toLowerCase()] = row[key];
          }

          const rawTitle =
            normalizedRow["title"] ??
            normalizedRow["task"] ??
            normalizedRow["task title"] ??
            normalizedRow["name"];

          const title = typeof rawTitle === "string" ? rawTitle.trim() : String(rawTitle || "").trim();

          if (!title) {
            emptyTitleCount++;
            continue;
          }

          const rawDesc =
            normalizedRow["description"] ??
            normalizedRow["desc"] ??
            normalizedRow["notes"] ??
            normalizedRow["details"];
          const description = rawDesc ? String(rawDesc).trim() : undefined;

          const rawCat =
            normalizedRow["categories"] ??
            normalizedRow["category"] ??
            normalizedRow["labels"] ??
            normalizedRow["label"];
          const categoriesStr = rawCat ? String(rawCat).trim() : undefined;

          const rawPriority =
            normalizedRow["priority"] ??
            normalizedRow["prio"];
          const priority = rawPriority ? String(rawPriority).trim() : undefined;

          const rawStatus =
            normalizedRow["status"] ??
            normalizedRow["state"];
          const status = rawStatus ? String(rawStatus).trim() : undefined;

          // Parse Due Date
          const rawDue =
            normalizedRow["due date"] ??
            normalizedRow["duedate"] ??
            normalizedRow["due"] ??
            normalizedRow["date"];
          let dueDateStr: string | undefined = undefined;

          if (rawDue instanceof Date) {
            dueDateStr = rawDue.toISOString().split("T")[0];
          } else if (typeof rawDue === "string" && rawDue.trim()) {
            const parsed = new Date(rawDue.trim());
            if (!isNaN(parsed.getTime())) {
              dueDateStr = parsed.toISOString().split("T")[0];
            }
          }

          // Parse Estimated Minutes
          const rawEst =
            normalizedRow["estimated minutes"] ??
            normalizedRow["estimatedmin"] ??
            normalizedRow["estimated min"] ??
            normalizedRow["minutes"] ??
            normalizedRow["duration"];
          let estimatedMin: number | undefined = undefined;
          if (rawEst !== undefined && rawEst !== "") {
            const parsedNum = Number(rawEst);
            if (!isNaN(parsedNum) && parsedNum > 0) {
              estimatedMin = Math.round(parsedNum);
            }
          }

          validTasks.push({
            title,
            description,
            categories: categoriesStr,
            priority,
            status,
            dueDate: dueDateStr,
            estimatedMin,
          });
        }

        setParsedTasks(validTasks);
        setSkippedCount(emptyTitleCount);
        if (validTasks.length === 0) {
          setErrorMsg("No valid tasks found (all rows had empty titles).");
        }
      } catch (err) {
        console.error("Error parsing spreadsheet:", err);
        setErrorMsg("Failed to read file. Please ensure it is a valid Excel or CSV document.");
      }
    };

    reader.onerror = () => {
      setErrorMsg("Error reading uploaded file.");
    };

    reader.readAsBinaryString(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // Submit Import
  const handleImport = async () => {
    if (parsedTasks.length === 0) return;
    setIsImporting(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/tasks/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boardId,
          categoryIds: selectedCategoryIds,
          tasks: parsedTasks,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to import tasks");
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-gray-100 dark:border-gray-700 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700/80 shrink-0">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <span>📥</span> Import Tasks
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Import from Excel (.xlsx) or CSV into <span className="font-semibold text-gray-700 dark:text-gray-300">{boardName}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-sm p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Template Download Assistance */}
          <div className="bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/50 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <p className="font-semibold text-blue-900 dark:text-blue-200">Need a template?</p>
              <p className="text-blue-700 dark:text-blue-300 mt-0.5">
                Download a blank spreadsheet formatted with all standard columns.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleDownloadTemplate("xlsx")}
                className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-xs"
              >
                Template (.xlsx)
              </button>
              <button
                type="button"
                onClick={() => handleDownloadTemplate("csv")}
                className="px-2.5 py-1.5 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700 font-medium rounded-lg transition-colors"
              >
                Template (.csv)
              </button>
            </div>
          </div>

          {/* Bulk Category Assignment */}
          {categories.length > 0 && (
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200">
                Assign Categories to Imported Tasks (Optional)
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Any categories selected below will be applied to all imported tasks in addition to any specified in the spreadsheet&apos;s Categories column.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {categories.map((cat) => {
                  const checked = selectedCategoryIds.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleCategory(cat.id)}
                      className={`text-xs font-medium px-3 py-1 rounded-full border-2 transition-all cursor-pointer ${
                        checked
                          ? "text-white border-transparent shadow-xs"
                          : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-400"
                      }`}
                      style={checked ? { backgroundColor: cat.color, borderColor: cat.color } : undefined}
                    >
                      {cat.name} {checked && "✓"}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Upload Area */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200">
              Select or Drop Spreadsheet
            </label>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                isDragging
                  ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20"
                  : fileName
                  ? "border-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/10"
                  : "border-gray-300 dark:border-gray-600 hover:border-blue-400 bg-gray-50/50 dark:bg-gray-800/50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="flex flex-col items-center justify-center gap-1.5">
                <span className="text-3xl">{fileName ? "📄" : "📁"}</span>
                {fileName ? (
                  <>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{fileName}</p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 underline">Click to choose a different file</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Drag & drop your file here, or <span className="text-blue-600 dark:text-blue-400 font-semibold underline">browse</span>
                    </p>
                    <p className="text-xs text-gray-400">Supports .xlsx, .xls, and .csv files</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-xs font-medium">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Pre-import Summary & Preview */}
          {parsedTasks.length > 0 && (
            <div className="space-y-2 border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-gray-50/60 dark:bg-gray-900/40">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Ready to import: {parsedTasks.length} {parsedTasks.length === 1 ? "task" : "tasks"}
                </p>
                {skippedCount > 0 && (
                  <span className="text-xs text-amber-600 dark:text-amber-400">
                    ({skippedCount} blank rows skipped)
                  </span>
                )}
              </div>

              {/* Mini preview table */}
              <div className="mt-2 overflow-x-auto max-h-48 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-semibold uppercase">
                    <tr>
                      <th className="px-3 py-2">Title</th>
                      <th className="px-3 py-2">Categories</th>
                      <th className="px-3 py-2">Priority</th>
                      <th className="px-3 py-2">Due Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-gray-700 dark:text-gray-300">
                    {parsedTasks.slice(0, 5).map((t, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50">
                        <td className="px-3 py-1.5 font-medium max-w-[200px] truncate">{t.title}</td>
                        <td className="px-3 py-1.5 text-gray-500 max-w-[150px] truncate">
                          {t.categories || (selectedCategoryIds.length > 0 ? "From selection" : "—")}
                        </td>
                        <td className="px-3 py-1.5">{t.priority || "MEDIUM"}</td>
                        <td className="px-3 py-1.5">{t.dueDate || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedTasks.length > 5 && (
                <p className="text-[11px] text-gray-400 text-right">
                  + {parsedTasks.length - 5} more tasks
                </p>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700/80 bg-gray-50/50 dark:bg-gray-850 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isImporting}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={parsedTasks.length === 0 || isImporting}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            {isImporting ? (
              <>
                <span className="animate-spin inline-block h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full mr-1" />
                Importing...
              </>
            ) : (
              <>
                <span>📥</span> Import {parsedTasks.length > 0 ? `${parsedTasks.length} Tasks` : ""}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
