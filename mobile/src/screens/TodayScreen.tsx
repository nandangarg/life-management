import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ScheduleWithTask, TaskDetail } from "../types";
import { api } from "../api/client";
import { TaskDetailModal } from "../components/TaskDetailModal";

interface TodayScreenProps {
  onOpenSettings?: () => void;
}

export function TodayScreen({ onOpenSettings }: TodayScreenProps) {
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0]; // YYYY-MM-DD
  });
  const [schedules, setSchedules] = useState<ScheduleWithTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<TaskDetail | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadSchedules = useCallback(async (dateStr: string) => {
    try {
      setErrorMsg(null);
      const data = await api.getSchedules(dateStr);
      setSchedules(data);
    } catch (e: any) {
      console.error("Failed loading schedules:", e);
      setErrorMsg(e.message || "Could not connect to backend");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    loadSchedules(selectedDate);
  }, [selectedDate, loadSchedules]);

  const onRefresh = () => {
    setRefreshing(true);
    loadSchedules(selectedDate);
  };

  const handleToggleSchedule = async (schedule: ScheduleWithTask) => {
    const isCompleted = !schedule.completedAt;

    // Optimistic UI update
    setSchedules((prev) =>
      prev.map((s) =>
        s.id === schedule.id
          ? { ...s, completedAt: isCompleted ? new Date().toISOString() : null }
          : s
      )
    );

    try {
      await api.toggleScheduleComplete(schedule, isCompleted);
      // Reload to get updated virtual schedule ID
      if (schedule.id.startsWith("virtual_")) {
        loadSchedules(selectedDate);
      }
    } catch (e) {
      console.error("Error toggling schedule:", e);
      // Revert on failure
      loadSchedules(selectedDate);
    }
  };

  const handleOpenTask = async (taskId: string) => {
    try {
      const detail = await api.getTaskDetail(taskId);
      setSelectedTaskDetail(detail);
      setDetailModalVisible(true);
    } catch (e) {
      console.error("Failed fetching task detail:", e);
    }
  };

  const shiftDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  const isToday = selectedDate === new Date().toISOString().split("T")[0];

  const renderScheduleItem = ({ item }: { item: ScheduleWithTask }) => {
    const isDone = Boolean(item.completedAt);
    const subtasks = item.task?.actions || [];
    const completedSubtasks = subtasks.filter((a) => a.isCompleted).length;

    return (
      <View style={[styles.card, isDone && styles.cardCompleted]}>
        {/* Checkbox */}
        <TouchableOpacity
          style={styles.checkboxTouch}
          hitSlop={8}
          onPress={() => handleToggleSchedule(item)}
        >
          <Ionicons
            name={isDone ? "checkmark-circle" : "ellipse-outline"}
            size={26}
            color={isDone ? "#10b981" : "#64748b"}
          />
        </TouchableOpacity>

        {/* Content */}
        <TouchableOpacity
          style={styles.cardContent}
          activeOpacity={0.7}
          onPress={() => handleOpenTask(item.taskId)}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.timeBadge}>
              {item.startTime} - {item.endTime}
            </Text>
            {item.task?.isHabit && (
              <View style={styles.habitBadge}>
                <Ionicons name="flame" size={12} color="#f59e0b" />
                <Text style={styles.habitText}>Habit</Text>
              </View>
            )}
          </View>

          <Text style={[styles.taskTitle, isDone && styles.taskTitleCompleted]}>
            {item.task?.title || "Untitled Task"}
          </Text>

          {/* Subtasks summary */}
          {subtasks.length > 0 && (
            <View style={styles.subtaskSummary}>
              <Ionicons name="list" size={13} color="#94a3b8" />
              <Text style={styles.subtaskSummaryText}>
                {completedSubtasks}/{subtasks.length} subtasks done
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Date Header Picker */}
      <View style={styles.dateBar}>
        <TouchableOpacity onPress={() => shiftDate(-1)} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={20} color="#94a3b8" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setSelectedDate(new Date().toISOString().split("T")[0])}
          style={styles.dateTitleContainer}
        >
          <Text style={styles.dateMainText}>
            {new Date(selectedDate + "T12:00:00").toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </Text>
          {isToday && <Text style={styles.todayPill}>TODAY</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => shiftDate(1)} style={styles.navBtn}>
          <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      {/* Main List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : errorMsg ? (
        <View style={styles.centerContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color="#ef4444" />
          <Text style={styles.errorTitle}>Connection Notice</Text>
          <Text style={styles.errorSubtitle}>{errorMsg}</Text>
          <Text style={styles.errorHint}>
            Go to Settings to adjust your API Base URL (e.g. your local IP or Vercel URL).
          </Text>
          <View style={styles.errorButtonRow}>
            <TouchableOpacity style={styles.retryBtn} onPress={onRefresh}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
            {onOpenSettings && (
              <TouchableOpacity
                style={[styles.retryBtn, { backgroundColor: "#334155" }]}
                onPress={onOpenSettings}
              >
                <Text style={styles.retryText}>Configure API URL</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ) : schedules.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="calendar-outline" size={48} color="#475569" />
          <Text style={styles.emptyTitle}>No scheduled tasks</Text>
          <Text style={styles.emptySubtitle}>
            Enjoy your free time, or schedule tasks from the Tasks tab!
          </Text>
        </View>
      ) : (
        <FlatList
          data={schedules}
          keyExtractor={(item) => item.id}
          renderItem={renderScheduleItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#6366f1"
              colors={["#6366f1"]}
            />
          }
        />
      )}

      {/* Task Detail Modal */}
      <TaskDetailModal
        visible={detailModalVisible}
        task={selectedTaskDetail}
        onClose={() => setDetailModalVisible(false)}
        onTaskUpdated={() => loadSchedules(selectedDate)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b0f19",
  },
  dateBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
    backgroundColor: "#0f172a",
  },
  navBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#1e293b",
  },
  dateTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dateMainText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f8fafc",
  },
  todayPill: {
    fontSize: 10,
    fontWeight: "800",
    color: "#6366f1",
    backgroundColor: "#6366f120",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#1e293b",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#334155",
  },
  cardCompleted: {
    opacity: 0.65,
    backgroundColor: "#161f2e",
  },
  checkboxTouch: {
    marginRight: 12,
    marginTop: 2,
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  timeBadge: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94a3b8",
  },
  habitBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f59e0b20",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  habitText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#f59e0b",
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#f8fafc",
    lineHeight: 22,
  },
  taskTitleCompleted: {
    textDecorationLine: "line-through",
    color: "#94a3b8",
  },
  subtaskSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  subtaskSummaryText: {
    fontSize: 12,
    color: "#94a3b8",
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#94a3b8",
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    marginTop: 4,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ef4444",
    marginTop: 12,
  },
  errorSubtitle: {
    fontSize: 14,
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 4,
  },
  errorHint: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
    marginTop: 8,
  },
  errorButtonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#6366f1",
  },
  retryText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
});
