import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import axios from "axios";
import COLORS from "../../style/colours";

import { BACKEND_CONNECTION_STRING } from "../../config";
import { setOnboardingCompleted } from "../../utils/onboardingStorage";
import { setToken as persistToken } from "../../services/tokenManager";

import { useAuth } from "../../context/AuthContext";
import { CompositeNavigationProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { OnboardingStackParamList } from "../../navigation/OnboardingNavigator";
import { RootStackParamList } from "../../navigation/AppNavigator";
import AsyncStorage from "@react-native-async-storage/async-storage";

const availableTags = [
  "Creative",
  "Fitness",
  "Relaxation",
  "Social",
  "Skill-building",
  "Tech",
  "Eco",
  "Wellness",
  "Adventure",
  "Hands-on",
  "Gastronomy",
  "Sustainable",
];

type NavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<OnboardingStackParamList, "OnboardingTags">,
  NativeStackNavigationProp<RootStackParamList>
>;

export default function OnboardingTagsScreen() {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showThanks, setShowThanks] = useState(false);

  const route = useRoute();
  const navigation = useNavigation<NavigationProp>();
  const { name, email, password } = route.params as {
    name: string;
    email: string;
    password: string;
  };

  const { setToken, refreshOnboarding } = useAuth();

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleFinish = async () => {
    if (selectedTags.length === 0) {
      alert("Please select at least one tag.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await axios.post(`${BACKEND_CONNECTION_STRING}/register`, {
        name,
        email,
        password,
        favouriteTags: selectedTags,
      });

      const token = res.data.token;

      // ✅ Persist and set token in context
      await persistToken(token);
      await setToken(token); // <- this updates context

      // ✅ Delay to ensure context updates before checking onboarding
      await setOnboardingCompleted();
      await refreshOnboarding();

      // ✅ Thanks screen AFTER everything is definitely ready
      setShowThanks(true);

      setTimeout(async () => {
        const stored = await AsyncStorage.getItem("postLoginRedirect");
        if (stored) {
          const { screen, params } = JSON.parse(stored);
          await AsyncStorage.removeItem("postLoginRedirect");
          navigation.replace(screen, params);
        } else {
          navigation.replace("Home");
        }
      }, 2000);
    } catch (err) {
      console.error("❌ Registration failed:", err);
      alert("Registration failed. Please try again.");
      setIsSubmitting(false);
    }
  };

  if (showThanks) {
    return (
      <View style={styles.thankYouContainer}>
        <Text style={styles.title}>🎉 Thanks for joining HobbyHelper!</Text>
        <Text style={styles.subtitle}>You're all set. Redirecting...</Text>
        <ActivityIndicator
          size="large"
          color={COLORS.primary}
          style={{ marginTop: 20 }}
        />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Almost done!</Text>
      <Text style={styles.subtitle}>Select a few tags that describe you:</Text>

      <View style={styles.tagsContainer}>
        {availableTags.map((tag) => (
          <TouchableOpacity
            key={tag}
            style={[
              styles.tag,
              selectedTags.includes(tag) && styles.tagSelected,
            ]}
            onPress={() => toggleTag(tag)}
          >
            <Text
              style={[
                styles.tagText,
                selectedTags.includes(tag) && styles.tagTextSelected,
              ]}
            >
              {tag}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        onPress={handleFinish}
        style={styles.button}
        disabled={isSubmitting}
      >
        <Text style={styles.buttonText}>
          {isSubmitting ? "Finishing..." : "Finish Onboarding"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: COLORS.background,
    alignItems: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 30,
    textAlign: "center",
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginBottom: 30,
  },
  tag: {
    borderColor: COLORS.primary,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    margin: 6,
    backgroundColor: COLORS.white,
  },
  tagSelected: {
    backgroundColor: COLORS.primary,
  },
  tagText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "500",
  },
  tagTextSelected: {
    color: COLORS.white,
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 10,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "600",
  },
  thankYouContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
    padding: 20,
  },
});
