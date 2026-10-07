"use client";

import { useState, useRef, useEffect } from "react";

export interface TimePickerProps {
  value: string; // "HH:MM" (24h) or ""
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  align?: "left" | "right" | "auto";
}

// Parse various human-entered time strings into 24-hour { hour, min }
export function parseTimeString(str: string): { hour24: number; min: number } | null {
  const clean = str.trim().toLowerCase();
  if (!clean) return null;

  const isPM = clean.includes("pm") || clean.includes("p");
  const isAM = clean.includes("am") || clean.includes("a");

  // Strip am/pm and trailing whitespace
  const numPart = clean.replace(/[apm\s]/g, "");

  let hour = NaN;
  let min = 0;

  if (numPart.includes(":") || numPart.includes(".")) {
    const parts = numPart.split(/[:.]/);
    hour = parseInt(parts[0], 10);
    min = parseInt(parts[1], 10) || 0;
  } else if (numPart.length === 3) {
    // e.g. "930" -> 9:30
    hour = parseInt(numPart.slice(0, 1), 10);
    min = parseInt(numPart.slice(1), 10);
  } else if (numPart.length === 4) {
    // e.g. "1030" -> 10:30
    hour = parseInt(numPart.slice(0, 2), 10);
    min = parseInt(numPart.slice(2), 10);
  } else if (/^\d{1,2}$/.test(numPart)) {
    // e.g. "9" or "14"
    hour = parseInt(numPart, 10);
    min = 0;
  }

  if (isNaN(hour) || isNaN(min)) return null;
  if (min < 0 || min > 59) return null;

  if (isPM) {
    if (hour < 12) hour += 12;
  } else if (isAM) {
    if (hour === 12) hour = 0;
  }

  if (hour < 0 || hour > 23) return null;
  return { hour24: hour, min };
}

export function formatTime24to12(value: string): string {
  if (!value || !value.includes(":")) return "";
  const [hStr, mStr] = value.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return "";
  const displayHour = h % 12 === 0 ? 12 : h % 12;
  const displayMin = m.toString().padStart(2, "0");
  const period = h >= 12 ? "PM" : "AM";
  return `${displayHour}:${displayMin} ${period}`;
}

