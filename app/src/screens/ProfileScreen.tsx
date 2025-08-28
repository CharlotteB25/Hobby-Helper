// src/screens/ProfileScreen.tsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import COLORS from "../style/colours";
import UserInfoSection from "./components/UserInfoSection";
import { getCurrentUser, updateUser } from "../services/userService";

/* ---------- Types ---------- */
type Preferences = {
  wheelchairAccessible: boolean;
  ecoFriendly: boolean;
  trialAvailable: boolean;
};

export type HobbyHistoryItem = {
  id: string | number;
  hobbyId?: string;
  name: string;
  date: string; // ISO
  rating?: number;
  notes?: string;
  mood?: "chill" | "creative" | "energetic" | "social" | "curious" | "focused";
  location?: "Indoor" | "Outdoor";
  tags?: string[];
};

type Profile = {
  name: string;
  email: string;
  favouriteTags: string[];
  preferences: Preferences;
  hobbyHistory?: HobbyHistoryItem[];
};

/* ---------- Color helpers ---------- */
const tint = (hex: string, alphaHex: string) => `${hex}${alphaHex}`;
const BASE = {
  chill: COLORS.accent,
  creative: COLORS.primary,
  energetic: COLORS.accent || COLORS.secondary || COLORS.primary,
  social: COLORS.secondary || COLORS.accent || COLORS.primary,
  curious: COLORS.accent,
  focused: COLORS.primary,
};

const MOOD_META: Record<
  NonNullable<HobbyHistoryItem["mood"]>,
  { label: string; emoji: string; bar: string; track: string; chip: string }
> = {
  chill: {
    label: "Chill",
    emoji: "🧊",
    bar: BASE.chill,
    track: tint(BASE.chill, "22"),
    chip: tint(BASE.chill, "33"),
  },
  creative: {
    label: "Creative",
    emoji: "🎨",
    bar: BASE.creative,
    track: tint(BASE.creative, "22"),
    chip: tint(BASE.creative, "33"),
  },
  energetic: {
    label: "Energetic",
    emoji: "⚡",
    bar: BASE.energetic,
    track: tint(BASE.energetic, "22"),
    chip: tint(BASE.energetic, "33"),
  },
  social: {
    label: "Social",
    emoji: "🗣️",
    bar: BASE.social,
    track: tint(BASE.social, "22"),
    chip: tint(BASE.social, "33"),
  },
  curious: {
    label: "Curious",
    emoji: "🧠",
    bar: BASE.curious,
    track: tint(BASE.curious, "22"),
    chip: tint(BASE.curious, "33"),
  },
  focused: {
    label: "Focused",
    emoji: "🎯",
    bar: BASE.focused,
    track: tint(BASE.focused, "22"),
    chip: tint(BASE.focused, "33"),
  },
};

