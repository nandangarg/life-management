import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TaskDetail, TaskAction, TaskStatus, PRIORITY_COLORS, STATUS_LABELS } from "../types";
import { api } from "../api/client";

interface Props {
  visible: boolean;
  task: TaskDetail | null;
  onClose: () => void;
  onTaskUpdated?: () => void;
}

export function TaskDetailModal({ visible, task, onClose, onTaskUpdated }: Props) {
  const [subtasks, setSubtasks] = useState<TaskAction[]>([]);
  const [newActionText, setNewActionText] = useState("");
  const [isAddingAction, setIsAddingAction] = useState(false);
  const [updatingActionId, setUpdatingActionId] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState<TaskStatus>("TODO");

  React.useEffect(() => {
    if (task) {
      setSubtasks(task.actions || []);
      setCurrentStatus(task.status);
    }
  }, [task]);

  if (!task) return null;

  const handleToggleSubtask = async (action: TaskAction) => {
    const nextCompleted = !action.isCompleted;
    setUpdatingActionId(action.id);

    // Optimistic UI update
    setSubtasks((prev) =>
      prev.map((a) => (a.id === action.id ? { ...a, isCompleted: nextCompleted } : a))
    );

    try {
      await api.toggleTaskAction(task.id, action.id, nextCompleted);
      onTaskUpdated?.();
    } catch (e) {
      // Revert if error
      setSubtasks((prev) =>
        prev.map((a) => (a.id === action.id ? { ...a, isCompleted: !nextCompleted } : a))
      );
      console.error("Failed toggling action:", e);
    } finally {
      setUpdatingActionId(null);
    }
  };

  const handleAddSubtask = async () => {
    if (!newActionText.trim()) return;
    const text = newActionText.trim();
    setIsAddingAction(true);
    try {
      const created = await api.createTaskAction(task.id, text);
      setSubtasks((prev) => [...prev, created]);
      setNewActionText("");
      onTaskUpdated?.();
    } catch (e) {
      console.error("Failed adding subtask:", e);
    } finally {
      setIsAddingAction(false);
    }
  };

  const handleChangeStatus = async (status: TaskStatus) => {
    if (status === currentStatus) return;
    setCurrentStatus(status);
    try {
      await api.updateTaskStatus(task.id, status);
      onTaskUpdated?.();
    } catch (e) {
      setCurrentStatus(task.status);
      console.error("Failed changing status:", e);
    }
  };

  const priorityColor = PRIORITY_COLORS[task.priority] || "#64748b";
  const completedCount = subtasks.filter((s) => s.isCompleted).length;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerBadges}>
            {task.board && (
              <View style={[styles.badge, { backgroundColor: (task.board.color || "#6366f1") + "20" }]}>
                <Text style={[styles.badgeText, { color: task.board.color || "#6366f1" }]}>
                  {task.board.name}
                </Text>
              </View>
            )}
            <View style={[styles.badge, { backgroundColor: priorityColor + "20" }]}>
              <Text style={[styles.badgeText, { color: priorityColor }]}>
                {task.priority}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={12} style={styles.closeBtn}>
            <Ionicons name="close-circle" size={28} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Title */}
          <Text style={styles.title}>{task.title}</Text>

          {/* Status Buttons */}
          <View style={styles.statusSection}>
            <Text style={styles.sectionLabel}>STATUS</Text>
            <View style={styles.statusRow}>
              {(["TODO", "IN_PROGRESS", "DONE"] as TaskStatus[]).map((st) => {
                const isActive = currentStatus === st;
                return (
                  <TouchableOpacity
                    key={st}
                    style={[
                      styles.statusPill,
                      isActive && styles.statusPillActive,
                      isActive && st === "DONE" && { backgroundColor: "#10b981" },
                      isActive && st === "IN_PROGRESS" && { backgroundColor: "#3b82f6" },
                      isActive && st === "TODO" && { backgroundColor: "#64748b" },
                    ]}
                    onPress={() => handleChangeStatus(st)}
                  >
                    <Text style={[styles.statusPillText, isActive && styles.statusPillTextActive]}>
                      {STATUS_LABELS[st]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Description */}
          {task.description ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>DESCRIPTION</Text>
              <Text style={styles.description}>{task.description}</Text>
            </View>
          ) : null}

          {/* Subtasks / Checklist Actions */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel}>
                SUBTASKS ({completedCount}/{subtasks.length})
              </Text>
              {subtasks.length > 0 && (
                <Text style={styles.progressPercent}>
                  {Math.round((completedCount / subtasks.length) * 100)}%
                </Text>
              )}
            </View>

            {/* Checklist items */}
            {subtasks.map((action) => {
              const isUpdating = updatingActionId === action.id;
              return (
                <TouchableOpacity
                  key={action.id}
                  style={styles.subtaskRow}
                  activeOpacity={0.7}
                  onPress={() => handleToggleSubtask(action)}
                >
                  {isUpdating ? (
                    <ActivityIndicator size="small" color="#6366f1" style={{ marginRight: 10 }} />
                  ) : (
                    <Ionicons
                      name={action.isCompleted ? "checkbox" : "square-outline"}
                      size={22}
                      color={action.isCompleted ? "#10b981" : "#94a3b8"}
                      style={{ marginRight: 10 }}
                    />
                  )}
                  <Text
                    style={[
                      styles.subtaskText,
                      action.isCompleted && styles.subtaskTextCompleted,
                    ]}
                  >
                    {action.text}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {/* Add Subtask Input */}
            <View style={styles.addSubtaskRow}>
              <TextInput
                style={styles.input}
                placeholder="Add subtask..."
                placeholderTextColor="#94a3b8"
                value={newActionText}
                onChangeText={setNewActionText}
                onSubmitEditing={handleAddSubtask}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={[
                  styles.addBtn,
                  !newActionText.trim() && { opacity: 0.5 },
                ]}
                disabled={!newActionText.trim() || isAddingAction}
                onPress={handleAddSubtask}
              >
                {isAddingAction ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="add" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Comments / Activity log */}
          {task.comments && task.comments.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>ACTIVITY & COMMENTS</Text>
              {task.comments.map((c) => (
                <View key={c.id} style={styles.commentItem}>
                  <Text style={styles.commentText}>{c.text}</Text>
                  <Text style={styles.commentDate}>
                    {new Date(c.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  headerBadges: {
    flexDirection: "row",
    gap: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  closeBtn: {
    padding: 4,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#f8fafc",
    marginBottom: 20,
  },
  statusSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
    letterSpacing: 1,
    marginBottom: 10,
  },
  statusRow: {
    flexDirection: "row",
    gap: 8,
  },
  statusPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#1e293b",
    alignItems: "center",
  },
  statusPillActive: {
    backgroundColor: "#6366f1",
  },
  statusPillText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#94a3b8",
  },
  statusPillTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },
  section: {
    marginBottom: 24,
    backgroundColor: "#1e293b",
    padding: 16,
    borderRadius: 16,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: "700",
    color: "#10b981",
  },
  description: {
    fontSize: 15,
    color: "#cbd5e1",
    lineHeight: 22,
  },
  subtaskRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  subtaskText: {
    fontSize: 15,
    color: "#f1f5f9",
    flex: 1,
  },
  subtaskTextCompleted: {
    color: "#64748b",
    textDecorationLine: "line-through",
  },
  addSubtaskRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: "#0f172a",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#f8fafc",
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#334155",
  },
  addBtn: {
    backgroundColor: "#6366f1",
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  commentItem: {
    backgroundColor: "#0f172a",
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  commentText: {
    fontSize: 13,
    color: "#cbd5e1",
  },
  commentDate: {
    fontSize: 10,
    color: "#64748b",
    marginTop: 4,
  },
});
