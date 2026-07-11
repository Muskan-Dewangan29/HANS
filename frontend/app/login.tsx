import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import API_URL from "../config/server";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "react-native";

// Get device height for animation container
const { height: screenHeight } = Dimensions.get("window");

const Login: React.FC = () => {
  const router = useRouter();
  // ---------- STATE ----------
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Forgot Password States
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  // ---------- ANIMATIONS ----------
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // ---------- LOGIN FUNCTION ----------
  const signInWithEmail = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password");
      return;
    }

    setLoading(true);
    
    try {
      const payload = { email: email.trim(), password: password.trim() };
      const response = await fetch(`${API_URL}/api/login.php`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch (err) {
        Alert.alert("Error", "Invalid response from server");
        setLoading(false);
        return;
      }
      if (result.success && result.user) {
        const user = result.user;
        // Store user info in AsyncStorage
        await AsyncStorage.setItem("user_id", String(user.id));
        await AsyncStorage.setItem("user_role", user.role);
        await AsyncStorage.setItem("user_name", user.name);
        await AsyncStorage.setItem("user_email", user.email);

        Alert.alert("Success", "Login successful!");
        // Redirect based on role
        switch (user.role) {
          case "student":
            router.replace("/StudentDashboard");
            break;
          case "parent":
            router.replace("/ParentDashboard");
            break;
          case "warden":
            router.replace("/WardenDashboard");
            break;
          case "admin":
            router.replace("/AdminDashboard");
            break;
          default:
            Alert.alert("Error", "Unknown role. Please contact admin.");
            break;
        }
      } else {
        Alert.alert("Error", result.message || "Invalid credentials");
      }
    } catch (error) {
      console.error("Login error:", error);
      Alert.alert("Error", "Cannot connect to server");
    }

    setLoading(false);
  };
  
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#fff' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, padding: 0 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
      >
      <Animated.View
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], width: '100%', height: screenHeight }}
      >
        <View style={styles.card}>
          {/* LOGO */}
          <Image
            source={require("../assets/logo.jpg")}
            style={styles.logo}
          />
          {/* TITLE */}
          <Text style={styles.title}>HANS</Text>
          <Text style={styles.subtitle1}>Hostel Authentication & Notification System</Text>
          {/* SUBTITLE */}
          <Text style={styles.subtitle}>
            {showForgot ? "Reset your Password" : "Sign in to your Account"}
          </Text>

          {/* ---------- LOGIN FIELDS ---------- */}
            {!showForgot && (
              <>
                {/* Email Label + Input */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    style={styles.input}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>

                {/* Password Label + Input */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={styles.label}>Password</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={[styles.input, { flex: 1, marginBottom: 0, borderWidth: 0 }]}
                      secureTextEntry={!showPassword}
                      value={password}
                      onChangeText={setPassword}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                      <Ionicons
                        name={showPassword ? "eye-off" : "eye"}
                        size={22}
                        color="#6b7280"
                        style={{ paddingHorizontal: 10 }}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Forgot Password Button */}
                <TouchableOpacity
                  onPress={() => setShowForgot(true)}
                  style={{ alignSelf: "flex-end", marginBottom: 12 }}
                >
                  <Text style={{ color: "#2563EB", fontWeight: "bold" }}>
                    Forgot Password?
                  </Text>
                </TouchableOpacity>

                {/* Sign In Button */}
                <TouchableOpacity
                  style={styles.primary}
                  onPress={signInWithEmail}
                  disabled={loading}
                >
                  <Text style={styles.primaryText}>
                    {loading ? "Please wait..." : "Sign In"}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {/* ---------- FORGOT PASSWORD FIELDS ---------- */}
            {showForgot && (
              <View style={{ marginBottom: 20 }}>
                {/* Email */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={styles.label}>Registered Email</Text>
                  <TextInput
                    style={styles.input}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={forgotEmail}
                    onChangeText={setForgotEmail}
                  />
                </View>

                {/* New Password */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={styles.label}>New Password</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={[styles.input, { flex: 1, borderWidth: 0 }]}
                      secureTextEntry={!showNewPassword}
                      value={newPassword}
                      onChangeText={setNewPassword}
                    />
                    <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
                      <Ionicons
                        name={showNewPassword ? "eye-off" : "eye"}
                        size={22}
                        color="#6b7280"
                        style={{ paddingHorizontal: 10 }}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Confirm New Password */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={styles.label}>Confirm New Password</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={[styles.input, { flex: 1, borderWidth: 0 }]}
                      secureTextEntry={!showConfirmPassword}
                      value={confirmNewPassword}
                      onChangeText={setConfirmNewPassword}
                    />
                    <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                      <Ionicons
                        name={showConfirmPassword ? "eye-off" : "eye"}
                        size={22}
                        color="#6b7280"
                        style={{ paddingHorizontal: 10 }}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Update Password Button */}
                <TouchableOpacity
                  style={[styles.primary, { backgroundColor: "#16a34a" }]}
                  onPress={async () => {
                    if (!forgotEmail || !newPassword || !confirmNewPassword) {
                      Alert.alert("Error", "All fields are required");
                      return;
                    }
                    // Password must be exactly 6 alphanumeric characters
                    const passwordRegex = /^(?=.*[A-Za-z])(?=.*[0-9])[A-Za-z0-9]{6}$/;

                    if (!passwordRegex.test(newPassword)) {
                      Alert.alert(
                        "Invalid Password",
                        "Password must be exactly 6 alphanumeric characters"
                      );
                      return;
                    }
                    if (newPassword !== confirmNewPassword) {
                      Alert.alert("Error", "Passwords do not match");
                      return;
                    }

                    try {
                      const response = await fetch(`${API_URL}/api/login.php`, {
                        method: "POST",
                        headers: {
                          Accept: "application/json",
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                          action: "forgot",
                          email: forgotEmail.trim(),
                          newPassword: newPassword.trim(),
                        }),
                      });

                      const result = await response.json();

                      if (result.success) {
                        Alert.alert("Success", "Password updated successfully");
                        setShowForgot(false);
                        setForgotEmail("");
                        setNewPassword("");
                        setConfirmNewPassword("");
                      } else {
                        Alert.alert("Error", result.message);
                      }
                    } catch (e) {
                      Alert.alert("Error", "Server error");
                    }
                  }}
                >
                  <Text style={styles.primaryText}>Update Password</Text>
                </TouchableOpacity>

                {/* Back to Sign In Button */}
                <TouchableOpacity
                  onPress={() => setShowForgot(false)}
                  style={{ alignSelf: "flex-end", marginTop: 12 }}
                >
                  <Text style={{ color: "#2563EB", fontWeight: "bold" }}>
                    Back to Sign In
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ---------- REGISTER ---------- */}
            <View style={styles.createAccount}>
              <Text style={{ fontSize: 20, marginTop: 20 }}>
                Don't have an account?{" "}
              </Text>
              <TouchableOpacity onPress={() => router.push("/register")}>
                <Text
                  style={{
                    color: "#2563EB",
                    marginTop: 20,
                    fontWeight: "bold",
                    fontSize: 20,
                  }}
                >
                  Create Account
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// ---------- STYLES ----------
const styles = StyleSheet.create({
  card: {
    flex: 1,
    width: "100%",
    backgroundColor: "#fff",
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  label: {
    color: "#6b7280",
    marginBottom: 4,
    fontSize: 16,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 0,
  },
  logo: {
    width: 150,
    height: 150,
    borderRadius: 10,
    alignSelf: "center",
    marginBottom: 24,
  },
  title: { fontSize: 30, fontWeight: "bold", textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 25, textAlign: "center", marginBottom: 16, color: "#6b7280" },
  subtitle1: { fontSize: 20, fontWeight: "bold", textAlign: "center", marginBottom: 50, color: "#6b7280" },
  input: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, padding: 12 },
  primary: { backgroundColor: "#2563EB", padding: 16, borderRadius: 8, alignItems: "center", marginBottom: 12 },
  primaryText: { color: "#fff", fontWeight: "bold" },
  createAccount: { flexDirection: "row", justifyContent: "center", marginTop: 8 },
});

export default Login;