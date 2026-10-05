import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { ClerkProvider, ClerkLoaded, SignedIn, SignedOut, useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { tokenCache } from "./src/lib/tokenCache";
import { AuthScreen } from "./src/screens/AuthScreen";
import { TodayScreen } from "./src/screens/TodayScreen";
import { TasksScreen } from "./src/screens/TasksScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { setAuthTokenProvider } from "./src/api/client";

const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || "";

type Tab = "today" | "tasks" | "settings";

function MainContent() {
  const [activeTab, setActiveTab] = useState<Tab>("today");
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0b0f19" />

      {/* App Header */}
      <View style={styles.appHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.brandContainer}>
            <View style={styles.brandIcon}>
              <Ionicons name="sparkles" size={14} color="#6366f1" />
            </View>
            <Text style={styles.brandTitle}>Life Management</Text>
          </View>
          <Text style={styles.screenTitle}>
            {activeTab === "today" ? "Today's Agenda" : activeTab === "tasks" ? "Task Boards" : "Settings"}
          </Text>
        </View>

        {/* Header Settings Shortcut Button */}
        <TouchableOpacity
          style={[styles.headerSettingsBtn, activeTab === "settings" && styles.headerSettingsBtnActive]}
          onPress={() => setActiveTab(activeTab === "settings" ? "today" : "settings")}
          hitSlop={8}
        >
          <Ionicons
            name={activeTab === "settings" ? "close" : "settings-outline"}
            size={22}
            color={activeTab === "settings" ? "#ffffff" : "#94a3b8"}
          />
        </TouchableOpacity>
      </View>

      {/* Active Screen */}
      <View style={styles.screenContainer}>
        {activeTab === "today" && (
          <TodayScreen onOpenSettings={() => setActiveTab("settings")} />
        )}
        {activeTab === "tasks" && <TasksScreen />}
        {activeTab === "settings" && <SettingsScreen />}
      </View>

      {/* Bottom Navigation Tab Bar with safe padding */}
      <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom + 8, 20) }]}>
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => setActiveTab("today")}
          activeOpacity={0.7}
        >
          <Ionicons
            name={activeTab === "today" ? "calendar" : "calendar-outline"}
            size={22}
            color={activeTab === "today" ? "#6366f1" : "#64748b"}
          />
          <Text style={[styles.tabLabel, activeTab === "today" && styles.tabLabelActive]}>
            Today
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => setActiveTab("tasks")}
          activeOpacity={0.7}
        >
          <Ionicons
            name={activeTab === "tasks" ? "list-circle" : "list-circle-outline"}
            size={24}
            color={activeTab === "tasks" ? "#6366f1" : "#64748b"}
          />
          <Text style={[styles.tabLabel, activeTab === "tasks" && styles.tabLabelActive]}>
            Tasks
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => setActiveTab("settings")}
          activeOpacity={0.7}
        >
          <Ionicons
            name={activeTab === "settings" ? "settings" : "settings-outline"}
            size={22}
            color={activeTab === "settings" ? "#6366f1" : "#64748b"}
          />
          <Text style={[styles.tabLabel, activeTab === "settings" && styles.tabLabelActive]}>
            Settings
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function AuthenticatedApp() {
  const { getToken } = useAuth();

  useEffect(() => {
    setAuthTokenProvider(() => getToken());
  }, [getToken]);

  return <MainContent />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ClerkProvider
        publishableKey={CLERK_PUBLISHABLE_KEY}
        tokenCache={tokenCache}
      >
        <ClerkLoaded>
          <SignedIn>
            <AuthenticatedApp />
          </SignedIn>
          <SignedOut>
            <AuthScreen />
          </SignedOut>
        </ClerkLoaded>
      </ClerkProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b0f19",
  },
  appHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
    backgroundColor: "#0b0f19",
  },
  headerLeft: {
    flex: 1,
  },
  brandContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  brandIcon: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: "#6366f120",
    alignItems: "center",
    justifyContent: "center",
  },
  brandTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6366f1",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#f8fafc",
  },
  headerSettingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },
  headerSettingsBtnActive: {
    backgroundColor: "#6366f1",
    borderColor: "#6366f1",
  },
  screenContainer: {
    flex: 1,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#0f172a",
    borderTopWidth: 1,
    borderTopColor: "#1e293b",
    paddingTop: 12,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748b",
  },
  tabLabelActive: {
    color: "#6366f1",
    fontWeight: "700",
  },
});
