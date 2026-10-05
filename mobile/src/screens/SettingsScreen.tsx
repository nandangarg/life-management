import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getApiUrl, setApiUrl, api, DEFAULT_API_URL } from "../api/client";

export function SettingsScreen() {
  const [urlInput, setUrlInput] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
    count?: number;
  } | null>(null);

  useEffect(() => {
    getApiUrl().then((saved) => setUrlInput(saved));
  }, []);

  const handleSave = async () => {
    if (!urlInput.trim()) {
      Alert.alert("Invalid URL", "Please enter a valid backend URL.");
      return;
    }
    await setApiUrl(urlInput.trim());
    setTestResult(null);
    Alert.alert("Saved", "API URL has been updated.");
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const result = await api.testConnection(urlInput);
    setTestResult(result);
    setTesting(false);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header card */}
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons name="server" size={28} color="#6366f1" />
          </View>
          <Text style={styles.cardTitle}>Backend Server</Text>
          <Text style={styles.cardSubtitle}>
            Configure the API URL for your Life Management backend.
          </Text>

          {/* URL Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>API BASE URL</Text>
            <TextInput
              style={styles.input}
              value={urlInput}
              onChangeText={setUrlInput}
              placeholder="e.g. https://your-app.vercel.app"
              placeholderTextColor="#64748b"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.testBtn}
              onPress={handleTest}
              disabled={testing}
            >
              {testing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="flash" size={16} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.testBtnText}>Test Connection</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Test Result Message */}
          {testResult && (
            <View
              style={[
                styles.resultBox,
                testResult.ok ? styles.resultSuccess : styles.resultError,
              ]}
            >
              <Ionicons
                name={testResult.ok ? "checkmark-circle" : "alert-circle"}
                size={20}
                color={testResult.ok ? "#10b981" : "#ef4444"}
              />
              <Text
                style={[
                  styles.resultText,
                  { color: testResult.ok ? "#10b981" : "#ef4444" },
                ]}
              >
                {testResult.message}
                {testResult.count !== undefined && ` (${testResult.count} boards loaded)`}
              </Text>
            </View>
          )}
        </View>

        {/* Tips & Instructions Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Tips for Testing:</Text>
          <Text style={styles.infoText}>
            • <Text style={styles.bold}>From your iPhone/Android via Expo Go:</Text> Your phone cannot reach <Text style={styles.code}>localhost</Text>. Use your computer's local Wi-Fi IP (e.g. <Text style={styles.code}>http://192.168.1.X:3000</Text>) or your deployed Vercel URL.
          </Text>
          <Text style={styles.infoText}>
            • <Text style={styles.bold}>When deployed on Vercel:</Text> Set the URL to <Text style={styles.code}>https://your-project.vercel.app</Text> and you can access your tasks anywhere with internet.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b0f19",
  },
  content: {
    padding: 20,
    gap: 16,
  },
  card: {
    backgroundColor: "#1e293b",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#334155",
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#6366f120",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#f8fafc",
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#94a3b8",
    marginTop: 4,
    lineHeight: 20,
  },
  inputGroup: {
    marginTop: 20,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
    letterSpacing: 1,
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#0f172a",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#f8fafc",
    borderWidth: 1,
    borderColor: "#334155",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: "#334155",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: {
    color: "#f8fafc",
    fontWeight: "700",
    fontSize: 14,
  },
  testBtn: {
    flex: 2,
    backgroundColor: "#6366f1",
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  testBtnText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 14,
  },
  resultBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    padding: 12,
    borderRadius: 10,
  },
  resultSuccess: {
    backgroundColor: "#10b98115",
    borderWidth: 1,
    borderColor: "#10b98140",
  },
  resultError: {
    backgroundColor: "#ef444415",
    borderWidth: 1,
    borderColor: "#ef444440",
  },
  resultText: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  infoCard: {
    backgroundColor: "#1e293b80",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#33415550",
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#cbd5e1",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: "#94a3b8",
    lineHeight: 20,
    marginBottom: 8,
  },
  bold: {
    fontWeight: "700",
    color: "#f8fafc",
  },
  code: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    color: "#a5b4fc",
  },
});