export default function TimePicker({
  value,
  onChange,
  className = "",
  placeholder = "e.g. 10:15 AM",
  align = "auto",
}: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"hour" | "minute">("hour");
  const [isEditing, setIsEditing] = useState(false);
  const [typedText, setTypedText] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [resolvedAlign, setResolvedAlign] = useState<"left" | "right">("left");

  const containerRef = useRef<HTMLDivElement>(null);
  const clockFaceRef = useRef<HTMLDivElement>(null);

  // Parse current 24-hour value or use fallbacks
  let hour24 = 9;
  let min = 0;

  if (value && value.includes(":")) {
    const [h, m] = value.split(":").map(Number);
    if (!isNaN(h) && !isNaN(m)) {
      hour24 = h;
      min = m;
    }
  }

  const selectedHour = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const selectedMinute = (Math.round(min / 5) * 5) % 60;
  const isPM = hour24 >= 12;

  // Compute alignment on open
  useEffect(() => {
    if (!isOpen) return;

    if (align === "left") {
      setResolvedAlign("left");
      return;
    }
    if (align === "right") {
      setResolvedAlign("right");
      return;
    }

    // Auto-detect whether dropdown fits to the left or right
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      // If right edge is within 240px of screen right, align right
      if (rect.left + 230 > window.innerWidth || rect.left > window.innerWidth / 2) {
        setResolvedAlign("right");
      } else {
        setResolvedAlign("left");
      }
    }
  }, [isOpen, align]);

  // Handle outside click to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsEditing(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (hour12: number, minute: number, pm: boolean) => {
    let rawHour = hour12;
    if (pm) {
      if (hour12 < 12) rawHour = hour12 + 12;
    } else {
      if (hour12 === 12) rawHour = 0;
    }
    const val = `${rawHour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
    onChange(val);
  };

  const handlePeriodChange = (newPM: boolean) => {
    handleSelect(selectedHour, min, newPM);
  };

  // Preset shortcuts
  const applyPreset = (preset: "now" | "-15m" | "+15m" | "+30m" | "+1h") => {
    if (preset === "now") {
      const now = new Date();
      const h = now.getHours();
      const m = (Math.round(now.getMinutes() / 5) * 5) % 60;
      const finalH = now.getMinutes() >= 58 ? (h + 1) % 24 : h;
      const val = `${finalH.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
      onChange(val);
      return;
    }

    let totalMinutes = hour24 * 60 + min;
    if (preset === "-15m") totalMinutes -= 15;
    if (preset === "+15m") totalMinutes += 15;
    if (preset === "+30m") totalMinutes += 30;
    if (preset === "+1h") totalMinutes += 60;

    totalMinutes = (totalMinutes + 24 * 60) % (24 * 60);
    const newH = Math.floor(totalMinutes / 60);
    const newM = totalMinutes % 60;
    const val = `${newH.toString().padStart(2, "0")}:${newM.toString().padStart(2, "0")}`;
    onChange(val);
  };

  // Keyboard and direct input handlers
  const commitTypedText = (text: string) => {
    const parsed = parseTimeString(text);
    if (parsed) {
      const val = `${parsed.hour24.toString().padStart(2, "0")}:${parsed.min.toString().padStart(2, "0")}`;
      onChange(val);
      setTypedText(formatTime24to12(val));
    } else {
      setTypedText(formatTime24to12(value));
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitTypedText(typedText);
      setIsOpen(false);
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setIsOpen(false);
    }
  };

  const handleBlur = () => {
    if (isEditing) {
      commitTypedText(typedText);
    }
  };

  // Pointer drag math on clock face (180x180)
  const handleClockPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const clock = clockFaceRef.current;
    if (!clock) return;
    const rect = clock.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 10) return; // Dead zone

    let deg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    deg = (deg + 360) % 360;

    if (mode === "hour") {
      let h = Math.round(deg / 30);
      if (h === 0) h = 12;
      handleSelect(h, min, isPM);
    } else {
      let m = (Math.round(deg / 30) * 5) % 60;
      handleSelect(selectedHour, m, isPM);
    }
  };

  // Radial geometry for 180px clock circle (Center: 90, 90)
  const CLOCK_RADIUS = 64;
  const hours = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  const activeAngleDeg =
    mode === "hour"
      ? selectedHour * 30 - 90
      : (selectedMinute / 5) * 30 - 90;

  const handRad = (activeAngleDeg * Math.PI) / 180;
  const handX = 90 + CLOCK_RADIUS * Math.cos(handRad);
  const handY = 90 + CLOCK_RADIUS * Math.sin(handRad);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Direct editable input with clock icon */}
      <div className="relative flex items-center">
        <input
          type="text"
          value={isEditing ? typedText : formatTime24to12(value) || ""}
          onChange={(e) => {
            setIsEditing(true);
            setTypedText(e.target.value);
          }}
          onFocus={() => {
            setIsEditing(true);
            setTypedText(formatTime24to12(value));
            setIsOpen(true);
          }}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`${className} pr-9`}
        />
        <button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen);
            if (!isOpen) {
              setMode("hour");
            }
          }}
          tabIndex={-1}
          className="absolute right-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-1"
          title="Open Clock Wheel"
        >
          <span className="text-sm select-none">🕒</span>
        </button>
      </div>

      {/* Zero-Scroll Hybrid Clock Wheel Dropdown */}
      {isOpen && (
        <div
          className={`absolute top-full mt-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl p-2.5 z-50 w-[224px] select-none ${
            resolvedAlign === "right" ? "right-0" : "left-0"
          }`}
        >
          {/* 1-Tap Quick Presets Bar */}
          <div className="flex items-center justify-between gap-1 pb-1.5 border-b border-gray-100 dark:border-gray-700/80">
            <button
              type="button"
              onClick={() => applyPreset("now")}
              className="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors"
            >
              Now
            </button>
            <button
              type="button"
              onClick={() => applyPreset("-15m")}
              className="px-1 py-0.5 text-[11px] font-medium rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
            >
              -15m
            </button>
            <button
              type="button"
              onClick={() => applyPreset("+15m")}
              className="px-1 py-0.5 text-[11px] font-medium rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
            >
              +15m
            </button>
            <button
              type="button"
              onClick={() => applyPreset("+30m")}
              className="px-1 py-0.5 text-[11px] font-medium rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
            >
              +30m
            </button>
            <button
              type="button"
              onClick={() => applyPreset("+1h")}
              className="px-1 py-0.5 text-[11px] font-medium rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
            >
              +1h
            </button>
          </div>

          {/* Time & Period Switcher */}
          <div className="flex items-center justify-between py-1.5">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setMode("hour")}
                className={`px-2 py-0.5 rounded-md text-sm font-bold transition-all ${
                  mode === "hour"
                    ? "bg-blue-600 text-white shadow-sm ring-2 ring-blue-400/30"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                {selectedHour}
              </button>
              <span className="text-gray-400 font-bold">:</span>
              <button
                type="button"
                onClick={() => setMode("minute")}
                className={`px-2 py-0.5 rounded-md text-sm font-bold transition-all ${
                  mode === "minute"
                    ? "bg-blue-600 text-white shadow-sm ring-2 ring-blue-400/30"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                {min.toString().padStart(2, "0")}
              </button>
            </div>

            {/* AM / PM Segmented Control */}
            <div className="flex items-center bg-gray-100 dark:bg-gray-700 p-0.5 rounded-lg text-xs font-bold">
              <button
                type="button"
                onClick={() => handlePeriodChange(false)}
                className={`px-2 py-0.5 rounded-md transition-colors ${
                  !isPM
                    ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
              >
                AM
              </button>
              <button
                type="button"
                onClick={() => handlePeriodChange(true)}
                className={`px-2 py-0.5 rounded-md transition-colors ${
                  isPM
                    ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
              >
                PM
              </button>
            </div>
          </div>

          {/* Circular Clock Wheel (180x180) */}
          <div className="flex justify-center my-0.5">
            <div
              ref={clockFaceRef}
              onPointerDown={(e) => {
                setIsDragging(true);
                e.currentTarget.setPointerCapture(e.pointerId);
                handleClockPointer(e);
              }}
              onPointerMove={(e) => {
                if (isDragging) {
                  handleClockPointer(e);
                }
              }}
              onPointerUp={(e) => {
                if (isDragging) {
                  setIsDragging(false);
                  try {
                    e.currentTarget.releasePointerCapture(e.pointerId);
                  } catch {
                    // ignore
                  }
                  if (mode === "hour") {
                    setMode("minute");
                  }
                }
              }}
              className="relative w-[180px] h-[180px] rounded-full bg-gray-50 dark:bg-gray-900/60 border border-gray-200/80 dark:border-gray-700/80 cursor-pointer touch-none"
            >
              {/* SVG Clock Hand & Indicator */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                viewBox="0 0 180 180"
              >
                {/* Hand Line */}
                <line
                  x1="90"
                  y1="90"
                  x2={handX}
                  y2={handY}
                  stroke="#2563eb"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                {/* Center Pivot Dot */}
                <circle cx="90" cy="90" r="3.5" fill="#2563eb" />
                {/* Indicator Circle behind selected number */}
                <circle cx={handX} cy={handY} r="13.5" fill="#2563eb" />
              </svg>

              {/* Numbers arranged radially */}
              {mode === "hour"
                ? hours.map((h) => {
                    const angleDeg = h * 30 - 90;
                    const rad = (angleDeg * Math.PI) / 180;
                    const x = 90 + CLOCK_RADIUS * Math.cos(rad);
                    const y = 90 + CLOCK_RADIUS * Math.sin(rad);
                    const isSelected = selectedHour === h;

                    return (
                      <button
                        key={h}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelect(h, min, isPM);
                          setMode("minute");
                        }}
                        style={{
                          left: `${x}px`,
                          top: `${y}px`,
                          transform: "translate(-50%, -50%)",
                        }}
                        className={`absolute w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold select-none z-10 transition-transform hover:scale-110 ${
                          isSelected
                            ? "text-white font-bold"
                            : "text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                        }`}
                      >
                        {h}
                      </button>
                    );
                  })
                : minutes.map((m) => {
                    const angleDeg = (m / 5) * 30 - 90;
                    const rad = (angleDeg * Math.PI) / 180;
                    const x = 90 + CLOCK_RADIUS * Math.cos(rad);
                    const y = 90 + CLOCK_RADIUS * Math.sin(rad);
                    const isSelected = selectedMinute === m;

                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelect(selectedHour, m, isPM);
                        }}
                        style={{
                          left: `${x}px`,
                          top: `${y}px`,
                          transform: "translate(-50%, -50%)",
                        }}
                        className={`absolute w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold select-none z-10 transition-transform hover:scale-110 ${
                          isSelected
                            ? "text-white font-bold"
                            : "text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                        }`}
                      >
                        {m.toString().padStart(2, "0")}
                      </button>
                    );
                  })}
            </div>
          </div>

          {/* Footer with Hint and Done */}
          <div className="flex items-center justify-between pt-1.5 border-t border-gray-100 dark:border-gray-700/80">
            <span className="text-[10px] text-gray-400 dark:text-gray-500">
              {mode === "hour" ? "Pick hour" : "Pick min"}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-2.5 py-0.5 text-xs font-semibold rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
