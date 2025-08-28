// src/screens/RatingScreen.tsx
import React from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import Toast from "react-native-toast-message";
import { FontAwesome } from "@expo/vector-icons";

import COLORS from "../style/colours";
import { navigationRef } from "../services/navigationService";
import { getCurrentUser } from "../services/userService";
// ✅ FIX: saveUserHobby lives in notificationService
import { saveUserHobby } from "../services/notificationService";

import type { RootStackParamList } from "../navigation/AppNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "Rating">;

const RatingScreen: React.FC<Props> = ({ route, navigation }) => {
  const { hobby, userId: paramUserId } = route.params || {};
  const [rating, setRating] = React.useState<number>(5);
  const [notes, setNotes] = React.useState<string>("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [resolvedUserId, setResolvedUserId] = React.useState<string | null>(
    paramUserId ?? null
  );

  // Resolve userId if it wasn't passed (just in case)
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      if (!resolvedUserId) {
        try {
          const u = await getCurrentUser();
          if (mounted) setResolvedUserId(u?._id ?? null);
        } catch {}
      }
    })();
    return () => {
      mounted = false;
    };
  }, [resolvedUserId]);

  // Prevent leaving before submit
  React.useEffect(() => {
    const sub = navigation.addListener("beforeRemove", (e) => {
      if (isSubmitting) return; // allow leave after submit pressed
      e.preventDefault();
      Alert.alert(
        "Finish Rating",
        "Please submit your rating before leaving this page.",
        [{ text: "OK", style: "cancel" }]
      );
    });
    return sub;
  }, [navigation, isSubmitting]);

  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (!hobby || !hobby._id) {
      Alert.alert("Missing data", "We couldn’t find the hobby to rate.");
      return;
    }
    if (!resolvedUserId) {
      Alert.alert("Not signed in", "Please log in to submit a rating.");
      return;
    }
    if (rating < 1 || rating > 5) {
      Alert.alert("Invalid rating", "Pick 1 to 5 stars.");
      return;
    }

    try {
      setIsSubmitting(true);
      await saveUserHobby({
        user: resolvedUserId,
        hobby: hobby._id,
        performedAt: new Date().toISOString(),
        rating,
        notes: notes?.trim() || "",
      });

      Toast.show({
        type: "success",
        text1: "Rating Saved",
        text2: "Thanks for submitting your hobby feedback! 🎉",
      });

      // Go somewhere sensible (Home, or back)
      if (navigationRef.isReady()) {
        navigationRef.navigate("Home");
      } else {
        navigation.replace("Home");
      }
    } catch (err) {
      console.error("❌ Rating submission failed:", err);
      setIsSubmitting(false);
      Toast.show({
        type: "error",
        text1: "Error Saving Rating",
        text2: "Please try again later.",
      });
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>
        ⭐ Rate your experience with {hobby?.name ?? "this hobby"}
      </Text>

      <Text style={styles.label}>Rating:</Text>
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((num) => (
          <TouchableOpacity key={num} onPress={() => setRating(num)}>
            <FontAwesome
              name={num <= rating ? "star" : "star-o"}
              size={32}
              color={COLORS.primary}
              style={{ marginHorizontal: 4 }}
            />
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Additional Notes:</Text>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Optional feedback or thoughts"
        style={styles.textArea}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        placeholderTextColor="rgba(0,0,0,0.35)"
      />

      <TouchableOpacity
        style={[styles.button, isSubmitting && { opacity: 0.6 }]}
        onPress={handleSubmit}
        disabled={isSubmitting}
        activeOpacity={0.9}
      >
        <Text style={styles.buttonText}>
          {isSubmitting ? "Saving..." : "Submit Rating"}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 24 },
  header: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 30,
    color: COLORS.primary,
    textAlign: "center",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
  },
  starsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 24,
  },
  textArea: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
    fontSize: 15,
    backgroundColor: COLORS.white,
    color: COLORS.text,
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  buttonText: { color: COLORS.white, fontSize: 16, fontWeight: "bold" },
});

export default RatingScreen;
