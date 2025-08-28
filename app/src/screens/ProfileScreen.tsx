// src/screens/ProfileScreen.tsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  Modal,
  TouchableOpacity,
  ScrollView,
  DeviceEventEmitter,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import COLORS from "../style/colours";
import UserInfoSection from "./components/UserInfoSection";
import { getCurrentUser, updateUser } from "../services/userService";
import { getHobbyById } from "../services/hobbyService";

/* ---------- Types ---------- */
type Preferences = {
  wheelchairAccessible: boolean;
  ecoFriendly: boolean;
  trialAvailable: boolean;
};

type TabKey = "user" | "progress" | "history";

export type HobbyHistoryItem = {
  id: string | number;
  hobbyId?: string;
  name: string;
  date: string; // ISO
  rating?: number;
  notes?: string;
  mood?:
    | "chill"
    | "creative"
    | "energetic"
    | "social"
    | "curious"
    | "focused"
    | string;
  location?: "Indoor" | "Outdoor";
  tags?: string[];
};

type CurrentHobby = {
  hobbyId: string;
  name: string;
  startedAt?: string; // ISO
};

type OpenHobbyLite = {
  hobbyId: string;
  name: string;
  startedAt: string; // ISO
};

type Profile = {
  name: string;
  email: string;
  favouriteTags: string[];
  preferences: Preferences;
  hobbyHistory?: HobbyHistoryItem[];
  currentHobby?: CurrentHobby;
  openHobbies?: OpenHobbyLite[];
};

