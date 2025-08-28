// src/screens/HobbyListScreen.tsx
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  Alert,
  FlatList,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Modal,
  TouchableOpacity,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import COLORS from "../style/colours";
import { getSuggestedHobbies } from "../services/hobbyService";
import { useAuth } from "../context/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

const TAG_ICONS: Record<string, string> = {
  art: "🎨",
  music: "🎵",
  fitness: "💪",
  outdoors: "🌿",
  cooking: "🍳",
  tech: "💻",
  craft: "✂️",
  social: "🗣️",
  learning: "📚",
};
const iconForTag = (t?: string) => TAG_ICONS[t?.toLowerCase?.() || ""] ?? "✨";

const SOFT = {
  orange: "#fee9dcff",
  green: "#EEF7E9",
  neutral: "#F5F7FA",
};

const POST_AUTH_NEXT_KEY = "postAuthNext";

const HobbyList = ({ route, navigation }: any) => {
  const { mood, location, tryNew } = route.params;

  // Only use isAuthenticated for the gate
  const { isAuthenticated, token, user, loading: authLoading } = useAuth();

  const [hobbies, setHobbies] = useState<Hobby[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [gateVisible, setGateVisible] = useState(false);
  const [pendingHobby, setPendingHobby] = useState<Hobby | null>(null);

  const prioritizeHobbies = useCallback(
    (
      list: Hobby[],
      prefs?: {
        wheelchairAccessible?: boolean;
        ecoFriendly?: boolean;
        trialAvailable?: boolean;
      },
      favouriteTags?: string[]
    ): Hobby[] => {
      if (!prefs && !favouriteTags?.length) return list;

      const favSet = new Set((favouriteTags ?? []).map((t) => t.toLowerCase()));

      const score = (h: Hobby) => {
        let s = 0;
        if (prefs?.ecoFriendly && h.ecoFriendly) s += 3;
        if (prefs?.trialAvailable && h.trialAvailable) s += 2;
        if (prefs?.wheelchairAccessible && h.wheelchairAccessible) s += 1;
        if (favSet.size && Array.isArray(h.tags)) {
          s += h.tags.reduce(
            (acc, t) => acc + (favSet.has(t.toLowerCase()) ? 1 : 0),
            0
          );
        }
        return s;
      };

      return [...list].sort((a, b) => {
        const diff = score(b) - score(a);
        return diff !== 0 ? diff : a.name.localeCompare(b.name);
      });
    },
    []
  );

  const fetchHobbies = useCallback(async () => {
    try {
      setLoading(true);

      const base: any = { mood, location, tryNew };

      if (token && user) {
        const preferences = user.preferences ?? {};
        if (preferences.wheelchairAccessible === true) {
          base.wheelchairAccessible = true; // firm filter only
        }
      }

      const data: Hobby[] = await getSuggestedHobbies(base);

      const ranked = prioritizeHobbies(
        data,
        user?.preferences,
        user?.favouriteTags ?? user?.favoriteTags
      );

      setHobbies(ranked);
    } catch (err) {
      console.error("❌ Error fetching hobbies:", err);
      Alert.alert("Error", "Unable to load hobbies. Try again later.");
    } finally {
      setLoading(false);
    }
  }, [mood, location, tryNew, token, user, prioritizeHobbies]);

  useFocusEffect(
    useCallback(() => {
      fetchHobbies();
    }, [fetchHobbies])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchHobbies();
    setRefreshing(false);
  };

  const regenerate = () =>
    navigation.replace("HobbyList", {
      mood,
      location,
      tryNew: true,
      _r: Date.now(),
    });

  // 👇 CHANGE: route through Splash before HobbyDetail for a brief loader
  const handlePressHobby = useCallback(
    (hobby: Hobby) => {
      if (isAuthenticated) {
        navigation.navigate("Splash", {
          next: { screen: "HobbyDetail", params: { hobby } },
        });
      } else {
        setPendingHobby(hobby);
        setGateVisible(true);
      }
    },
    [navigation, isAuthenticated]
  );

  const saveNextAndGo = useCallback(
    async (routeName: "Login" | "Onboarding") => {
      if (!pendingHobby) return;
      await AsyncStorage.setItem(
        POST_AUTH_NEXT_KEY,
        JSON.stringify({
          screen: "HobbyDetail",
          params: { hobby: pendingHobby },
        })
      );
      setGateVisible(false);
      navigation.navigate(routeName);
    },
    [navigation, pendingHobby]
  );

  const cancelGate = useCallback(() => {
    setGateVisible(false);
    setPendingHobby(null);
  }, []);

  // Still wait for auth init & user fetch so list ranks correctly
  if (authLoading || loading || (token && !user)) {
    return (
      <View style={styles.loaderContainer} accessibilityRole="progressbar">
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loaderText}>Finding hobbies for you…</Text>
      </View>
    );
  }

  const renderItem = ({ item }: { item: Hobby }) => {
    const cost = item.costEstimate || "Varies";
    return (
      <Pressable
        onPress={() => handlePressHobby(item)}
        android_ripple={{ color: COLORS.primary + "22" }}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        accessibilityRole="button"
        accessibilityLabel={`${item.name}. ${cost}. ${item.tags?.join(", ") || ""}`}
      >
        <View style={styles.cardTop}>
          <View style={styles.titleBlock}>
            <Text style={styles.hobbyName} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={styles.metaRibbon}>
              {item.ecoFriendly ? (
                <View style={styles.metaChip}>
                  <Text style={styles.metaChipText}>🌿 Eco</Text>
                </View>
              ) : null}
              {item.trialAvailable ? (
                <View style={styles.metaChip}>
                  <Text style={styles.metaChipText}>🆓 Trial</Text>
                </View>
              ) : null}
              {item.wheelchairAccessible ? (
                <View style={styles.metaChip}>
                  <Text style={styles.metaChipText}>♿ Access</Text>
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.costChip}>
            <Text style={styles.costChipText}>{cost}</Text>
          </View>
        </View>

        <Text style={styles.hobbyDesc} numberOfLines={3}>
          {item.description}
        </Text>

        <View style={styles.tagsWrap}>
          {(item.tags ?? []).slice(0, 4).map((t) => (
            <View key={t} style={styles.tagPill}>
              <Text style={styles.tagIcon}>{iconForTag(t)}</Text>
              <Text style={styles.tagText}>{t}</Text>
            </View>
          ))}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.screen}>
      {/* Breadcrumbs */}
      <View style={styles.breadcrumbs}>
        <View style={styles.crumb}>
          <Text style={styles.crumbLabel}>Feeling</Text>
          <Text style={styles.crumbValue}>{mood}</Text>
        </View>
        <Text style={styles.crumbDot}>•</Text>
        <View style={styles.crumb}>
          <Text style={styles.crumbLabel}>Place</Text>
          <Text style={styles.crumbValue}>{location}</Text>
        </View>
        {tryNew ? (
          <>
            <Text style={styles.crumbDot}>•</Text>
            <View style={styles.crumbNew}>
              <Text style={styles.crumbNewText}>New only</Text>
            </View>
          </>
        ) : null}
      </View>

      {/* List */}
      {hobbies.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🧐</Text>
          <Text style={styles.emptyTitle}>No matches found</Text>
          <Text style={styles.emptyMessage}>
            Try a different mood or switch location.
          </Text>
          <TouchableOpacity style={styles.tryAgainButton} onPress={regenerate}>
            <Text style={styles.tryAgainText}>Generate again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={hobbies}
          renderItem={renderItem}
          keyExtractor={(i) => i._id}
          contentContainerStyle={{ paddingBottom: 120, paddingTop: 8 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
            />
          }
          scrollEnabled={!gateVisible}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Sticky bottom CTA */}
      <View style={styles.footerBar}>
        <TouchableOpacity
          style={styles.footerButton}
          onPress={regenerate}
          activeOpacity={0.85}
        >
          <Text style={styles.footerButtonText} numberOfLines={2}>
            Didn’t find something you love?{"\n"}Generate again
          </Text>
        </TouchableOpacity>
      </View>

      {/* Gate Modal */}
      <Modal
        visible={gateVisible}
        animationType="fade"
        transparent
        onRequestClose={cancelGate}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Continue to details</Text>
            <Text style={styles.modalSubtitle}>
              Choose how you want to proceed.
            </Text>

            <TouchableOpacity
              style={styles.modalBtnPrimary}
              onPress={() => saveNextAndGo("Login")}
            >
              <Text style={styles.modalBtnPrimaryText}>Log in</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalBtnSecondary}
              onPress={() => saveNextAndGo("Onboarding")}
            >
              <Text style={styles.modalBtnSecondaryText}>
                Complete onboarding
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalBtnGhost} onPress={cancelGate}>
              <Text style={styles.modalBtnGhostText}>Not now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  breadcrumbs: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: SOFT.neutral,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    margin: 16,
    marginBottom: 6,
  },
  crumb: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  crumbLabel: { color: COLORS.text, opacity: 0.6, fontSize: 12 },
  crumbValue: { color: COLORS.accent, fontWeight: "900", fontSize: 13 },
  crumbDot: { marginHorizontal: 8, color: COLORS.text, opacity: 0.5 },
  crumbNew: {
    backgroundColor: SOFT.orange,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  crumbNewText: { color: COLORS.primary, fontWeight: "900", fontSize: 12 },

  card: {
    marginHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
      },
      android: { elevation: 2 },
    }),
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
  },
  cardPressed: { transform: [{ translateY: 1 }], opacity: 0.98 },
  cardTop: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  titleBlock: { flex: 1 },
  hobbyName: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 6,
  },
  metaRibbon: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  metaChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: SOFT.neutral,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  metaChipText: { fontSize: 11, color: COLORS.text, fontWeight: "700" },

  costChip: {
    marginLeft: 10,
    backgroundColor: SOFT.orange,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  costChipText: { color: COLORS.primary, fontWeight: "900", fontSize: 12 },

  hobbyDesc: {
    color: COLORS.text,
    opacity: 0.95,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 10,
  },

  tagsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingTop: 4 },
  tagPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: SOFT.orange,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  tagIcon: { fontSize: 12 },
  tagText: { fontSize: 12, color: COLORS.text, fontWeight: "700" },

  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loaderText: { marginTop: 10, color: COLORS.text },

  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  emptyEmoji: { fontSize: 36, marginBottom: 8 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: COLORS.text,
    marginBottom: 6,
    textAlign: "center",
  },
  emptyMessage: {
    fontSize: 14,
    color: COLORS.text,
    opacity: 0.9,
    textAlign: "center",
    marginBottom: 16,
  },
  tryAgainButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  tryAgainText: { color: COLORS.white, fontWeight: "900", fontSize: 14 },

  footerBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
  },
  footerButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000000ff",
        shadowOpacity: 0.08,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
      },
      android: { elevation: 1 },
    }),
  },
  footerButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
    textAlign: "center",
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: "900", color: COLORS.text },
  modalSubtitle: {
    marginTop: 4,
    marginBottom: 12,
    color: COLORS.text,
    opacity: 0.75,
  },
  modalBtnPrimary: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  modalBtnPrimaryText: { color: "#fff", fontWeight: "900", fontSize: 15 },
  modalBtnSecondary: {
    backgroundColor: SOFT.neutral,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  modalBtnSecondaryText: {
    color: COLORS.text,
    fontWeight: "900",
    fontSize: 15,
  },
  modalBtnGhost: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  modalBtnGhostText: { color: COLORS.text, opacity: 0.7, fontWeight: "700" },
});

export default HobbyList;
