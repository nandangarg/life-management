"use client";

import { useState } from "react";
import { Board, Category } from "@/types";
import { randomDarkColor } from "@/lib/color";

interface BoardManagerProps {
  boards: Board[];
  onAddBoard: (data: { name: string; color: string }) => void;
  onEditBoard: (id: string, data: { name: string; color: string }) => void;
  onDeleteBoard: (id: string) => void;
  onToggleHidden: (id: string, isHidden: boolean) => void;
  onAddCategory: (data: { boardId: string; name: string; color: string }) => void;
  onEditCategory: (id: string, data: { name: string; color: string }) => void;
  onDeleteCategory: (id: string) => void;
  onRandomizeCategoryColors: () => void;
}

export default function BoardManager({
  boards,
  onAddBoard,
  onEditBoard,
  onDeleteBoard,
  onToggleHidden,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  onRandomizeCategoryColors,
}: BoardManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingBoard, setEditingBoard] = useState<Board | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [addCategoryForBoard, setAddCategoryForBoard] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState(randomDarkColor);

  const resetForm = () => {
    setShowForm(false);
    setEditingBoard(null);
    setEditingCategory(null);
    setAddCategoryForBoard(null);
    setName("");
    setColor(randomDarkColor());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingBoard) {
      onEditBoard(editingBoard.id, { name: name.trim(), color });
    } else if (editingCategory) {
      onEditCategory(editingCategory.id, { name: name.trim(), color });
    } else if (addCategoryForBoard) {
      onAddCategory({ boardId: addCategoryForBoard, name: name.trim(), color });
    } else {
      onAddBoard({ name: name.trim(), color });
    }
    resetForm();
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900">Boards & Categories</h3>
        <div className="flex gap-2">
          <button
            onClick={onRandomizeCategoryColors}
            className="text-sm px-3 py-1 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50"
          >
            Randomize Colors
          </button>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="text-sm px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + Board
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {boards.map((board) => (
          <div key={board.id} className="border border-gray-100 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: board.color, opacity: board.isHidden ? 0.4 : 1 }} />
              <span className={`font-medium text-sm ${board.isHidden ? "text-gray-400 line-through" : ""}`}>{board.name}</span>
              {board.isHidden && <span className="text-xs text-gray-400">(hidden)</span>}
              <button
                onClick={() => onToggleHidden(board.id, !board.isHidden)}
                className={`text-xs ml-auto ${board.isHidden ? "text-green-500 hover:text-green-700" : "text-gray-400 hover:text-gray-600"}`}
              >
                {board.isHidden ? "Show" : "Hide"}
              </button>
              <button
                onClick={() => {
                  resetForm();
                  setEditingBoard(board);
                  setName(board.name);
                  setColor(board.color);
                  setShowForm(true);
                }}
                className="text-xs text-blue-500 hover:text-blue-700"
              >
                Edit
              </button>
              <button
                onClick={() => onDeleteBoard(board.id)}
                className="text-xs text-red-500 hover:text-red-700"
              >
                Delete
              </button>
            </div>
            <div className="flex flex-wrap gap-1 ml-5">
              {board.categories.map((cat) => (
                <span
                  key={cat.id}
                  className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: cat.color }}
                >
                  {cat.name}
                  <button
                    onClick={() => {
                      resetForm();
                      setEditingCategory(cat);
                      setName(cat.name);
                      setColor(cat.color);
                      setShowForm(true);
                    }}
                    className="hover:bg-white/20 rounded px-0.5"
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => onDeleteCategory(cat.id)}
                    className="hover:bg-white/20 rounded px-0.5"
                  >
                    ✕
                  </button>
                </span>
              ))}
              <button
                onClick={() => {
                  resetForm();
                  setAddCategoryForBoard(board.id);
                  setShowForm(true);
                }}
                className="text-xs text-gray-400 hover:text-gray-600 px-2 py-0.5 border border-dashed border-gray-300 rounded-full"
              >
                + Category
              </button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-3 flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={addCategoryForBoard || editingCategory ? "Category name" : "Board name"}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer"
          />
          <button type="submit" className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            {editingBoard || editingCategory ? "Update" : "Add"}
          </button>
          <button type="button" onClick={resetForm} className="text-sm px-3 py-1.5 text-gray-500 hover:bg-gray-200 rounded-lg">
            Cancel
          </button>
        </form>
      )}
    </div>
  );
}
