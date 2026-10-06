import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../api/client";
import { TimeLogWithTask, Board } from "../types";

function getNowTimeStr(): string {
  const now = new Date();
  const h = now.getHours().toString().padStart(2, "0");
  const m = Math.floor(now.getMinutes() / 5) * 5;
  const mStr = (m === 60 ? 55 : m).toString().padStart(2, "0");
  return `${h}:${mStr}`;
}

function timeToMins(timeStr: string): number {
  if (!timeStr || !timeStr.includes(":")) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function calcDiffMin(start: string, end: string): number {
  const s = timeToMins(start);
  const e = timeToMins(end);
  let diff = e - s;
  if (diff < 0) diff += 24 * 60;
  return diff;
}

export function DailyLogScreen() {
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [logs, setLogs] = useState<TimeLogWithTask[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Quick Stash
  const [stashedWork, setStashedWork] = useState<{ title: string; startTime: string } | null>(null);

  // Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [editLogId, setEditLogId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState(getNowTimeStr());
  const [endTime, setEndTime] = useState(getNowTimeStr());
  const [notes, setNotes] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");

  const loadData = useCallback(async (dateStr: string) => {
    try {
      const [logsData, boardsData] = await Promise.all([
        api.getTimeLogs(dateStr),
        api.getBoards().catch(() => []),
      ]);
      setLogs(logsData || []);
      setBoards(boardsData || []);
    } catch (e) {
      console.error("Failed loading logs:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    loadData(selectedDate);
  }, [selectedDate, loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData(selectedDate);
  };

  const shiftDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  const isToday = selectedDate === new Date().toISOString().split("T")[0];

  const totalMin = useMemo(() => {
    return logs.reduce((acc, curr) => acc + (curr.durationMin || 0), 0);
  }, [logs]);

  const allTasks = useMemo(() => {
    return boards.flatMap((b) => b.tasks || []);
  }, [boards]);

  // Open modal to log
  const openNewLogModal = () => {
    setEditLogId(null);
    setTitle("");
    setSelectedTaskId("");
    setStartTime(stashedWork ? stashedWork.startTime : getNowTimeStr());
    setEndTime(getNowTimeStr());
    setNotes("");
    setModalVisible(true);
  };

  const openEditLogModal = (item: TimeLogWithTask) => {
    setEditLogId(item.id);
    setTitle(item.title);
    setSelectedTaskId(item.taskId || "");
    setStartTime(item.startTime);
    setEndTime(item.endTime);
    setNotes(item.notes || "");
    setModalVisible(true);
  };

  const handleSaveLog = async () => {
    if (!title.trim()) {
      Alert.alert("Missing Name", "Please enter an activity name.");
      return;
    }

    const duration = calcDiffMin(startTime, endTime);

    try {
      if (editLogId) {
        await api.updateTimeLog(editLogId, {
          title: title.trim(),
          taskId: selectedTaskId || null,
          startTime,
          endTime,
          durationMin: duration || 1,
          notes: notes.trim() || null,
          date: selectedDate,
        });
      } else {
        await api.createTimeLog({
          title: title.trim(),
          taskId: selectedTaskId || null,
          date: selectedDate,
          startTime,
          endTime,
          durationMin: duration || 1,
          notes: notes.trim() || null,
        });
        if (stashedWork) {
          setStashedWork(null);
        }
      }
      setModalVisible(false);
      loadData(selectedDate);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed saving log");
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert("Delete Entry", "Are you sure you want to delete this log entry?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await api.deleteTimeLog(id);
            loadData(selectedDate);
          } catch (e: any) {
            Alert.alert("Error", e.message || "Failed deleting log");
          }
        },
      },
    ]);
  };

  const renderLogItem = ({ item }: { item: TimeLogWithTask }) => {
    const boardColor = item.task?.board?.color || "#6366f1";
    const boardName = item.task?.board?.name;

    return (
      <View style={styles.logCard}>
        <View style={styles.cardHeader}>
          <View style={styles.timeBadge}>
            <Ionicons name="time-outline" size={12} color="#94a3b8" />
            <Text style={styles.timeText}>
              {item.startTime} – {item.endTime}
            </Text>
          </View>
          <View style={styles.durationPill}>
            <Text style={styles.durationText}>
              {Math.floor(item.durationMin / 60) > 0 ? `${Math.floor(item.durationMin / 60)}h ` : ""}
              {item.durationMin % 60}m
            </Text>
          </View>
          {boardName && (
            <View style={[styles.boardPill, { backgroundColor: boardColor + "20" }]}>
              <View style={[styles.boardDot, { backgroundColor: boardColor }]} />
              <Text style={[styles.boardText, { color: boardColor }]} numberOfLines={1}>
                {boardName}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.logTitle}>{item.title}</Text>

        {item.notes ? (
          <Text style={styles.logNotes} numberOfLines={3}>
            {item.notes}
          </Text>
        ) : null}

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => openEditLogModal(item)}
            hitSlop={8}
          >
            <Ionicons name="pencil" size={15} color="#94a3b8" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleDelete(item.id)}
            hitSlop={8}
          >
            <Ionicons name="trash-outline" size={15} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Date Header */}
      <View style={styles.dateBar}>
        <TouchableOpacity style={styles.dateNavBtn} onPress={() => shiftDate(-1)}>
          <Ionicons name="chevron-back" size={20} color="#cbd5e1" />
        </TouchableOpacity>

        <View style={styles.dateCenter}>
          <Text style={styles.dateTitle}>
            {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </Text>
          {!isToday && (
            <TouchableOpacity
              style={styles.todayPill}
              onPress={() => setSelectedDate(new Date().toISOString().split("T")[0])}
            >
              <Text style={styles.todayPillText}>Go to Today</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.dateNavBtn} onPress={() => shiftDate(1)}>
          <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
        </TouchableOpacity>
      </View>

      {/* Summary Stat Card */}
      <View style={styles.summaryCard}>
        <View style={styles.statCol}>
          <Text style={styles.statLabel}>TOTAL LOGGED</Text>
          <Text style={styles.statValue}>
            {Math.floor(totalMin / 60)}h {totalMin % 60}m
          </Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCol}>
          <Text style={styles.statLabel}>ACTIVITIES</Text>
          <Text style={styles.statValue}>{logs.length}</Text>
        </View>
      </View>

      {/* Stashed work banner or quick start */}
      {stashedWork ? (
        <View style={styles.stashBanner}>
          <View style={styles.stashLeft}>
            <View style={styles.pulseDot} />
            <View>
              <Text style={styles.stashLabel}>In Progress (Started {stashedWork.startTime})</Text>
              <Text style={styles.stashTitle} numberOfLines={1}>
                {stashedWork.title}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.finishBtn} onPress={openNewLogModal}>
            <Text style={styles.finishBtnText}>Finish & Log</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.quickStartBar}>
          <TouchableOpacity
            style={styles.quickStartBtn}
            onPress={() => {
              Alert.prompt
                ? Alert.prompt("Start Activity", "What are you working on?", [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Start",
                      onPress: (text?: string) =>
                        setStashedWork({
                          title: text?.trim() || "Deep Work",
                          startTime: getNowTimeStr(),
                        }),
                    },
                  ])
                : setStashedWork({
                    title: "Deep Work",
                    startTime: getNowTimeStr(),
                  });
            }}
          >
            <Ionicons name="play" size={14} color="#10b981" />
            <Text style={styles.quickStartText}>Start Activity</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.manualLogBtn} onPress={openNewLogModal}>
            <Ionicons name="add" size={16} color="#ffffff" />
            <Text style={styles.manualLogText}>+ Log Work</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Timeline List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : logs.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="journal-outline" size={48} color="#334155" />
          <Text style={styles.emptyTitle}>No logs for this date</Text>
          <Text style={styles.emptySub}>
            Tap &apos;+ Log Work&apos; or &apos;Start Activity&apos; to record your day.
          </Text>
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id}
          renderItem={renderLogItem}
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

      {/* Log Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editLogId ? "Edit Log Entry" : "Log Activity"}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Activity Name *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Sprint Planning, Doctor visit..."
                placeholderTextColor="#64748b"
                value={title}
                onChangeText={setTitle}
              />

              <View style={styles.row}>
                <View style={styles.halfCol}>
                  <Text style={styles.inputLabel}>Start Time (HH:MM)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="09:00"
                    placeholderTextColor="#64748b"
                    value={startTime}
                    onChangeText={setStartTime}
                  />
                </View>
                <View style={styles.halfCol}>
                  <Text style={styles.inputLabel}>End Time (HH:MM)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="10:00"
                    placeholderTextColor="#64748b"
                    value={endTime}
                    onChangeText={setEndTime}
                  />
                </View>
              </View>

              <Text style={styles.durationNote}>
                Duration: {calcDiffMin(startTime, endTime)} minutes
              </Text>

              <Text style={styles.inputLabel}>Notes / Journal (Optional)</Text>
              <TextInput
                style={[styles.textInput, styles.notesInput]}
                placeholder="What was accomplished..."
                placeholderTextColor="#64748b"
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveLog}>
                <Text style={styles.saveBtnText}>Save Log</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  },
  dateNavBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#1e293b",
  },
  dateCenter: {
    alignItems: "center",
  },
  dateTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f8fafc",
  },
  todayPill: {
    marginTop: 2,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: "#312e81",
    borderRadius: 10,
  },
  todayPillText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#a5b4fc",
  },
  summaryCard: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: "#131b2e",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  statCol: {
    flex: 1,
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    backgroundColor: "#1e293b",
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748b",
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#f8fafc",
    marginTop: 2,
  },
  stashBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: "#064e3b",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#059669",
  },
  stashLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#10b981",
  },
  stashLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6ee7b7",
  },
  stashTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
  },
  finishBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#10b981",
    borderRadius: 8,
  },
  finishBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#ffffff",
  },
  quickStartBar: {
    flexDirection: "row",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 10,
  },
  quickStartBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#131b2e",
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  quickStartText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#10b981",
  },
  manualLogBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "#4f46e5",
    paddingVertical: 10,
    borderRadius: 12,
  },
  manualLogText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#ffffff",
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  logCard: {
    backgroundColor: "#131b2e",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  timeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#1e293b",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  timeText: {
    fontSize: 11,
    fontFamily: "monospace",
    color: "#94a3b8",
  },
  durationPill: {
    backgroundColor: "#1e1b4b",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  durationText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#a5b4fc",
  },
  boardPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  boardDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  boardText: {
    fontSize: 10,
    fontWeight: "600",
  },
  logTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#f8fafc",
  },
  logNotes: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 4,
    lineHeight: 16,
  },
  cardActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#1e293b",
    paddingTop: 8,
  },
  actionBtn: {
    padding: 4,
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#cbd5e1",
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#0f172a",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "85%",
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#f8fafc",
  },
  modalBody: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94a3b8",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  textInput: {
    backgroundColor: "#1e293b",
    borderRadius: 10,
    padding: 12,
    color: "#f8fafc",
    fontSize: 14,
    marginBottom: 12,
  },
  notesInput: {
    height: 80,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  halfCol: {
    flex: 1,
  },
  durationNote: {
    fontSize: 12,
    color: "#818cf8",
    fontWeight: "600",
    marginBottom: 12,
  },
  modalFooter: {
    flexDirection: "row",
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#1e293b",
    alignItems: "center",
  },
  cancelBtnText: {
    color: "#94a3b8",
    fontWeight: "600",
  },
  saveBtn: {
    flex: 2,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#4f46e5",
    alignItems: "center",
  },
  saveBtnText: {
    color: "#ffffff",
    fontWeight: "700",
  },
});
