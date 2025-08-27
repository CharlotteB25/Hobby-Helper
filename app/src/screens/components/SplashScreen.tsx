// src/screens/SplashScreen.tsx
import React from "react";
import { View, Text, ActivityIndicator, StyleSheet, Image } from "react-native";
import COLORS from "../../style/colours";

export default function SplashScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hobby Helper</Text>
      <Image
        source={require("../../../assets/hobbyHelper_logo.png")}
        style={{ width: 100, height: 100 }}
      />
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: 20,
  },
});
