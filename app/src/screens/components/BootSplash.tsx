import React from "react";
import { View, ActivityIndicator, Text, StyleSheet, Image } from "react-native";
import COLORS from "../../style/colours";

export default function BootSplash() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hobby Helper</Text>
      <Image
        source={require("../../../assets/title_logo.png")} // ✅ adjust path
        style={{ width: 100, height: 100, marginBottom: 20 }}
      />
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={styles.message}>Starting up…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 20,
  },
  message: { fontSize: 16, color: COLORS.text ?? "#333", marginTop: 20 },
});
