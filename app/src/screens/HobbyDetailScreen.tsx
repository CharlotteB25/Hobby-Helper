import React, { useEffect, useMemo, useState } from "react";
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
  ActivityIndicator,
  DeviceEventEmitter,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { WebView } from "react-native-webview";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";

import COLORS from "../style/colours";
import { scheduleRatingReminder } from "../services/notificationService";
import { getCurrentUser, updateUser } from "../services/userService";
import { getHobbyById, searchHobbiesByName } from "../services/hobbyService";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "HobbyDetail">;

const SOFT = {
  orange: "#fee9dcff",
  green: "#EEF7E9",
  neutral: "#F5F7FA",
};

type DifficultyLevel = { level: string; youtubeLinks?: string[] };
type Location = {
  _id?: string;
  name?: string;
  address?: string;
  lat?: number;
  lng?: number;
  trialAvailable?: boolean;
};
type Hobby = {
  _id?: string;
  name?: string;
  description?: string;
  tags?: string[];
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
const isFiniteNum = (n: any) => typeof n === "number" && Number.isFinite(n);

/** Unwrap { user: ... } if your API returns that */
const getUserRoot = (u: any) => (u && (u.user ?? u)) || {};

/** Normalize whatever the server returns into [{hobbyId, name, startedAt}] */
const normalizeOpenHobbies = (
  raw: any
): { hobbyId: string; name: string; startedAt: string }[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row: any) => {
      const hobbyId =
        row?.hobbyId ??
        row?.id ??
        row?._id ??
        row?.hobby?.id ??
        row?.hobby?._id;
      if (!hobbyId) return null;
      const name =
        row?.name ??
        row?.title ??
        row?.hobby?.name ??
        row?.hobby?.title ??
        "Unknown Hobby";
      const startedAt =
        row?.startedAt ??
        row?.started_at ??
        row?.createdAt ??
        row?.created_at ??
        new Date().toISOString();
      return {
        hobbyId: String(hobbyId),
        name: String(name),
        startedAt: String(startedAt),
      };
    })
    .filter(Boolean) as any[];
};

