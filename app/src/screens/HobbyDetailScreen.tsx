// src/screens/HobbyDetailScreen.tsx
import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  Alert,
  Modal,
  TextInput,
  TouchableOpacity,
  Linking,
  Platform,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { WebView } from "react-native-webview";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";

import COLORS from "../style/colours";
import { scheduleRatingReminder } from "../services/notificationService";
import { getCurrentUser, updateUser } from "../services/userService";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "HobbyDetail">;

// Soft tints to match the rest of the app
const SOFT = {
  orange: "#fee9dcff",
  green: "#EEF7E9",
  neutral: "#F5F7FA",
};

type DifficultyLevel = { level: string; youtubeLinks?: string[] };
type Location = {
  _id?: string;
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
  trialAvailable?: boolean;
};
type Hobby = {
  _id: string;
  name: string;
  description: string;
  tags: string[];
  costEstimate?: string;
  ecoFriendly?: boolean;
  trialAvailable?: boolean;
  wheelchairAccessible?: boolean;
  equipment?: string[];
  locations?: Location[];
  difficultyLevels?: DifficultyLevel[];
  safetyNotes?: string;
};

const YT_EMBED = (url: string) =>
  url.includes("watch?v=") ? url.replace("watch?v=", "embed/") : url;

export default function HobbyDetailScreen({ route }: Props) {
  const { hobby, showRatingModal } = route.params;
  const firstLocation = hobby.locations?.[0];

  const beginnerVideo = useMemo(() => {
    const link =
      hobby.difficultyLevels?.find((d) => d.level === "Beginner")
        ?.youtubeLinks?.[0] ?? hobby.difficultyLevels?.[0]?.youtubeLinks?.[0];
    return link ? YT_EMBED(link) : null;
  }, [hobby]);

  const [hasStarted, setHasStarted] = useState(false);
  const [showModal, setShowModal] = useState(!!showRatingModal);
  const [ratingInput, setRatingInput] = useState("");

  useEffect(() => {
    (async () => {
      const started = await AsyncStorage.getItem(`startedHobby:${hobby._id}`);
      setHasStarted(!!started);
    })();
  }, [hobby._id]);

  useEffect(() => {
    if (showRatingModal) setShowModal(true);
  }, [showRatingModal]);

  const handleStartHobby = async () => {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      if (!hobby._id) throw new Error("Hobby ID is missing.");

      // schedule in 2 hours (7200 seconds)
      await scheduleRatingReminder(hobby._id, 7200);
      await AsyncStorage.setItem(`startedHobby:${hobby._id}`, "true");
      setHasStarted(true);

      Toast.show({
        type: "success",
        text1: "⏳ Reminder set",
        text2: "We’ll remind you to rate this hobby in 2 hours.",
      });
    } catch (error) {
      console.error("Failed to start hobby:", error);
      Alert.alert("Oops!", "Failed to schedule the reminder.");
    }
  };

  const handleCompleteHobby = async () => {
    try {
      await AsyncStorage.removeItem(`startedHobby:${hobby._id}`);
      await Notifications.cancelAllScheduledNotificationsAsync();

      // Optional: persist to user history (if your API supports it)
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

      setHasStarted(false);
      Toast.show({
        type: "success",
        text1: "✅ Hobby complete",
        text2: "Saved to your profile history!",
      });
    } catch (error) {
      console.error("Error finishing hobby:", error);
      Alert.alert("Oops", "Could not complete the hobby.");
    }
  };

  const openInMaps = () => {
    if (!firstLocation?.lat || !firstLocation?.lng) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${firstLocation.lat},${firstLocation.lng}`;
    Linking.openURL(url).catch(() => {});
  };

  const submitRating = async () => {
    const rating = parseInt(ratingInput, 10);
    if (isNaN(rating) || rating < 1 || rating > 5) {
      Alert.alert("Invalid Rating", "Enter a number between 1 and 5.");
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
        text1: "🎉 Rating saved",
        text2: "Your rating was added to your history!",
      });
      setShowModal(false);
      setRatingInput("");
    } catch (err) {
      console.error("Failed to save rating:", err);
      Alert.alert("Error", "Could not save your rating.");
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      {/* Rating modal */}
      <Modal
        visible={showModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Rate your hobby</Text>
            <TextInput
              placeholder="How many stars (1–5)?"
              keyboardType="numeric"
              value={ratingInput}
              onChangeText={setRatingInput}
              style={styles.modalInput}
              placeholderTextColor="#999"
            />
            <TouchableOpacity
              style={styles.modalPrimary}
              onPress={submitRating}
              activeOpacity={0.9}
            >
              <Text style={styles.modalPrimaryText}>Submit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalGhost}
              onPress={() => setShowModal(false)}
              activeOpacity={0.9}
            >
              <Text style={styles.modalGhostText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Hero map */}
      <View style={styles.hero}>
        {firstLocation?.lat && firstLocation?.lng ? (
          <>
            <MapView
              style={styles.map}
              pointerEvents="none"
              initialRegion={{
                latitude: firstLocation.lat,
                longitude: firstLocation.lng,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
              rotateEnabled={false}
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
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              onPress={openInMaps}
              activeOpacity={1}
            />
            <View style={styles.mapOverlay}>
              <Text style={styles.heroTitle}>{hobby.name}</Text>
              {firstLocation?.name ? (
                <Text style={styles.heroSubtitle}>{firstLocation.name}</Text>
              ) : null}
            </View>
            <View style={styles.mapHint}>
              <Text style={styles.mapHintText}>📍 Tap to open in Maps</Text>
            </View>
          </>
        ) : (
          <View
            style={[
              styles.noMap,
              { justifyContent: "center", alignItems: "center" },
            ]}
          >
            <Text style={styles.heroTitle}>{hobby.name}</Text>
          </View>
        )}
      </View>

      {/* Meta chips */}
      <View style={styles.chips}>
        {hobby.ecoFriendly ? (
          <View style={styles.chip} key="meta-eco">
            <Text style={styles.chipText}>🌿 Eco</Text>
          </View>
        ) : null}
        {hobby.trialAvailable || firstLocation?.trialAvailable ? (
          <View style={styles.chip} key="meta-trial">
            <Text style={styles.chipText}>🆓 Trial</Text>
          </View>
        ) : null}
        {hobby.wheelchairAccessible ? (
          <View style={styles.chip} key="meta-access">
            <Text style={styles.chipText}>♿ Access</Text>
          </View>
        ) : null}
        {hobby.costEstimate ? (
          <View style={styles.chip} key="meta-cost">
            <Text style={styles.chipText}>{hobby.costEstimate}</Text>
          </View>
        ) : null}
      </View>

      {/* Description */}
      <View style={styles.section}>
        <Text style={styles.desc}>{hobby.description}</Text>
        {!!hobby.tags?.length && (
          <View style={styles.tagsWrap}>
            {hobby.tags.map((tag, i) => (
              <View style={styles.tagPill} key={`tag-${tag}-${i}`}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.divider} />

      {/* Info grid */}
      <View style={styles.grid}>
        <InfoBox label="Cost" value={hobby.costEstimate || "Varies"} />
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
          value={firstLocation?.trialAvailable ? "Yes" : "No"}
        />
        <InfoBox
          label="Equipment"
          value={
            Array.isArray(hobby.equipment) && hobby.equipment.length
              ? hobby.equipment.join(", ")
              : "None"
          }
        />
        <InfoBox label="Safety Notes" value={hobby.safetyNotes || "None"} />
      </View>

      <View style={styles.divider} />

      {/* Beginner / first video */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Watch: Beginner Demo</Text>
        {beginnerVideo ? (
          <WebView style={styles.video} source={{ uri: beginnerVideo }} />
        ) : (
          <Text style={styles.desc}>No video available.</Text>
        )}
      </View>

      {/* CTA */}
      <Text style={styles.helperText}>
        {hasStarted
          ? "You're currently doing this hobby."
          : "Start this activity now and get a reminder to rate it later."}
      </Text>

      {!hasStarted ? (
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={handleStartHobby}
          activeOpacity={0.95}
        >
          <Text style={styles.primaryBtnText}>Start Hobby</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: COLORS.accent }]}
          onPress={handleCompleteHobby}
          activeOpacity={0.95}
        >
          <Text style={styles.primaryBtnText}>Done with Hobby</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.gridItem}>
      <Text style={styles.gridLabel}>{label}</Text>
      <Text style={styles.gridValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },

  // Hero
  hero: { height: 250, position: "relative" },
  map: { ...StyleSheet.absoluteFillObject },
  noMap: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: SOFT.neutral,
    padding: 16,
  },
  mapOverlay: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 16,
  },
  heroTitle: { color: COLORS.white, fontSize: 24, fontWeight: "900" },
  heroSubtitle: { color: COLORS.white, fontSize: 16, marginTop: 4 },
  mapHint: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  mapHintText: { color: COLORS.white, fontSize: 12, fontWeight: "700" },

  // Chips row
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  chip: {
    backgroundColor: SOFT.neutral,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  chipText: { color: COLORS.text, fontWeight: "700" },

  // Sections
  section: { paddingHorizontal: 16, paddingTop: 14 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 6,
  },
  desc: { color: COLORS.text, opacity: 0.95, lineHeight: 20 },
  tagsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  tagPill: {
    backgroundColor: SOFT.orange,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  tagText: { color: COLORS.primary, fontWeight: "800", fontSize: 12 },
  divider: {
    height: 1,
    backgroundColor: COLORS.accent || "rgba(0,0,0,0.08)",
    marginVertical: 16,
    marginHorizontal: 16,
  },

  // Grid
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  gridItem: {
    width: "48%",
    marginBottom: 12,
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    alignItems: "center",
    // subtle elevation/shadow
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
      },
      android: { elevation: 1 },
    }),
  },
  gridLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.primary,
    marginBottom: 4,
  },
  gridValue: { fontSize: 13, color: COLORS.text, textAlign: "center" },

  // Video
  video: {
    height: 200,
    width: Dimensions.get("window").width - 32,
    alignSelf: "center",
    marginTop: 8,
    borderRadius: 12,
    overflow: "hidden",
  },

  // Helper + CTAs
  helperText: {
    textAlign: "center",
    marginHorizontal: 16,
    fontSize: 14,
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginHorizontal: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
      },
      android: { elevation: 1 },
    }),
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "900" },

  // Rating modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    width: "86%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  modalTitle: { fontSize: 18, fontWeight: "900", color: COLORS.text },
  modalInput: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    color: COLORS.text,
  },
  modalPrimary: {
    marginTop: 12,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  modalPrimaryText: { color: "#fff", fontWeight: "900" },
  modalGhost: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 6,
  },
  modalGhostText: { color: COLORS.text, opacity: 0.7, fontWeight: "700" },
});
