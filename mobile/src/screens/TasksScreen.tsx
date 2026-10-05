import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Board, TaskWithRelations, TaskDetail, TaskStatus, PRIORITY_COLORS } from "../types";
import { api } from "../api/client";
import { TaskDetailModal } from "../components/TaskDetailModal";

export function TasksScreen() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "ALL">("ALL");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<TaskDetail | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await api.getBoards();
      const visibleBoards = data.filter((b) => !b.isHidden);
      setBoards(visibleBoards);
      if (visibleBoards.length > 0 && !selectedBoardId) {
        setSelectedBoardId(visibleBoards[0].id);
      }
    } catch (e) {
      console.error("Failed loading boards:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedBoardId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleToggleTaskStatus = async (task: TaskWithRelations) => {
    const nextStatus: TaskStatus = task.status === "DONE" ? "TODO" : "DONE";

    // Optimistic UI update
    setBoards((prev) =>
      prev.map((b) => ({
        ...b,
        tasks: b.tasks.map((t) =>
          t.id === task.id ? { ...t, status: nextStatus } : t
        ),
      }))
    );

    try {
      await api.updateTaskStatus(task.id, nextStatus);
    } catch (e) {
      console.error("Error toggling task status:", e);
      loadData();
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

  const currentBoard = boards.find((b) => b.id === selectedBoardId) || boards[0];

  const filteredTasks = (currentBoard?.tasks || []).filter((t) => {
    if (statusFilter === "ALL") return true;
    return t.status === statusFilter;
  });

  const renderTaskCard = ({ item }: { item: TaskWithRelations }) => {
    const isDone = item.status === "DONE";
    const priorityColor = PRIORITY_COLORS[item.priority] || "#64748b";
    const subtasks = item.actions || [];
    const completedSubtasks = subtasks.filter((a) => a.isCompleted).length;

    return (
      <View style={[styles.card, isDone && styles.cardCompleted]}>
        {/* Quick Done Checkbox */}
        <TouchableOpacity
          style={styles.checkboxTouch}
          hitSlop={8}
          onPress={() => handleToggleTaskStatus(item)}
        >
          <Ionicons
            name={isDone ? "checkmark-circle" : "ellipse-outline"}
            size={24}
            color={isDone ? "#10b981" : "#64748b"}
          />
        </TouchableOpacity>

        {/* Card Body */}
        <TouchableOpacity
          style={styles.cardContent}
          activeOpacity={0.7}
          onPress={() => handleOpenTask(item.id)}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.priorityPill, { backgroundColor: priorityColor + "20" }]}>
              <Text style={[styles.priorityText, { color: priorityColor }]}>
                {item.priority}
              </Text>
            </View>

            {item.categories && item.categories.length > 0 && (
              <View style={styles.categoryPill}>
                <Text style={styles.categoryText} numberOfLines={1}>
                  {item.categories[0].name}
                </Text>
              </View>
            )}
          </View>

          <Text style={[styles.taskTitle, isDone && styles.taskTitleCompleted]}>
            {item.title}
          </Text>

          {/* Subtasks Progress */}
          {subtasks.length > 0 && (
            <View style={styles.subtasksBadge}>
              <Ionicons
                name="checkbox-outline"
                size={14}
                color={completedSubtasks === subtasks.length ? "#10b981" : "#94a3b8"}
              />
              <Text
                style={[
                  styles.subtasksBadgeText,
                  completedSubtasks === subtasks.length && { color: "#10b981" },
                ]}
              >
                {completedSubtasks}/{subtasks.length} subtasks
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Board Selector Tabs */}
      <View style={styles.boardBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.boardScroll}>
          {boards.map((b) => {
            const isSelected = b.id === (currentBoard?.id || "");
            return (
              <TouchableOpacity
                key={b.id}
                style={[
                  styles.boardTab,
                  isSelected && { backgroundColor: b.color || "#6366f1" },
                ]}
                onPress={() => setSelectedBoardId(b.id)}
              >
                <Text style={[styles.boardTabText, isSelected && styles.boardTabTextSelected]}>
                  {b.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Status Filter Chips */}
      <View style={styles.filterBar}>
        {(["ALL", "TODO", "IN_PROGRESS", "DONE"] as const).map((filter) => {
          const isSelected = statusFilter === filter;
          const label = filter === "ALL" ? "All" : filter === "TODO" ? "To Do" : filter === "IN_PROGRESS" ? "In Progress" : "Done";
          return (
            <TouchableOpacity
              key={filter}
              style={[styles.filterChip, isSelected && styles.filterChipSelected]}
              onPress={() => setStatusFilter(filter)}
            >
              <Text style={[styles.filterChipText, isSelected && styles.filterChipTextSelected]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Task List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : filteredTasks.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="checkbox-outline" size={48} color="#475569" />
          <Text style={styles.emptyTitle}>No tasks found</Text>
          <Text style={styles.emptySubtitle}>No tasks match the selected filter.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTasks}
          keyExtractor={(item) => item.id}
          renderItem={renderTaskCard}
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
        onTaskUpdated={loadData}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b0f19",
  },
  boardBar: {
    backgroundColor: "#0f172a",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  boardScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  boardTab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: "#1e293b",
  },
  boardTabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#94a3b8",
  },
  boardTabTextSelected: {
    color: "#ffffff",
    fontWeight: "700",
  },
  filterBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    backgroundColor: "#0f172a",
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#1e293b",
  },
  filterChipSelected: {
    backgroundColor: "#334155",
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94a3b8",
  },
  filterChipTextSelected: {
    color: "#f8fafc",
    fontWeight: "700",
  },
  listContent: {
    padding: 16,
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
    gap: 6,
    marginBottom: 6,
  },
  priorityPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: "700",
  },
  categoryPill: {
    backgroundColor: "#334155",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#cbd5e1",
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#f8fafc",
    lineHeight: 20,
  },
  taskTitleCompleted: {
    textDecorationLine: "line-through",
    color: "#94a3b8",
  },
  subtasksBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  subtasksBadgeText: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "500",
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
});
