import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  Image,
  Alert,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { setToken } from "../services/tokenManager";
import { loginUser, getCurrentUser } from "../services/userService";
import COLORS from "../style/colours"; // ✅ Import color palette
import AsyncStorage from "@react-native-async-storage/async-storage"; // For storing redirect info
import api from "../services/api"; // Assuming you have an API service set up
import { setOnboardingCompleted } from "../utils/onboardingStorage";

const LoginScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { setUser, setToken: setGlobalToken, refreshOnboarding } = useAuth();

  const handleLogin = async () => {
    try {
      const response = await api.post("/login", { email, password });
      const token = response.data.token;

      await setToken(token); // persist to storage
      await setGlobalToken(token); // set in context

      // ✅ Ensure onboarding flag is set
      await setOnboardingCompleted();

      // ✅ Now the refresh will correctly pick it up
      await refreshOnboarding();

      // Redirect logic
      const stored = await AsyncStorage.getItem("postLoginRedirect");
      if (stored) {
        const { screen, params } = JSON.parse(stored);
        await AsyncStorage.removeItem("postLoginRedirect");
        navigation.replace(screen, params);
      } else {
        navigation.replace("Home");
      }
    } catch (err) {
      console.error("Login failed:", err);
      Alert.alert(
        "Login Failed",
        "Please check your credentials and try again."
      );
    }
  };

  return (
    <View style={styles.container}>
      <Image
        source={require("../../assets/hobbyHelper_hometitle.png")} // ✅ Use your app logo
        style={styles.image}
      />

      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        onChangeText={setEmail}
        value={email}
        autoCapitalize="none"
        placeholder="Enter your email"
        placeholderTextColor={COLORS.black}
      />

      <Text style={styles.label}>Password</Text>
      <TextInput
        style={styles.input}
        onChangeText={setPassword}
        value={password}
        secureTextEntry
        placeholder="Enter your password"
        placeholderTextColor={COLORS.black}
      />

      <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    backgroundColor: COLORS.background,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    color: COLORS.primary,
  },
  image: {
    width: 250,
    height: 150,
    alignSelf: "center",
  },
  label: {
    fontSize: 16,
    marginBottom: 6,
    fontWeight: "500",
    color: COLORS.text,
  },
  input: {
    height: 48,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    marginBottom: 20,
    backgroundColor: COLORS.white,
    color: COLORS.text,
  },
  loginButton: {
    backgroundColor: COLORS.action,
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: "center",
    marginBottom: 20,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "600",
  },
  registerButton: {
    alignItems: "center",
  },
  registerText: {
    color: COLORS.secondary,
    fontSize: 16,
    fontWeight: "600",
  },
});

export default LoginScreen;
