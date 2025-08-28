// src/screens/LoginScreen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import COLORS from "../style/colours";
import { useAuth } from "../context/AuthContext";
import { loginUser } from "../services/userService";

const POST_AUTH_NEXT_KEY = "postAuthNext";

type Props = { navigation: any };

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { setToken, loadCurrentUser } = useAuth();

  const handleLogin = async () => {
    try {
      if (!email || !password) {
        Alert.alert("Missing info", "Please enter email and password.");
        return;
      }

      // Call your backend login
      const res: any = await loginUser(email, password);

      // Be tolerant to different token field names
      const token: string | undefined =
        res?.token || res?.jwt || res?.accessToken;

      if (!token) {
        Alert.alert("Login failed", "No token returned from server.");
        return;
      }

      // Persist token (this also sets axios Authorization header via context)
      await setToken(token);

      // Optional: hydrate user/profile so Home can react immediately
      if (typeof loadCurrentUser === "function") {
        try {
          await loadCurrentUser();
        } catch {}
      }

      // Resume pending deep-link/redirect if present (e.g., from HobbyList gate)
      const rawNext = await AsyncStorage.getItem(POST_AUTH_NEXT_KEY);
      const next = rawNext ? JSON.parse(rawNext) : null;
      await AsyncStorage.removeItem(POST_AUTH_NEXT_KEY);

      if (next?.screen) {
        navigation.reset({
          index: 0,
          routes: [{ name: next.screen, params: next.params }],
        });
      } else {
        navigation.reset({ index: 0, routes: [{ name: "Home" }] });
      }
    } catch (e: any) {
      console.error("Login failed:", e);
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "Please check your credentials and try again.";
      Alert.alert("Login failed", msg);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome back</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        placeholderTextColor="#999"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        placeholderTextColor="#999"
      />

      <TouchableOpacity style={styles.primaryBtn} onPress={handleLogin}>
        <Text style={styles.primaryBtnText}>Log in</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.linkBtn}
        onPress={() => navigation.navigate("Onboarding")}
      >
        <Text style={styles.linkText}>New here? Complete onboarding</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: COLORS.background,
    justifyContent: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: COLORS.text,
    marginBottom: 16,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    color: COLORS.text,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 6,
  },
  primaryBtnText: { color: "#fff", fontWeight: "900", fontSize: 16 },
  linkBtn: { paddingVertical: 14, alignItems: "center" },
  linkText: { color: COLORS.primary, fontWeight: "700" },
});