/* ---------- Helpers ---------- */
const hexToRgba = (color: string, a: number) => {
  const alpha = Math.max(0, Math.min(1, a));
  const short = /^#([A-Fa-f0-9]{3})$/;
  const long = /^#([A-Fa-f0-9]{6})$/;
  if (short.test(color)) {
    const [, s] = color.match(short)!;
    const r = parseInt(s[0] + s[0], 16);
    const g = parseInt(s[1] + s[1], 16);
    const b = parseInt(s[2] + s[2], 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  if (long.test(color)) {
    const [, s] = color.match(long)!;
    const r = parseInt(s.slice(0, 2), 16);
    const g = parseInt(s.slice(2, 4), 16);
    const b = parseInt(s.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  return color;
};
const tint = (base: string, approxAlphaFromHex: string) =>
  hexToRgba(base, parseInt(approxAlphaFromHex, 16) / 255);

/** Unwrap { user: ... } if API returns that */
const getUserRoot = (u: any) => (u && (u.user ?? u)) || {};

/** Normalize server -> [{hobbyId, name, startedAt}] */
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

/* ---------- Mood colors ---------- */
const BASE = {
  chill: COLORS.accent,
  creative: COLORS.primary,
  energetic: COLORS.accent || COLORS.secondary || COLORS.primary,
  social: COLORS.secondary || COLORS.accent || COLORS.primary,
  curious: COLORS.accent,
  focused: COLORS.primary,
};

const MOOD_META: Record<
  "chill" | "creative" | "energetic" | "social" | "curious" | "focused",
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

const MOOD_ALIASES: Record<string, keyof typeof MOOD_META> = {
  "🧊": "chill",
  chill: "chill",
  chilled: "chill",
  calm: "chill",
  "🎨": "creative",
  creative: "creative",
  art: "creative",
  arty: "creative",
  "⚡": "energetic",
  energetic: "energetic",
  energy: "energetic",
  hype: "energetic",
  "🗣️": "social",
  social: "social",
  sociable: "social",
  chatty: "social",
  "🧠": "curious",
  curious: "curious",
  learn: "curious",
  learning: "curious",
  "🎯": "focused",
  focused: "focused",
  focus: "focused",
};
const normalizeMood = (val?: string) => {
  if (!val) return undefined;
  const key = val
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\uFE0E|\uFE0F/g, "");
  return (
    MOOD_ALIASES[key] ||
    ((key as any) in MOOD_META ? (key as keyof typeof MOOD_META) : undefined)
  );
};

const ProfileScreen = () => {
  const navigation = useNavigation<any>();
  const [tab, setTab] = useState<TabKey>("user");

  const [profile, setProfile] = useState<Profile>({
    name: "",
    email: "",
    favouriteTags: [],
    preferences: {
      wheelchairAccessible: false,
      ecoFriendly: false,
      trialAvailable: false,
    },
    openHobbies: [], // start as empty array so UI renders immediately
  });
  const [loading, setLoading] = useState(true);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [editItem, setEditItem] = useState<HobbyHistoryItem | null>(null);
  const [editRating, setEditRating] = useState<number | undefined>(undefined);
  const [editNotes, setEditNotes] = useState<string>("");

  /* ---- Load profile (shape-safe) ---- */
  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const data = getUserRoot(await getCurrentUser());
      setProfile((prev) => ({
        ...prev,
        ...data,
        openHobbies: normalizeOpenHobbies(data.openHobbies),
      }));
    } catch (e) {
      Alert.alert("Error", "Failed to load profile.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Mount
  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Focus refresh
  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  // Listen for live changes from the detail screen
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(
      "OPEN_HOBBIES_CHANGED",
      (rows: any[]) => {
        setProfile((p) => ({
          ...p,
          openHobbies: normalizeOpenHobbies(rows),
        }));
      }
    );
    return () => sub.remove();
  }, []);

  /* ---- Save account/preferences ---- */
  const handleSaveAccount = async (updatedData: Profile) => {
    try {
      const updated = getUserRoot(await updateUser(updatedData as any));
      setProfile((prev) => ({
        ...prev,
        ...updated,
        openHobbies: normalizeOpenHobbies(updated.openHobbies),
      }));
      Alert.alert("Success", "Profile updated!");
    } catch {
      Alert.alert("Error", "Failed to update profile.");
    }
  };

  /* ---- Navigation helpers ---- */
  const goToHobbyDetail = useCallback(
    (hobbyId?: string, name?: string) => {
      const params: { hobbyId?: string; name?: string } = {};
      if (hobbyId) params.hobbyId = String(hobbyId);
      if (name) params.name = name;
      navigation.push("HobbyDetail", params);
    },
    [navigation]
  );

  /* ---- Open hobbies actions ---- */
  const openHobbyFromList = useCallback(
    async (hobbyId: string) => {
      try {
        const hobby = await getHobbyById(hobbyId);
        if (!hobby) throw new Error("Hobby not found");
        navigation.navigate("HobbyDetail", { hobby });
      } catch (e) {
        Alert.alert("Not available", "This hobby could not be loaded.");
      }
    },
    [navigation]
  );

  const removeOpenHobby = useCallback(
    async (hobbyId: string) => {
      try {
        // optimistic
        setProfile((p) => ({
          ...p,
          openHobbies: (p.openHobbies ?? []).filter(
            (x) => x.hobbyId !== hobbyId
          ),
        }));

        const user0 = getUserRoot(await getCurrentUser());
        const current = normalizeOpenHobbies(user0.openHobbies);
        const next = current.filter((x) => x.hobbyId !== hobbyId);
        const updated = getUserRoot(
          await updateUser({ openHobbies: next } as any)
        );

        const final = normalizeOpenHobbies(updated.openHobbies);
        setProfile((p) => ({ ...p, openHobbies: final }));

        // also tell other screens
        DeviceEventEmitter.emit("OPEN_HOBBIES_CHANGED", final);
      } catch {
        Alert.alert("Error", "Could not remove the hobby.");
        loadProfile();
      }
    },
    [loadProfile]
  );

  /* ---- Progress data ---- */
  const moodCounts = useMemo(() => {
    const counts: Record<keyof typeof MOOD_META, number> = {
      chill: 0,
      creative: 0,
      energetic: 0,
      social: 0,
      curious: 0,
      focused: 0,
    };
    (profile.hobbyHistory ?? []).forEach((h) => {
      const norm = normalizeMood(h.mood as string | undefined);
      if (norm) counts[norm] = (counts[norm] ?? 0) + 1;
    });
    return counts;
  }, [profile.hobbyHistory]);

  const totalMoods = Object.values(moodCounts).reduce((a, b) => a + b, 0);
  const maxMoodCount = Math.max(1, ...Object.values(moodCounts));

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

  const saveEdit = useCallback(async () => {
    if (!editItem) return;
    if (
      typeof editRating !== "undefined" &&
      (editRating < 1 || editRating > 5)
    ) {
      Alert.alert("Invalid rating", "Please select 1 to 5 stars.");
      return;
    }
    try {
      const nextHistory = (profile.hobbyHistory ?? []).map((h) =>
        h.id === editItem.id
          ? { ...h, rating: editRating, notes: editNotes }
          : h
      );
      setProfile((p) => ({ ...p, hobbyHistory: nextHistory }));
      const saved = getUserRoot(
        await updateUser({ hobbyHistory: nextHistory } as any)
      );
      if (saved?.hobbyHistory)
        setProfile((p) => ({ ...p, hobbyHistory: saved.hobbyHistory }));
      closeEdit();
    } catch {
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
            const saved = getUserRoot(
              await updateUser({
                hobbyHistory: nextHistory,
              } as any)
            );
            if (saved?.hobbyHistory)
              setProfile((p) => ({ ...p, hobbyHistory: saved.hobbyHistory }));
          } catch {
            Alert.alert("Error", "Could not delete the item.");
          }
        },
      },
    ]);
  };

  /* ---- History item row ---- */
  const renderHistoryItem = ({ item }: { item: HobbyHistoryItem }) => {
    const norm = normalizeMood(item.mood as string | undefined);
    const meta = norm ? MOOD_META[norm] : undefined;
    const dateStr = new Date(item.date).toLocaleDateString();

    const InfoTouch: React.ComponentType<any> = item.hobbyId
      ? TouchableOpacity
      : View;

    return (
      <View style={styles.historyRow}>
        <InfoTouch
          onPress={() => goToHobbyDetail(item.hobbyId, item.name)}
          accessibilityRole="button"
          accessibilityLabel={`Open ${item.name} details`}
          activeOpacity={0.85}
          style={{ flex: 1 }}
        >
          <Text style={styles.historyTitle} numberOfLines={1}>
            {item.name}
          </Text>

          <View style={styles.historyMetaRow}>
            <View
              style={[
                styles.historyChip,
                { borderColor: hexToRgba(COLORS.text, 0.14) },
              ]}
            >
              <Text style={styles.historyChipText}>{dateStr}</Text>
            </View>

            {typeof item.rating === "number" && (
              <View
                style={[
                  styles.historyChip,
                  {
                    borderColor: tint(COLORS.primary, "33"),
                    backgroundColor: COLORS.primary,
                  },
                ]}
              >
                <Text style={styles.historyChipText}>⭐ {item.rating}/5</Text>
              </View>
            )}

            {meta && (
              <View
                style={[
                  styles.historyChip,
                  { borderColor: tint(meta.bar, "44") },
                ]}
              >
                <Text style={styles.historyChipText}>
                  {meta.emoji} {meta.label}
                </Text>
              </View>
            )}

            {item.location && (
              <View
                style={[
                  styles.historyChip,
                  { borderColor: tint(COLORS.accent, "44") },
                ]}
              >
                <Text style={styles.historyChipText}>{item.location}</Text>
              </View>
            )}
          </View>

          {item.notes ? (
            <Text style={styles.historyNotes} numberOfLines={2}>
              {item.notes}
            </Text>
          ) : null}
        </InfoTouch>

        <View style={styles.rowActions}>
          <TouchableOpacity
            style={[styles.rowActionBtn, styles.rowActionAccentBorder]}
            onPress={() => openEdit(item)}
            activeOpacity={0.85}
          >
            <Text style={styles.rowActionAccentText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.rowActionBtn, styles.rowActionPrimaryBorder]}
            onPress={() => goToHobbyDetail(item.hobbyId, item.name)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={`Do ${item.name} again`}
          >
            <Text style={styles.rowActionPrimaryText}>Do again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  /* ---------- UI ---------- */
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 120 }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      <Text style={styles.header}>Profile</Text>

      {/* Tabs header */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === "user" && styles.tabBtnActive]}
          onPress={() => setTab("user")}
          activeOpacity={0.85}
        >
          <Text
            style={[styles.tabText, tab === "user" && styles.tabTextActive]}
          >
            User data
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === "progress" && styles.tabBtnActive]}
          onPress={() => setTab("progress")}
          activeOpacity={0.85}
        >
          <Text
            style={[styles.tabText, tab === "progress" && styles.tabTextActive]}
          >
            Progress
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === "history" && styles.tabBtnActive]}
          onPress={() => setTab("history")}
          activeOpacity={0.85}
        >
          <Text
            style={[styles.tabText, tab === "history" && styles.tabTextActive]}
          >
            History
          </Text>
        </TouchableOpacity>
      </View>

      {/* USER TAB */}
      {tab === "user" && (
        <>
          <View style={styles.cardUserInfo}>
            <UserInfoSection profile={profile} onSave={handleSaveAccount} />
          </View>

          {/* Open Hobbies card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Open Hobbies</Text>

            {!profile.openHobbies || profile.openHobbies.length === 0 ? (
              <Text style={styles.mutedText}>
                You don’t have any open hobbies yet. Start one from Home or a
                hobby page.
              </Text>
            ) : (
              <View style={{ gap: 10 }}>
                {profile.openHobbies.map((h) => (
                  <View
                    key={h.hobbyId}
                    style={{
                      borderWidth: 1,
                      borderColor: hexToRgba(COLORS.text, 0.08),
                      borderRadius: 12,
                      padding: 12,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      backgroundColor: COLORS.white,
                    }}
                  >
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text
                        style={{ fontWeight: "900", color: COLORS.text }}
                        numberOfLines={1}
                      >
                        {h.name}
                      </Text>
                      <Text
                        style={{
                          color: hexToRgba(COLORS.text, 0.67),
                          marginTop: 4,
                        }}
                      >
                        Started {new Date(h.startedAt).toLocaleString()}
                      </Text>
                    </View>

                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <TouchableOpacity
                        style={[
                          styles.rowActionBtn,
                          styles.rowActionPrimaryBorder,
                        ]}
                        onPress={() => openHobbyFromList(h.hobbyId)}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.rowActionPrimaryText}>Open</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.rowActionBtn,
                          styles.rowActionAccentBorder,
                        ]}
                        onPress={() => removeOpenHobby(h.hobbyId)}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.rowActionAccentText}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Current Hobby card (if any) */}
          {profile.currentHobby ? (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.9}
              onPress={() => goToHobbyDetail(profile.currentHobby?.hobbyId)}
              accessibilityRole="button"
              accessibilityLabel={`Continue ${profile.currentHobby.name}`}
            >
              <Text style={styles.cardTitle}>Current Hobby</Text>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={styles.currentHobbyBadge}>
                  <Text style={styles.currentHobbyBadgeText}>Now</Text>
                </View>
                <Text style={styles.currentHobbyName} numberOfLines={1}>
                  {profile.currentHobby.name}
                </Text>
              </View>
              {!!profile.currentHobby.startedAt && (
                <Text style={styles.currentHobbySub}>
                  Started{" "}
                  {new Date(
                    profile.currentHobby.startedAt
                  ).toLocaleDateString()}
                </Text>
              )}
              <View style={styles.currentHobbyCta}>
                <Text style={styles.currentHobbyCtaText}>Open details ▸</Text>
              </View>
            </TouchableOpacity>
          ) : null}
        </>
      )}

      {/* PROGRESS TAB */}
      {tab === "progress" && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your Progress</Text>
          {totalMoods === 0 ? (
            <Text style={[styles.mutedText, { marginBottom: 8 }]}>
              No mood data yet. Start hobbies from the Home screen to track your
              moods here.
            </Text>
          ) : null}

          <View style={styles.progressList}>
            {Object.entries(MOOD_META).map(([key, meta]) => {
              const count = moodCounts[key as keyof typeof MOOD_META] ?? 0;
              const safeMax = maxMoodCount > 0 ? maxMoodCount : 1;
              const widthPct = Math.round((count / safeMax) * 100);

              return (
                <View key={key} style={styles.progressGroup}>
                  <View style={styles.progressRow}>
                    <Text style={styles.progressLabel}>
                      {meta.emoji} {meta.label}
                    </Text>
                    <Text style={styles.progressValue}>{count}</Text>
                  </View>

                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressBar,
                        {
                          width: `${Number.isFinite(widthPct) ? widthPct : 0}%`,
                          backgroundColor: meta.bar,
                          minWidth: count > 0 ? 6 : 0,
                        },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* HISTORY TAB */}
      {tab === "history" && (
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
            <>
              <FlatList
                data={sortedHistory}
                keyExtractor={(item) => String(item.id)}
                renderItem={renderHistoryItem}
                ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                scrollEnabled={false}
              />
              {sortedHistory.length > 3 && (
                <TouchableOpacity
                  style={styles.showMoreBtn}
                  onPress={() => setHistoryOpen(false)}
                >
                  <Text style={styles.showMoreText}>Show less</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <>
              <FlatList
                data={historyPreview}
                keyExtractor={(item) => String(item.id)}
                renderItem={renderHistoryItem}
                ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                scrollEnabled={false}
              />
              {sortedHistory.length > 3 && (
                <TouchableOpacity
                  style={styles.showMoreBtn}
                  onPress={() => setHistoryOpen(true)}
                >
                  <Text style={styles.showMoreText}>Show all</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      )}

      {/* Edit Modal (content omitted for brevity) */}
      <Modal
        visible={editVisible}
        animationType="slide"
        transparent
        onRequestClose={closeEdit}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>{/* your edit UI here */}</View>
        </View>
      </Modal>
    </ScrollView>
  );
};

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  tabs: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: hexToRgba(COLORS.primary, 0.08),
    overflow: "hidden",
  },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: "center" },
  tabBtnActive: {
    backgroundColor: hexToRgba(COLORS.primary, 0.08),
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  tabText: { fontWeight: "700", color: hexToRgba(COLORS.text, 0.7) },
  tabTextActive: { color: COLORS.primary },

  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    fontSize: 26,
    fontWeight: "900",
    color: COLORS.primary,
    textAlign: "center",
    marginTop: 16,
    marginBottom: 16,
  },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 0.5,
    borderColor: hexToRgba(COLORS.text, 0.08),
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
    overflow: "hidden",
  },
  cardUserInfo: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 0.5,
    borderColor: hexToRgba(COLORS.text, 0.08),
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
    overflow: "visible",
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: COLORS.text,
    marginBottom: 4,
  },
  mutedText: { color: hexToRgba(COLORS.text, 0.8) },

  currentHobbyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: tint(COLORS.accent, "22"),
    borderWidth: 1,
    borderColor: tint(COLORS.accent, "55"),
    marginRight: 8,
  },
  currentHobbyBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.text,
  },
  currentHobbyName: { fontSize: 16, fontWeight: "900", color: COLORS.text },
  currentHobbySub: { marginTop: 6, color: hexToRgba(COLORS.text, 0.67) },
  currentHobbyCta: {
    alignSelf: "flex-start",
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: tint(COLORS.primary, "18"),
    borderWidth: 1,
    borderColor: tint(COLORS.primary, "40"),
  },
  currentHobbyCtaText: { fontWeight: "900", color: COLORS.primary },

  collapseHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  collapseSub: { color: hexToRgba(COLORS.text, 0.67), fontSize: 12 },
  chevron: { fontSize: 18, color: COLORS.primary, fontWeight: "900" },

  progressList: { gap: 12, alignItems: "stretch" },
  progressGroup: { alignSelf: "stretch", gap: 6 },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  progressLabel: { color: COLORS.text, fontWeight: "700" },
  progressValue: { color: hexToRgba(COLORS.text, 0.67) },
  progressTrack: {
    width: "100%",
    height: 10,
    borderRadius: 999,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: "transparent",
  },
  progressBar: {
    height: "100%",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },

  historyRow: {
    flexDirection: "column",
    gap: 12,
    borderRadius: 12,
    borderWidth: 0.5,
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
    marginTop: 8,
  },
  historyChipText: { fontSize: 11, color: COLORS.text, fontWeight: "700" },
  historyNotes: {
    color: COLORS.text,
    fontWeight: "600",
    marginTop: 10,
    fontSize: 14,
  },
  rowActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 12,
  },
  rowActionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  rowActionPrimaryBorder: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  rowActionAccentBorder: { borderWidth: 2, borderColor: COLORS.accent },
  rowActionPrimaryText: { color: COLORS.white, fontWeight: "800" },
  rowActionAccentText: { color: COLORS.accent, fontWeight: "800" },

  showMoreBtn: {
    alignSelf: "center",
    marginTop: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: hexToRgba(COLORS.primary, 0.12),
  },
  showMoreText: { color: COLORS.primary, fontWeight: "800" },

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
    marginLeft: 15,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: hexToRgba(COLORS.primary, 0.06),
  },
  clearRatingText: { color: COLORS.text, fontWeight: "800", fontSize: 12 },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: hexToRgba(COLORS.text, 0.12),
    padding: 12,
    color: COLORS.text,
  },
  modalActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 14,
  },
  modalActionsRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  dangerBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: hexToRgba("#FF3B30", 0.06),
    borderColor: hexToRgba("#FF3B30", 0.25),
  },
  dangerBtnText: { color: "#FF3B30", fontWeight: "900" },
  ghostBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  ghostBtnText: { color: COLORS.accent, fontWeight: "800" },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
  },
  primaryBtnText: { color: COLORS.white, fontWeight: "900" },
});

export default ProfileScreen;
