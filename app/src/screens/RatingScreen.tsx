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
import COLORS from "../style/colours";
import { saveUserHobby } from "../services/userService";
import { navigationRef } from "../services/navigationService";
import Toast from "react-native-toast-message";
import { FontAwesome } from "@expo/vector-icons";
import type { RootStackParamList } from "../navigation/AppNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "Rating">;

const RatingScreen: React.FC<Props> = ({ route, navigation }) => {
  const { hobby, userId } = route.params;

  const [rating, setRating] = React.useState(5);
  const [notes, setNotes] = React.useState("");
  const [isSubmitted, setIsSubmitted] = React.useState(false);

  React.useEffect(() => {
    const sub = navigation.addListener("beforeRemove", (e) => {
      if (isSubmitted) return;
      e.preventDefault();
      Alert.alert(
        "Finish Rating",
        "You must submit your rating before leaving this page.",
        [{ text: "OK", style: "cancel" }]
      );
    });
    return sub;
  }, [navigation, isSubmitted]);

  const handleSubmit = async () => {
    try {
      await saveUserHobby({
        user: userId,
        hobby: hobby._id!,
        performedAt: new Date().toISOString(),
        rating,
        notes,
      });

      setIsSubmitted(true);
      Toast.show({
        type: "success",
        text1: "Rating Saved",
        text2: "Thanks for submitting your hobby feedback! 🎉",
      });

      navigationRef.navigate("Home");
    } catch (err) {
      console.error("❌ Rating submission failed:", err);
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
        ⭐ Rate your experience with {hobby.name}
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
      />

      <TouchableOpacity style={styles.button} onPress={handleSubmit}>
        <Text style={styles.buttonText}>Submit Rating</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 24 },
  header: {
    fontSize: 22,
    fontWeight: "600",
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
    borderColor: COLORS.primary || COLORS.primary,
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
    fontSize: 15,
    backgroundColor: COLORS.white,
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
