// src/screens/components/SplashScreen.tsx
import React, { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet, Image, Text } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../../context/AuthContext";
import { useNavigation, useRoute } from "@react-navigation/native";
import COLORS from "../../style/colours";

const POST_AUTH_NEXT_KEY = "postAuthNext";

type Props = { mode?: "route" | "visual" };

export default function SplashScreen({ mode = "route" }: Props) {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { loadCurrentUser } = useAuth();

  useEffect(() => {
    if (mode !== "route") return; // ← no navigation in visual mode

    (async () => {
      try {
        if (typeof loadCurrentUser === "function") {
          await loadCurrentUser(); // may logout() on 401
        }

        let next = route?.params?.next ?? null;
        if (!next) {
          const raw = await AsyncStorage.getItem(POST_AUTH_NEXT_KEY);
          next = raw ? JSON.parse(raw) : null;
        }
        await AsyncStorage.removeItem(POST_AUTH_NEXT_KEY);

        if (next?.screen) {
          navigation.reset({
            index: 0,
            routes: [{ name: next.screen, params: next.params }],
          });
        } else {
          // Only hard-reset to Home if we're actually on the Splash route.
          // If we got here mistakenly, try to just go back.
          if (navigation.canGoBack()) {
            navigation.goBack();
            return;
          }
          navigation.reset({ index: 0, routes: [{ name: "Home" }] });
        }
      } catch (e) {
        console.error("Splash load error:", e);
        navigation?.reset?.({ index: 0, routes: [{ name: "Home" }] });
      }
    })();
  }, [mode, navigation, route?.params?.next, loadCurrentUser]);

  return (
    <View style={styles.container} accessibilityRole="progressbar">
      <Text style={styles.title}>Hobby Helper</Text>

      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={styles.message}>
        Getting hobbies ready for you… please wait ✨
      </Text>
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
  message: {
    fontSize: 16,
    color: COLORS.text ?? "#333",
    marginTop: 20,
    textAlign: "center",
    paddingHorizontal: 20,
  },
});
