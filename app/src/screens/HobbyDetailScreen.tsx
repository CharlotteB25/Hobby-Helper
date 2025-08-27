import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  Alert,
  Modal,
  Button,
  TextInput,
  TouchableOpacity,
  Linking,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { WebView } from "react-native-webview";
import COLORS from "../style/colours";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";

import { scheduleRatingReminder } from "../services/notificationService";
import { hasCompletedOnboarding } from "../utils/onboardingStorage";
import { getCurrentUser, updateUser } from "../services/userService";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "HobbyDetail">;

const HobbyDetailScreen = ({ route, navigation }: Props) => {
  const { hobby, showRatingModal } = route.params;
  const firstLocation = hobby.locations[0];
  const beginnerVideo = hobby.difficultyLevels.find(
    (d) => d.level === "Beginner"
  )?.youtubeLinks[0];

  const [hasStarted, setHasStarted] = useState(false);
  const [showModal, setShowModal] = useState(showRatingModal || false);
  const [ratingInput, setRatingInput] = useState("");

  useEffect(() => {
    const checkIfStarted = async () => {
      const started = await AsyncStorage.getItem(`startedHobby:${hobby._id}`);
      setHasStarted(!!started);
    };
    checkIfStarted();
  }, []);

  useEffect(() => {
    if (showRatingModal) setShowModal(true);
  }, [showRatingModal]);

  const handleStartHobby = async () => {
    const token = await AsyncStorage.getItem("token");
    const onboarded = await hasCompletedOnboarding();

    Toast.show({
      type: "success",
      text1: "⏳ Reminder Set",
      text2: "We'll remind you to rate this hobby in 2 hours.",
    });

    /* if (!token || !onboarded) {
      navigation.navigate("Onboarding");
      return;
    } */

    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      if (hobby._id) {
        await scheduleRatingReminder(hobby._id, 7200); // 2 hours in seconds
      } else {
        throw new Error("Hobby ID is missing.");
      }
      await AsyncStorage.setItem(`startedHobby:${hobby._id}`, "true");
      setHasStarted(true);

      Alert.alert("Enjoy your hobby!", "We'll remind you to rate it later.");
    } catch (error) {
      console.error("Failed to start hobby:", error);
      Alert.alert("Oops!", "Failed to schedule the reminder.");
    }
  };

  const handleCompleteHobby = async () => {
    try {
      await AsyncStorage.removeItem(`startedHobby:${hobby._id}`);
      await Notifications.cancelAllScheduledNotificationsAsync();

      const user = await getCurrentUser();
      const updatedHistory = [
        ...(user.hobbyHistory || []),
        {
          id: Date.now(),
          name: hobby.name || "Unknown Hobby",
          date: new Date().toISOString(),
          rating: 0,
        },
      ];

      await updateUser({ ...user, hobbyHistory: updatedHistory });

      Toast.show({
        type: "success",
        text1: "✅ Hobby Complete",
        text2: "Saved to your profile history!",
      });

      setHasStarted(false);
    } catch (error) {
      console.error("Error finishing hobby:", error);
      Alert.alert("Oops", "Could not complete the hobby.");
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Modal
        visible={showModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={{ fontSize: 18, fontWeight: "bold" }}>
              Rate your hobby
            </Text>
            <TextInput
              placeholder="How many stars (1–5)?"
              keyboardType="numeric"
              value={ratingInput}
              onChangeText={setRatingInput}
              style={{
                borderBottomWidth: 1,
                width: "100%",
                marginVertical: 12,
              }}
            />
            <Button
              title="Submit"
              onPress={async () => {
                const rating = parseInt(ratingInput);
                if (isNaN(rating) || rating < 1 || rating > 5) {
                  Alert.alert(
                    "Invalid Rating",
                    "Enter a number between 1 and 5."
                  );
                  return;
                }

                try {
                  const user = await getCurrentUser();
                  const updatedHistory = [
                    ...(user.hobbyHistory || []),
                    {
                      id: Date.now(),
                      name: hobby.name,
                      date: new Date().toISOString(),
                      duration: "2 hours",
                      rating,
                    },
                  ];

                  await updateUser({ ...user, hobbyHistory: updatedHistory });
                  Toast.show({
                    type: "success",
                    text1: "🎉 Rating Saved",
                    text2: "Your rating was added to your history!",
                  });
                  setShowModal(false);
                  setRatingInput("");
                } catch (err) {
                  console.error("Failed to save rating:", err);
                  Alert.alert("Error", "Could not save your rating.");
                }
              }}
            />
          </View>
        </View>
      </Modal>

      {/* Map */}
      <View style={styles.heroContainer}>
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: firstLocation.lat,
            longitude: firstLocation.lng,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          scrollEnabled={false}
        >
          <Marker
            coordinate={{
              latitude: firstLocation.lat,
              longitude: firstLocation.lng,
            }}
            title={firstLocation.name}
            description={firstLocation.address}
          />
        </MapView>
        <View style={styles.overlay}>
          <Text style={styles.heroTitle}>{hobby.name}</Text>
          <Text style={styles.heroSubtitle}>{firstLocation.name}</Text>
        </View>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={() => {
            const url = `https://www.google.com/maps/search/?api=1&query=${firstLocation.lat},${firstLocation.lng}`;
            Linking.openURL(url);
          }}
        />
        <View style={styles.mapHintContainer}>
          <Text style={styles.mapHintText}>📍 Tap to open in Maps</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.description}>{hobby.description}</Text>
        <View style={styles.tagsContainer}>
          {hobby.tags.map((tag, index) => (
            <View style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.sectionDivider} />

      {/* Info Grid */}
      <View style={styles.grid}>
        <InfoBox label="Cost" value={hobby.costEstimate} />
        <InfoBox
          label="Equipment"
          value={hobby.equipment.join(", ") || "None"}
        />
        <InfoBox
          label="Accessibility"
          value={hobby.wheelchairAccessible ? "Yes" : "No"}
        />
        <InfoBox
          label="Eco-Friendly"
          value={hobby.ecoFriendly ? "Yes" : "No"}
        />
        <InfoBox
          label="Trial Available"
          value={firstLocation.trialAvailable ? "Yes" : "No"}
        />
        <InfoBox label="Safety Notes" value={hobby.safetyNotes || "None"} />
      </View>

      <View style={styles.sectionDivider} />

      {/* Video */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Watch: Beginner Demo</Text>
        {beginnerVideo ? (
          <WebView
            style={styles.video}
            source={{ uri: beginnerVideo.replace("watch?v=", "embed/") }}
          />
        ) : (
          <Text style={styles.description}>No video available.</Text>
        )}
      </View>

      <Text style={styles.descriptionHint}>
        {hasStarted
          ? "You're currently doing this hobby."
          : "Start this activity now and get a reminder to rate it later."}
      </Text>

      {!hasStarted ? (
        <TouchableOpacity style={styles.startButton} onPress={handleStartHobby}>
          <Text style={styles.startButtonText}>Start Hobby</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.startButton, { backgroundColor: COLORS.action }]}
          onPress={handleCompleteHobby}
        >
          <Text style={styles.startButtonText}>Done with Hobby</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const InfoBox = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.gridItem}>
    <Text style={styles.gridLabel}>{label}</Text>
    <Text style={styles.gridValue}>{value}</Text>
  </View>
);

// Reuse your existing styles object...

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  heroContainer: {
    height: 250,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    width: "90%",
    backgroundColor: COLORS.white,
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 16,
  },
  heroTitle: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: "bold",
  },
  heroSubtitle: {
    color: COLORS.white,
    fontSize: 16,
    marginTop: 4,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 10,
    color: COLORS.primary,
  },
  description: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 10,
    color: COLORS.text,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 15,
    gap: 8,
  },

  tag: {
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 20,
  },

  tagText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "600",
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between", // distributes items evenly across each row
    paddingHorizontal: 20,
  },
  gridItem: {
    width: "48%", // two per row with spacing
    marginBottom: 16,
    padding: 12,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    // remove marginRight — no longer needed
    alignItems: "center", // ✅ center content inside each card
  },

  gridLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primary,
  },
  gridValue: {
    fontSize: 14,
    color: COLORS.text,
  },
  equipmentList: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 8,
  },
  equipmentTag: {
    backgroundColor: COLORS.background || "#f1f1f1",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    margin: 4,
  },
  equipmentText: {
    fontSize: 13,
    color: COLORS.text,
  },

  sectionDivider: {
    height: 1,
    backgroundColor: COLORS.border || "#ccc",
    marginVertical: 20,
    marginHorizontal: 20,
  },
  descriptionHint: {
    textAlign: "center",
    marginHorizontal: 20,
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 10,
  },
  mapHintContainer: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },

  mapHintText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "500",
  },

  video: {
    height: 200,
    width: Dimensions.get("window").width - 40,
    alignSelf: "center",
    marginVertical: 10,
  },
  startButton: {
    backgroundColor: COLORS.primary,
    padding: 15,
    margin: 20,
    borderRadius: 30,
    alignItems: "center",
  },
  startButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "bold",
  },
});

export default HobbyDetailScreen;
