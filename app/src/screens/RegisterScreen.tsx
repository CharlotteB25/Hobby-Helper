import { useState } from "react";
import { View, Text, TextInput, Button, Alert, StyleSheet } from "react-native";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const RegisterScreen = ({ navigation }: any) => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { setUser, setToken } = useAuth();

  const handleRegister = async () => {
    try {
      const res = await api.post("/register", { username, email, password });
      console.log("Register response:", res.data.token);

      await setToken(res.data.token);
      const userRes = await api.get("/users/current");
      setUser(userRes.data);
      navigation.replace("Home");
    } catch (err) {
      Alert.alert("Registration failed", "Please check your input.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Username</Text>
      <TextInput
        style={styles.input}
        onChangeText={setUsername}
        value={username}
        placeholder="Choose a username"
      />

      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        onChangeText={setEmail}
        value={email}
        autoCapitalize="none"
        placeholder="Enter your email"
      />

      <Text style={styles.label}>Password</Text>
      <TextInput
        style={styles.input}
        onChangeText={setPassword}
        value={password}
        secureTextEntry
        placeholder="Create a password"
      />

      <View style={styles.buttonWrapper}>
        <Button title="Register" onPress={handleRegister} />
      </View>

      <View style={styles.buttonWrapper}>
        <Button title="Login" onPress={() => navigation.navigate("Login")} />
      </View>

      <Text style={styles.footerText}>Already have an account? Login now!</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  label: {
    fontSize: 16,
    marginBottom: 4,
    fontWeight: "500",
  },
  input: {
    height: 44,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 16,
  },
  buttonWrapper: {
    marginBottom: 12,
  },
  footerText: {
    marginTop: 20,
    textAlign: "center",
    fontSize: 14,
    color: "#555",
  },
});

export default RegisterScreen;
// This code defines a RegisterScreen component for a React Native application.
// It allows users to register by entering their username, email, and password.
