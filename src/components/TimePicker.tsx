"use client";

import { useState, useRef, useEffect } from "react";

interface TimePickerProps {
  value: string; // "HH:MM" or ""
  onChange: (value: string) => void;
  className?: string;
}

export default function TimePicker({ value, onChange, className }: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse current value or use fallback defaults
  let selectedHour = 9;
  let selectedMinute = 0;
  let isPM = false;

  if (value && value.includes(":")) {
    const [h, m] = value.split(":").map(Number);
    if (!isNaN(h) && !isNaN(m)) {
      selectedHour = h % 12 === 0 ? 12 : h % 12;
      selectedMinute = Math.round(m / 5) * 5; // snap to nearest 5 min
      if (selectedMinute >= 60) {
        selectedMinute = 0;
      }
      isPM = h >= 12;
    }
  }

  // Handle outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (hour: number, minute: number, pm: boolean) => {
    let rawHour = hour;
    if (pm) {
      if (hour < 12) rawHour = hour + 12;
    } else {
      if (hour === 12) rawHour = 0;
    }
    const val = `${rawHour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
    onChange(val);
  };

  // Format display string
  const getDisplayValue = () => {
    if (!value) return "Select Time";
    const [hStr, mStr] = value.split(":");
    const h = parseInt(hStr);
    const m = parseInt(mStr);
    if (isNaN(h) || isNaN(m)) return "Select Time";
    const displayHour = h % 12 === 0 ? 12 : h % 12;
    const displayMin = m.toString().padStart(2, "0");
    const period = h >= 12 ? "PM" : "AM";
    return `${displayHour}:${displayMin} ${period}`;
  };

  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`${className} flex items-center justify-between cursor-pointer select-none text-left w-full`}
      >
        <span>{getDisplayValue()}</span>
        <span className="text-gray-400 dark:text-gray-500 text-xs">🕒</span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 z-50 flex gap-3 text-xs w-48 justify-between select-none">
          {/* Hours Column */}
          <div className="flex-1 max-h-40 overflow-y-auto pr-1 space-y-0.5 border-r border-gray-100 dark:border-gray-700 scrollbar-thin">
            <div className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold mb-1 uppercase text-center">Hour</div>
            {hours.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => {
                  handleSelect(h, selectedMinute, isPM);
                }}
                className={`w-full text-center py-1 rounded transition-colors ${
                  selectedHour === h
                    ? "bg-blue-600 text-white font-bold"
                    : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                }`}
              >
                {h}
              </button>
            ))}
          </div>

          {/* Minutes Column */}
          <div className="flex-1 max-h-40 overflow-y-auto pr-1 space-y-0.5 border-r border-gray-100 dark:border-gray-700 scrollbar-thin">
            <div className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold mb-1 uppercase text-center">Min</div>
            {minutes.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  handleSelect(selectedHour, m, isPM);
                }}
                className={`w-full text-center py-1 rounded transition-colors ${
                  selectedMinute === m
                    ? "bg-blue-600 text-white font-bold"
                    : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                }`}
              >
                {m.toString().padStart(2, "0")}
              </button>
            ))}
          </div>

          {/* AM/PM Column */}
          <div className="flex flex-col justify-center gap-2">
            <div className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold uppercase text-center mb-1">Period</div>
            <button
              type="button"
              onClick={() => {
                handleSelect(selectedHour, selectedMinute, false);
              }}
              className={`px-2 py-1 rounded text-center transition-colors font-bold ${
                !isPM
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
              }`}
            >
              AM
            </button>
            <button
              type="button"
              onClick={() => {
                handleSelect(selectedHour, selectedMinute, true);
              }}
              className={`px-2 py-1 rounded text-center transition-colors font-bold ${
                isPM
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
              }`}
            >
              PM
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
