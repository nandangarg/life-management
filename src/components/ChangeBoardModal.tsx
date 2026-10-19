"use client";

import { useState, useEffect } from "react";
import { Board, Category } from "@/types";

interface ChangeBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBoard: {
    id: string;
    name: string;
    color: string;
  };
  currentCategories: Category[];
  onConfirm: (targetBoardId: string, categoryIds: string[]) => Promise<void>;
}

export default function ChangeBoardModal({
  isOpen,
  onClose,
  currentBoard,
  currentCategories,
  onConfirm,
}: ChangeBoardModalProps) {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loadingBoards, setLoadingBoards] = useState(true);
  const [selectedBoardId, setSelectedBoardId] = useState<string>("");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg("");
    setLoadingBoards(true);

    fetch("/api/boards")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load boards");
        return res.json();
      })
      .then((data: Board[]) => {
        setBoards(data);
        const destinationBoards = data.filter((b) => b.id !== currentBoard.id);
        if (destinationBoards.length > 0) {
          setSelectedBoardId(destinationBoards[0].id);
        } else {
          setSelectedBoardId("");
        }
        setSelectedCategoryIds([]);
      })
      .catch((err) => {
        console.error(err);
        setErrorMsg("Failed to load available boards. Please try again.");
      })
      .finally(() => {
        setLoadingBoards(false);
      });
  }, [isOpen, currentBoard.id]);

  if (!isOpen) return null;

  const destinationBoards = boards.filter((b) => b.id !== currentBoard.id);
  const targetBoard = boards.find((b) => b.id === selectedBoardId);
  const targetCategories = targetBoard?.categories || [];

  const handleBoardChange = (newBoardId: string) => {
    setSelectedBoardId(newBoardId);
    setSelectedCategoryIds([]); // Reset categories for the new board
  };

  const toggleCategory = (catId: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBoardId) return;

    setIsSubmitting(true);
    setErrorMsg("");
    try {
      await onConfirm(selectedBoardId, selectedCategoryIds);
      onClose();
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : "Failed to move task");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700/80 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔀</span>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Move Task to Another Board
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-sm p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          {errorMsg && (
            <div className="p-3 text-xs bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 rounded-lg">
              {errorMsg}
            </div>
          )}

          {/* Current Board & Categories Info */}
          <div className="bg-gray-50 dark:bg-gray-750/50 rounded-xl p-3.5 border border-gray-200/80 dark:border-gray-700">
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
              Current Location
            </div>
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: currentBoard.color }}
              />
              <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                {currentBoard.name}
              </span>
            </div>
            {currentCategories.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-gray-200/60 dark:border-gray-700/60">
                <span className="text-xs text-gray-400 self-center mr-1">Categories:</span>
                {currentCategories.map((c) => (
                  <span
                    key={c.id}
                    className="text-xs px-2 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: c.color }}
                  >
                    {c.name}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-xs text-gray-400 mt-1">No categories assigned</div>
            )}
          </div>

          {/* Destination Board Selector */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200">
              Select Destination Board
            </label>

            {loadingBoards ? (
              <div className="py-4 text-center text-sm text-gray-500">Loading boards...</div>
            ) : destinationBoards.length === 0 ? (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 rounded-xl border border-amber-200 dark:border-amber-800 text-xs">
                You have no other boards available. Create another board first before moving this task.
              </div>
            ) : (
              <div>
                <select
                  value={selectedBoardId}
                  onChange={(e) => handleBoardChange(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {destinationBoards.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} {b.isHidden ? "(Hidden)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Destination Categories (Optional) */}
          {!loadingBoards && destinationBoards.length > 0 && targetBoard && (
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200">
                Select Categories on {targetBoard.name} <span className="text-xs font-normal text-gray-500">(Optional)</span>
              </label>

              {targetCategories.length > 0 ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  {targetCategories.map((cat) => {
                    const checked = selectedCategoryIds.includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => toggleCategory(cat.id)}
                        className={`text-xs font-medium px-3 py-1.5 rounded-full border-2 transition-all cursor-pointer ${
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
              ) : (
                <p className="text-xs text-gray-400 italic">
                  This board currently has no categories. You can move the task now and categorize it later.
                </p>
              )}
            </div>
          )}

          {/* Safety Reassurance Notice */}
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-xl p-3 text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
            <span className="text-base leading-none">ℹ️</span>
            <span>
              All checklist actions, schedules, comments, and time logs will remain safely attached to this task.
            </span>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-700/80">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || loadingBoards || destinationBoards.length === 0 || !selectedBoardId}
              className="px-5 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Moving...
                </>
              ) : (
                "Move Task"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
