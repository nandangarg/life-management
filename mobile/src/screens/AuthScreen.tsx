import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { useSignIn, useSignUp } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";

export function AuthScreen() {
  const { isLoaded: isSignInLoaded, signIn, setActive: setSignInActive } = useSignIn();
  const { isLoaded: isSignUpLoaded, signUp, setActive: setSignUpActive } = useSignUp();

  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!isSignInLoaded) return;
    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing details", "Please enter your email and password.");
      return;
    }

    setLoading(true);
    try {
      const result = await signIn.create({
        identifier: email.trim(),
        password: password.trim(),
      });

      if (result.status === "complete") {
        await setSignInActive({ session: result.createdSessionId });
      } else {
        console.log("Sign in status:", result.status);
      }
    } catch (err: any) {
      console.error("Sign in error:", err);
      Alert.alert("Sign In Failed", err.errors?.[0]?.message || err.message || "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!isSignUpLoaded) return;
    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing details", "Please enter your email and password.");
      return;
    }

    setLoading(true);
    try {
      await signUp.create({
        emailAddress: email.trim(),
        password: password.trim(),
      });

      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (err: any) {
      console.error("Sign up error:", err);
      Alert.alert("Sign Up Failed", err.errors?.[0]?.message || err.message || "Failed to create account.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!isSignUpLoaded) return;
    if (!code.trim()) {
      Alert.alert("Missing code", "Please enter the verification code sent to your email.");
      return;
    }

    setLoading(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({
        code: code.trim(),
      });

      if (result.status === "complete") {
        await setSignUpActive({ session: result.createdSessionId });
      } else {
        console.log("Verification status:", result.status);
      }
    } catch (err: any) {
      console.error("Verification error:", err);
      Alert.alert("Verification Failed", err.errors?.[0]?.message || err.message || "Incorrect code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Brand */}
        <View style={styles.brandBox}>
          <View style={styles.logoCircle}>
            <Ionicons name="sparkles" size={28} color="#6366f1" />
          </View>
          <Text style={styles.appName}>Life Management</Text>
          <Text style={styles.appSub}>Sign in to sync your tasks and calendar</Text>
        </View>

        {pendingVerification ? (
          /* Email Verification Code View */
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Verify Your Email</Text>
            <Text style={styles.cardSub}>We sent a verification code to {email}</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>VERIFICATION CODE</Text>
              <TextInput
                style={styles.input}
                value={code}
                onChangeText={setCode}
                placeholder="123456"
                placeholderTextColor="#64748b"
                keyboardType="number-pad"
                autoFocus
              />
            </View>

            <TouchableOpacity style={styles.submitBtn} onPress={handleVerifyCode} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Verify & Continue</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => setPendingVerification(false)}
            >
              <Text style={styles.backBtnText}>Back to Sign Up</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Sign In / Sign Up Form */
          <View style={styles.card}>
            {/* Mode Toggle */}
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[styles.toggleBtn, mode === "signIn" && styles.toggleBtnActive]}
                onPress={() => setMode("signIn")}
              >
                <Text style={[styles.toggleText, mode === "signIn" && styles.toggleTextActive]}>
                  Sign In
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, mode === "signUp" && styles.toggleBtnActive]}
                onPress={() => setMode("signUp")}
              >
                <Text style={[styles.toggleText, mode === "signUp" && styles.toggleTextActive]}>
                  Create Account
                </Text>
              </TouchableOpacity>
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor="#64748b"
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
              />
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PASSWORD</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#64748b"
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={mode === "signIn" ? handleSignIn : handleSignUp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {mode === "signIn" ? "Sign In" : "Create Account"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b0f19",
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  brandBox: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#6366f120",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  appName: {
    fontSize: 24,
    fontWeight: "800",
    color: "#f8fafc",
  },
  appSub: {
    fontSize: 14,
    color: "#94a3b8",
    marginTop: 4,
    textAlign: "center",
  },
  card: {
    backgroundColor: "#1e293b",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#334155",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#f8fafc",
  },
  cardSub: {
    fontSize: 13,
    color: "#94a3b8",
    marginTop: 4,
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: "row",
    backgroundColor: "#0f172a",
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: "#6366f1",
  },
  toggleText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#94a3b8",
  },
  toggleTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
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
  submitBtn: {
    backgroundColor: "#6366f1",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  submitBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  backBtn: {
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 8,
  },
  backBtnText: {
    color: "#94a3b8",
    fontSize: 13,
  },
});
