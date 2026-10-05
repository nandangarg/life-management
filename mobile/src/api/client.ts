import AsyncStorage from "@react-native-async-storage/async-storage";
import { Board, ScheduleWithTask, TaskAction, TaskDetail, TaskStatus, TaskWithRelations } from "../types";

const STORAGE_KEY_API_URL = "life_mgmt_api_url";
export const DEFAULT_API_URL = "http://192.168.1.159:3000";

let cachedApiUrl: string | null = null;
let memoryStorageUrl: string = DEFAULT_API_URL;

export async function getApiUrl(): Promise<string> {
  if (cachedApiUrl) return cachedApiUrl;
  try {
    if (AsyncStorage && typeof AsyncStorage.getItem === "function") {
      const saved = await AsyncStorage.getItem(STORAGE_KEY_API_URL);
      if (saved && saved.trim() && !saved.includes("localhost") && !saved.includes("127.0.0.1")) {
        cachedApiUrl = saved.trim().replace(/\/+$/, "");
        return cachedApiUrl;
      }
    }
  } catch {
    // Graceful fallback to in-memory URL in environments where native storage is unavailable
  }
  return memoryStorageUrl || DEFAULT_API_URL;
}

export async function setApiUrl(url: string): Promise<void> {
  const sanitized = url.trim().replace(/\/+$/, "");
  cachedApiUrl = sanitized;
  memoryStorageUrl = sanitized;
  try {
    if (AsyncStorage && typeof AsyncStorage.setItem === "function") {
      await AsyncStorage.setItem(STORAGE_KEY_API_URL, sanitized);
    }
  } catch {
    // Stored in memoryStorageUrl
  }
}

let getAuthTokenFn: (() => Promise<string | null>) | null = null;

export function setAuthTokenProvider(fn: () => Promise<string | null>) {
  getAuthTokenFn = fn;
}

async function fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const baseUrl = await getApiUrl();
  const url = `${baseUrl}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  let token: string | null = null;
  try {
    if (getAuthTokenFn) {
      token = await getAuthTokenFn();
    }
  } catch (err) {
    console.warn("Failed retrieving auth token:", err);
  }

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API Error ${res.status}: ${text || res.statusText}`);
  }

  return (await res.json()) as T;
}

export const api = {
  async testConnection(targetUrl?: string): Promise<{ ok: boolean; message: string; count?: number }> {
    try {
      const base = targetUrl ? targetUrl.trim().replace(/\/+$/, "") : await getApiUrl();
      const res = await fetch(`${base}/api/boards`, { method: "GET" });
      if (!res.ok) {
        return { ok: false, message: `Server returned status ${res.status}` };
      }
      const boards = (await res.json()) as Board[];
      return { ok: true, message: `Connected to Neon Backend!`, count: boards.length };
    } catch (e: any) {
      return { ok: false, message: e.message || "Failed to reach server" };
    }
  },

  async getBoards(): Promise<Board[]> {
    return fetchJson<Board[]>("/api/boards");
  },

  async getTasks(): Promise<TaskWithRelations[]> {
    return fetchJson<TaskWithRelations[]>("/api/tasks");
  },

  async getTaskDetail(id: string): Promise<TaskDetail> {
    return fetchJson<TaskDetail>(`/api/tasks/${id}`);
  },

  async getSchedules(date: string): Promise<ScheduleWithTask[]> {
    return fetchJson<ScheduleWithTask[]>(`/api/schedules?date=${date}`);
  },

  async updateTaskStatus(taskId: string, status: TaskStatus): Promise<TaskWithRelations> {
    return fetchJson<TaskWithRelations>(`/api/tasks/${taskId}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  async toggleScheduleComplete(schedule: ScheduleWithTask | string, isCompleted: boolean): Promise<any> {
    if (typeof schedule === "object" && schedule.id.startsWith("virtual_")) {
      return fetchJson("/api/schedules", {
        method: "POST",
        body: JSON.stringify({
          taskId: schedule.taskId,
          date: schedule.date,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          isFixed: schedule.isFixed,
          isRecurring: true,
          recurrenceRule: schedule.recurrenceRule,
          completedAt: isCompleted ? new Date().toISOString() : null,
        }),
      });
    }

    const scheduleId = typeof schedule === "string" ? schedule : schedule.id;
    return fetchJson(`/api/schedules/${scheduleId}`, {
      method: "PATCH",
      body: JSON.stringify({
        completedAt: isCompleted ? new Date().toISOString() : null,
        ...(typeof schedule === "object" ? { taskId: schedule.taskId, date: schedule.date } : {}),
      }),
    });
  },

  async toggleTaskAction(taskId: string, actionId: string, isCompleted: boolean): Promise<TaskAction> {
    return fetchJson<TaskAction>(`/api/tasks/${taskId}/actions/${actionId}`, {
      method: "PATCH",
      body: JSON.stringify({ isCompleted }),
    });
  },

  async createTaskAction(taskId: string, text: string): Promise<TaskAction> {
    return fetchJson<TaskAction>(`/api/tasks/${taskId}/actions`, {
      method: "POST",
      body: JSON.stringify({ text }),
    });
  },
};