export default function HobbyDetailScreen({ route, navigation }: Props) {
  // Accept flexible params: {hobby?, hobbyId?, name?, showRatingModal?}
  const {
    hobby: paramHobby,
    hobbyId,
    name,
    showRatingModal,
  } = route?.params ?? {};

  const [hobby, setHobby] = useState<Hobby | null>(
    paramHobby ?? (name || hobbyId ? { _id: hobbyId, name, tags: [] } : null)
  );
  const [loading, setLoading] = useState<boolean>(
    !paramHobby && (!!hobbyId || !!name)
  );

  // Resolve the hobby if only id or name was provided
  useEffect(() => {
    let mounted = true;

    const fetchHobby = async () => {
      try {
        if (paramHobby) {
          setLoading(false);
          return;
        }
        setLoading(true);

        let resolved: Hobby | null = null;

        if (hobbyId) {
          resolved = await getHobbyById(hobbyId);
        } else if (name) {
          const results = await searchHobbiesByName(name);
          if (Array.isArray(results) && results.length > 0) {
            const exact = results.find(
              (h: any) =>
                (h?.name ?? "").trim().toLowerCase() ===
                name.trim().toLowerCase()
            );
            resolved = exact ?? results[0];
          }
        }

        if (mounted) {
          if (resolved) {
            setHobby(resolved);
            navigation.setOptions?.({ title: resolved.name ?? "Hobby" });
          } else {
            Toast.show({
              type: "error",
              text1: "Not found",
              text2: "We couldn’t load this hobby.",
            });
          }
        }
      } catch (e) {
        if (mounted) {
          console.error("Failed to load hobby:", e);
          Toast.show({
            type: "error",
            text1: "Error",
            text2: "Could not load hobby.",
          });
        }
      } finally {
        mounted && setLoading(false);
      }
    };

    if (!paramHobby && (hobbyId || name)) {
      fetchHobby();
    } else {
      navigation.setOptions?.({ title: paramHobby?.name ?? name ?? "Hobby" });
      setLoading(false);
    }

    return () => {
      mounted = false;
    };
  }, [paramHobby, hobbyId, name, navigation]);

  const locations = hobby?.locations ?? [];
  const firstLocation = locations[0];
  const hasCoords =
    isFiniteNum(firstLocation?.lat) && isFiniteNum(firstLocation?.lng);

  const beginnerVideo = useMemo(() => {
    const link =
      hobby?.difficultyLevels?.find((d) => d.level === "Beginner")
        ?.youtubeLinks?.[0] ?? hobby?.difficultyLevels?.[0]?.youtubeLinks?.[0];
    return link ? YT_EMBED(link) : null;
  }, [hobby?.difficultyLevels]);

  const [hasStarted, setHasStarted] = useState(false);
  const [showModal, setShowModal] = useState<boolean>(!!showRatingModal);
  const [ratingInput, setRatingInput] = useState("");

  // Title reacts to loaded hobby
  useEffect(() => {
    navigation.setOptions?.({ title: hobby?.name ?? name ?? "Hobby" });
  }, [hobby?.name, name, navigation]);

  // Restore started flag (needs an ID)
  useEffect(() => {
    (async () => {
      if (!hobby?._id) {
        setHasStarted(false);
        return;
      }
      const started = await AsyncStorage.getItem(`startedHobby:${hobby._id}`);
      setHasStarted(!!started);
    })();
  }, [hobby?._id]);

  // If deep-linked to rating
  useEffect(() => {
    if (showRatingModal) setShowModal(true);
  }, [showRatingModal]);

  const handleStartHobby = async () => {
    try {
      if (!hobby?._id) throw new Error("Hobby ID is missing.");

      await Notifications.cancelAllScheduledNotificationsAsync();
      await scheduleRatingReminder(hobby._id);
      await AsyncStorage.setItem(`startedHobby:${hobby._id}`, "true");
      setHasStarted(true);

      const user = await getCurrentUser();
      console.log("Profile openHobbies:", user.openHobbies);

      const list = Array.isArray(user.openHobbies) ? user.openHobbies : [];
      const startedAt = new Date().toISOString();
      const next = [
        { hobbyId: hobby._id, name: hobby.name ?? "Unknown Hobby", startedAt },
        ...list.filter((x: any) => x.hobbyId !== hobby._id),
      ];
      const updated = await updateUser({ openHobbies: next } as any);

      // 🔔 Tell other screens
      DeviceEventEmitter.emit(
        "OPEN_HOBBIES_CHANGED",
        updated.openHobbies ?? next
      );

      Toast.show({
        type: "success",
        text1: "⏳ Reminder set",
        text2: "We’ll remind you to rate this hobby soon.",
      });
    } catch (error) {
      console.error("Failed to start hobby:", error);
      Alert.alert("Oops!", "Failed to start the hobby.");
    }
  };

  const handleCompleteHobby = async () => {
    try {
      if (hobby?._id) {
        await AsyncStorage.removeItem(`startedHobby:${hobby._id}`);
      }
      await Notifications.cancelAllScheduledNotificationsAsync();
      setHasStarted(false);

      const user = await getCurrentUser();
      const list = Array.isArray(user.openHobbies) ? user.openHobbies : [];
      const next = hobby?._id
        ? list.filter((x: any) => x.hobbyId !== hobby._id)
        : list;
      const updated = await updateUser({ openHobbies: next } as any);

      // 🔔 Tell other screens
      DeviceEventEmitter.emit(
        "OPEN_HOBBIES_CHANGED",
        updated.openHobbies ?? next
      );

      Toast.show({
        type: "success",
        text1: "Nice work!",
        text2: "We’ll nudge you to rate this shortly.",
      });
    } catch (error) {
      console.error("Error finishing hobby:", error);
      Alert.alert("Oops", "Could not complete the hobby.");
    }
  };

  const openInMaps = () => {
    if (!hasCoords) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${firstLocation!.lat},${firstLocation!.lng}`;
    Linking.openURL(url).catch(() => {});
  };

  /** Writes to history with the given rating (number 1–5) or undefined (skip) */
  const writeHistory = async (rating?: number) => {
    const user = getUserRoot(await getCurrentUser());
    const updatedHistory = [
      ...(user.hobbyHistory || []),
      {
        id: Date.now(),
        hobbyId: hobby?._id,
        name: hobby?.name ?? name ?? "Unknown Hobby",
        date: new Date().toISOString(),
        rating,
      },
    ];
    await updateUser({ ...user, hobbyHistory: updatedHistory });
  };

  const submitRating = async () => {
    const rating = parseInt(ratingInput, 10);
    if (isNaN(rating) || rating < 1 || rating > 5) {
      Alert.alert("Invalid Rating", "Enter a number between 1 and 5.");
      return;
    }
    try {
      await writeHistory(rating);
      setShowModal(false);
      setRatingInput("");
      Toast.show({
        type: "success",
        text1: "🎉 Rating saved",
        text2: "Your rating was added to your history!",
      });
    } catch (err) {
      console.error("Failed to save rating:", err);
      Alert.alert("Error", "Could not save your rating.");
    }
  };

  const skipRating = async () => {
    try {
      await writeHistory(undefined);
      setShowModal(false);
      setRatingInput("");
      Toast.show({
        type: "success",
        text1: "Saved",
        text2: "Hobby added to your history.",
      });
    } catch (err) {
      console.error("Failed to save entry:", err);
      Alert.alert("Error", "Could not save your hobby to history.");
    }
  };

  const hobbyTitle = hobby?.name ?? name ?? "Hobby";
  const description = hobby?.description ?? "No description yet.";

  if (loading) {
    return (
      <View
        style={[
          styles.screen,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: 12, color: COLORS.text }}>
          Loading hobby…
        </Text>
      </View>
    );
  }

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
              onPress={skipRating}
              activeOpacity={0.9}
            >
              <Text style={styles.modalGhostText}>Skip rating</Text>
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

      {/* Hero */}
      <View style={styles.hero}>
        {hasCoords ? (
          <>
            <MapView
              style={styles.map}
              pointerEvents="none"
              initialRegion={{
                latitude: firstLocation!.lat as number,
                longitude: firstLocation!.lng as number,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
              rotateEnabled={false}
            >
              <Marker
                coordinate={{
                  latitude: firstLocation!.lat as number,
                  longitude: firstLocation!.lng as number,
                }}
                title={firstLocation?.name ?? hobbyTitle}
                description={firstLocation?.address}
              />
            </MapView>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              onPress={openInMaps}
              activeOpacity={1}
            />
            <View style={styles.mapOverlay}>
              <Text style={styles.heroTitle}>{hobbyTitle}</Text>
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
            <Text style={styles.noMapTitle}>{hobbyTitle}</Text>
          </View>
        )}
      </View>

      {/* Meta chips */}
      <View style={styles.chips}>
        {hobby?.ecoFriendly ? (
          <View style={styles.chip} key="meta-eco">
            <Text style={styles.chipText}>🌿 Eco</Text>
          </View>
        ) : null}
        {hobby?.trialAvailable || firstLocation?.trialAvailable ? (
          <View style={styles.chip} key="meta-trial">
            <Text style={styles.chipText}>🆓 Trial</Text>
          </View>
        ) : null}
        {hobby?.wheelchairAccessible ? (
          <View style={styles.chip} key="meta-access">
            <Text style={styles.chipText}>♿ Access</Text>
          </View>
        ) : null}
        {hobby?.costEstimate ? (
          <View style={styles.chip} key="meta-cost">
            <Text style={styles.chipText}>{hobby.costEstimate}</Text>
          </View>
        ) : null}
      </View>

      {/* Description + tags */}
      <View style={styles.section}>
        <Text style={styles.desc}>{description}</Text>
        {!!hobby?.tags?.length && (
          <View style={styles.tagsWrap}>
            {(hobby?.tags ?? []).map((tag, i) => (
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
        <InfoBox label="Cost" value={hobby?.costEstimate || "Varies"} />
        <InfoBox
          label="Accessibility"
          value={hobby?.wheelchairAccessible ? "Yes" : "No"}
        />
        <InfoBox
          label="Eco-Friendly"
          value={hobby?.ecoFriendly ? "Yes" : "No"}
        />
        <InfoBox
          label="Trial Available"
          value={firstLocation?.trialAvailable ? "Yes" : "No"}
        />
        <InfoBox
          label="Equipment"
          value={
            Array.isArray(hobby?.equipment) && hobby?.equipment?.length
              ? (hobby?.equipment ?? []).join(", ")
              : "None"
          }
        />
        <InfoBox label="Safety Notes" value={hobby?.safetyNotes || "None"} />
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
    backgroundColor: COLORS.secondary,
    padding: 16,
  },
  noMapTitle: { color: COLORS.primary, fontSize: 24, fontWeight: "900" },
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