const ProfileScreen = () => {
  const [profile, setProfile] = useState<Profile>({
    name: "",
    email: "",
    favouriteTags: [],
    preferences: {
      wheelchairAccessible: false,
      ecoFriendly: false,
      trialAvailable: false,
    },
  });
  const [loading, setLoading] = useState(true);

  // Collapsible history
  const [historyOpen, setHistoryOpen] = useState(false);

  // Edit modal
  const [editVisible, setEditVisible] = useState(false);
  const [editItem, setEditItem] = useState<HobbyHistoryItem | null>(null);
  const [editRating, setEditRating] = useState<number | undefined>(undefined);
  const [editNotes, setEditNotes] = useState<string>("");

  /* ---- Load profile ---- */
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await getCurrentUser();
        setProfile(data);
      } catch (err) {
        console.error("Failed to fetch profile:", err);
        Alert.alert("Error", "Failed to load profile.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ---- Save account/preferences (from UserInfoSection) ---- */
  const handleSaveAccount = async (updatedData: Profile) => {
    try {
      const data = await updateUser(updatedData);
      setProfile(data);
      Alert.alert("Success", "Profile updated!");
    } catch (err) {
      console.error("Failed to update profile:", err);
      Alert.alert("Error", "Failed to update profile.");
    }
  };

  /* ---- Progress data (counts by mood) ---- */
  const moodCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    (profile.hobbyHistory ?? []).forEach((h) => {
      if (h.mood) counts[h.mood] = (counts[h.mood] ?? 0) + 1;
    });
    return counts;
  }, [profile.hobbyHistory]);

  const totalMoods = Object.values(moodCounts).reduce((a, b) => a + b, 0);
  const maxMoodCount = Math.max(1, ...Object.values(moodCounts), 1);

  /* ---- History helpers ---- */
  const sortedHistory = useMemo(
    () =>
      [...(profile.hobbyHistory ?? [])].sort(
        (a, b) => +new Date(b.date) - +new Date(a.date)
      ),
    [profile.hobbyHistory]
  );

  const historyPreview = sortedHistory.slice(0, 3);

  const openEdit = (item: HobbyHistoryItem) => {
    setEditItem(item);
    setEditRating(
      typeof item.rating === "number" && !Number.isNaN(item.rating)
        ? item.rating
        : undefined
    );
    setEditNotes(item.notes ?? "");
    setEditVisible(true);
  };

  const closeEdit = () => {
    setEditVisible(false);
    setEditItem(null);
    setEditRating(undefined);
    setEditNotes("");
  };

  const handlePickStar = (n: number) => setEditRating(n);

  const saveEdit = useCallback(async () => {
    if (!editItem) return;

    // Optional: allow unrated by setting undefined. If you want to require a rating, enforce here.
    if (
      typeof editRating !== "undefined" &&
      (editRating < 1 || editRating > 5)
    ) {
      Alert.alert("Invalid rating", "Please select 1 to 5 stars.");
      return;
    }

    try {
      // Optimistic local update
      const nextHistory = (profile.hobbyHistory ?? []).map((h) =>
        h.id === editItem.id
          ? { ...h, rating: editRating, notes: editNotes }
          : h
      );
      setProfile((p) => ({ ...p, hobbyHistory: nextHistory }));

      // Persist ONLY the changed field to reduce server merge errors
      const saved = await updateUser({ hobbyHistory: nextHistory } as any);
      // If API returns fresh user, use it; otherwise keep optimistic
      if (saved && saved.hobbyHistory) {
        setProfile((p) => ({ ...p, hobbyHistory: saved.hobbyHistory }));
      }

      closeEdit();
    } catch (err) {
      console.error("Failed to save history item:", err);
      Alert.alert("Error", "Could not save your changes.");
    }
  }, [editItem, editRating, editNotes, profile.hobbyHistory]);

  const deleteHistoryItem = async (id: string | number) => {
    Alert.alert("Delete entry?", "This will remove the item from history.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const nextHistory = (profile.hobbyHistory ?? []).filter(
              (h) => h.id !== id
            );
            setProfile((p) => ({ ...p, hobbyHistory: nextHistory }));
            const saved = await updateUser({
              hobbyHistory: nextHistory,
            } as any);
            if (saved && saved.hobbyHistory) {
              setProfile((p) => ({ ...p, hobbyHistory: saved.hobbyHistory }));
            }
          } catch (err) {
            console.error("Failed to delete history item:", err);
            Alert.alert("Error", "Could not delete the item.");
          }
        },
      },
    ]);
  };

  /* ---- Renders ---- */
  const renderHistoryItem = ({ item }: { item: HobbyHistoryItem }) => {
    const moodMeta = item.mood ? MOOD_META[item.mood] : undefined;
    const dateStr = new Date(item.date).toLocaleDateString();

    return (
      <View style={styles.historyRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.historyTitle} numberOfLines={1}>
            {item.name}
          </Text>

          <View style={styles.historyMetaRow}>
            <View
              style={[
                styles.historyChip,
                { backgroundColor: tint(COLORS.text, "0F") },
              ]}
            >
              <Text style={styles.historyChipText}>{dateStr}</Text>
            </View>

            {typeof item.rating === "number" ? (
              <View
                style={[
                  styles.historyChip,
                  { backgroundColor: tint(COLORS.primary, "22") },
                ]}
              >
                <Text style={styles.historyChipText}>⭐ {item.rating}/5</Text>
              </View>
            ) : null}

            {moodMeta ? (
              <View
                style={[styles.historyChip, { backgroundColor: moodMeta.chip }]}
              >
                <Text style={styles.historyChipText}>
                  {moodMeta.emoji} {moodMeta.label}
                </Text>
              </View>
            ) : null}

            {item.location ? (
              <View
                style={[
                  styles.historyChip,
                  { backgroundColor: tint(COLORS.accent, "22") },
                ]}
              >
                <Text style={styles.historyChipText}>{item.location}</Text>
              </View>
            ) : null}
          </View>

          {item.notes ? (
            <Text style={styles.historyNotes} numberOfLines={2}>
              {item.notes}
            </Text>
          ) : null}
        </View>

        <View style={styles.rowActions}>
          <TouchableOpacity
            style={[
              styles.rowActionBtn,
              { backgroundColor: tint(COLORS.accent, "22") },
            ]}
            onPress={() => openEdit(item)}
          >
            <Text style={[styles.rowActionText, { color: COLORS.accent }]}>
              Edit
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.rowActionBtn,
              { backgroundColor: tint(COLORS.primary, "22") },
            ]}
            onPress={() => deleteHistoryItem(item.id)}
          >
            <Text style={[styles.rowActionText, { color: COLORS.primary }]}>
              Delete
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <Text style={styles.header}>Profile</Text>

      {/* Account & Preferences */}
      <View style={styles.card}>
        <UserInfoSection profile={profile} onSave={handleSaveAccount} />
      </View>

      {/* Progress */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Your Progress</Text>
        {totalMoods === 0 ? (
          <Text style={styles.mutedText}>
            No mood data yet. Start hobbies from the Home screen to track your
            moods here.
          </Text>
        ) : (
          <View style={styles.progressList}>
            {Object.entries(MOOD_META).map(([key, meta]) => {
              const count = moodCounts[key] ?? 0;
              const widthPct = Math.round((count / maxMoodCount) * 100);
              return (
                <View key={key} style={styles.progressGroup}>
                  <View style={styles.progressRow}>
                    <Text style={styles.progressLabel}>
                      {meta.emoji} {meta.label}
                    </Text>
                    <Text style={styles.progressValue}>{count}</Text>
                  </View>
                  <View
                    style={[
                      styles.progressTrack,
                      { backgroundColor: meta.track },
                    ]}
                  >
                    <View
                      style={[
                        styles.progressBar,
                        {
                          width: `${widthPct}%`,
                          backgroundColor: meta.bar,
                          // show a tiny sliver if non-zero but very small %
                          minWidth: count > 0 ? 6 : 0,
                        },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Collapsible History */}
      <View style={styles.card}>
        <TouchableOpacity
          onPress={() => setHistoryOpen((v) => !v)}
          activeOpacity={0.9}
          style={styles.collapseHeader}
        >
          <View>
            <Text style={styles.cardTitle}>History</Text>
            <Text style={styles.collapseSub}>
              {sortedHistory.length}{" "}
              {sortedHistory.length === 1 ? "entry" : "entries"}
            </Text>
          </View>
          <Text style={styles.chevron}>{historyOpen ? "▾" : "▸"}</Text>
        </TouchableOpacity>

        {sortedHistory.length === 0 ? (
          <Text style={styles.mutedText}>No completed hobbies yet.</Text>
        ) : historyOpen ? (
          <FlatList
            data={sortedHistory}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderHistoryItem}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            scrollEnabled={false}
          />
        ) : (
          <>
            <FlatList
              data={historyPreview}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderHistoryItem}
              ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              scrollEnabled={false}
            />
            {sortedHistory.length > 3 ? (
              <TouchableOpacity
                style={styles.showMoreBtn}
                onPress={() => setHistoryOpen(true)}
              >
                <Text style={styles.showMoreText}>Show all</Text>
              </TouchableOpacity>
            ) : null}
          </>
        )}
      </View>

      {/* Edit Modal */}
      <Modal
        visible={editVisible}
        animationType="slide"
        transparent
        onRequestClose={closeEdit}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              Edit: {editItem?.name ?? "Hobby"}
            </Text>

            {/* ⭐ Star rating picker */}
            <Text style={styles.inputLabel}>Your rating</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <TouchableOpacity
                  key={n}
                  onPress={() => handlePickStar(n)}
                  activeOpacity={0.85}
                  style={styles.starBtn}
                >
                  <FontAwesome
                    name={n <= (editRating ?? 0) ? "star" : "star-o"}
                    size={30}
                    color={COLORS.primary}
                  />
                </TouchableOpacity>
              ))}
              {typeof editRating !== "undefined" ? (
                <TouchableOpacity
                  onPress={() => setEditRating(undefined)}
                  style={styles.clearRatingBtn}
                >
                  <Text style={styles.clearRatingText}>Clear</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Notes */}
            <Text style={styles.inputLabel}>Notes</Text>
            <TextInput
              value={editNotes}
              onChangeText={setEditNotes}
              placeholder="What did you think?"
              style={[styles.input, { height: 90, textAlignVertical: "top" }]}
              placeholderTextColor={tint(COLORS.text, "66")}
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.ghostBtn} onPress={closeEdit}>
                <Text style={styles.ghostBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={saveEdit}>
                <Text style={styles.primaryBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    fontSize: 26,
    fontWeight: "900",
    color: COLORS.primary,
    textAlign: "center",
    marginTop: 16,
    marginBottom: 16,
  },

  // Cards
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: tint(COLORS.text, "14"),
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: COLORS.text,
    marginBottom: 4,
  },
  mutedText: { color: tint(COLORS.text, "CC") },

  // Collapse header
  collapseHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  collapseSub: {
    color: tint(COLORS.text, "AA"),
    fontSize: 12,
  },
  chevron: { fontSize: 18, color: COLORS.primary, fontWeight: "900" },

  // Progress
  progressList: {
    gap: 12,
    alignItems: "stretch",
  },
  progressGroup: {
    alignSelf: "stretch",
    gap: 6,
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  progressLabel: { color: COLORS.text, fontWeight: "700" },
  progressValue: { color: tint(COLORS.text, "AA") },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 999,
  },

  // History rows
  historyRow: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tint(COLORS.text, "14"),
    padding: 12,
  },
  historyTitle: { fontWeight: "900", color: COLORS.text, fontSize: 15 },
  historyMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  historyChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: tint(COLORS.text, "14"),
  },
  historyChipText: { fontSize: 11, color: COLORS.text, fontWeight: "700" },
  historyNotes: {
    color: tint(COLORS.text, "DD"),
    marginTop: 6,
    fontSize: 13,
  },
  rowActions: { justifyContent: "space-between" },
  rowActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: tint(COLORS.accent, "22"),
  },
  rowActionText: { fontWeight: "800", fontSize: 12 },

  // "Show all" button when collapsed
  showMoreBtn: {
    alignSelf: "center",
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: tint(COLORS.text, "0F"),
  },
  showMoreText: { color: COLORS.text, fontWeight: "800" },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: COLORS.text,
    marginBottom: 10,
  },
  inputLabel: {
    color: COLORS.text,
    fontWeight: "700",
    marginTop: 8,
    marginBottom: 6,
  },
  starsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
  },
  starBtn: { padding: 4, borderRadius: 8 },
  clearRatingBtn: {
    marginLeft: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: tint(COLORS.text, "0F"),
    borderWidth: 1,
    borderColor: tint(COLORS.text, "14"),
  },
  clearRatingText: { color: COLORS.text, fontWeight: "800", fontSize: 12 },

  input: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: tint(COLORS.text, "14"),
    padding: 12,
    color: COLORS.text,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 14,
  },
  ghostBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: tint(COLORS.text, "0F"),
  },
  ghostBtnText: { color: COLORS.text, fontWeight: "800" },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
  },
  primaryBtnText: { color: COLORS.white, fontWeight: "900" },
});

export default ProfileScreen;
