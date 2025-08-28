// src/screens/AddHobbyScreen.tsx
import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import COLORS from "../style/colours";
import { createHobby, searchHobbiesByName } from "../services/hobbyService";

type LocationOpt = "Indoor" | "Outdoor";

const SUGGESTED_TAGS = [
  "Art",
  "Drawing",
  "Painting",
  "Mindfulness",
  "Outdoors",
  "Fitness",
  "Music",
  "Crafts",
  "Photography",
  "Writing",
  "Cooking",
  "Tech",
];

function isUrl(str: string) {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

/** best-effort Google Maps URL lat/lng parser */
function parseMapsLatLng(
  urlOrText: string
): { lat: number; lng: number } | null {
  if (!urlOrText) return null;
  if (!isUrl(urlOrText)) return null;

  try {
    const u = new URL(urlOrText);

    // @lat,lng,
    const atMatch = u.href.match(/@(-?\d+(\.\d+)?),(-?\d+(\.\d+)?),/);
    if (atMatch) {
      const lat = parseFloat(atMatch[1]);
      const lng = parseFloat(atMatch[3]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    }

    // q=lat,lng
    const q = u.searchParams.get("q");
    if (q) {
      const parts = q.split(",").map((v) => parseFloat(v));
      if (parts.length >= 2 && parts.every(Number.isFinite)) {
        return { lat: parts[0], lng: parts[1] };
      }
    }

    // query=lat,lng
    const query = u.searchParams.get("query");
    if (query) {
      const parts = query.split(",").map((v) => parseFloat(v));
      if (parts.length >= 2 && parts.every(Number.isFinite)) {
        return { lat: parts[0], lng: parts[1] };
      }
    }
  } catch {}
  return null;
}

/** Normalize various YouTube URLs to a canonical watch URL */
function normalizeYouTubeUrl(raw: string): string | null {
  if (!raw || !isUrl(raw)) return null;
  try {
    const u = new URL(raw);

    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.replace("/", "");
      if (id) return `https://www.youtube.com/watch?v=${id}`;
    }

    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/watch?v=${v}`;
      const embedMatch = u.pathname.match(/\/embed\/([A-Za-z0-9_-]+)/);
      if (embedMatch) return `https://www.youtube.com/watch?v=${embedMatch[1]}`;
    }
    return raw;
  } catch {
    return null;
  }
}

export default function AddHobbyScreen({ navigation }: any) {
  // Basics
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // Tags (chips) + input
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  // Durations (comma-separated)
  const [durationOptions, setDurationOptions] = useState("");

  // Other fields
  const [costEstimate, setCostEstimate] = useState("");
  const [wheelchairAccessible, setWheelchairAccessible] = useState(false);
  const [ecoFriendly, setEcoFriendly] = useState(false);
  const [trialAvailable, setTrialAvailable] = useState(false);
  const [locations, setLocations] = useState<LocationOpt[]>(["Indoor"]);

  // Optional links
  const [addressOrMapsUrl, setAddressOrMapsUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");

  // Duplicate checking / submit
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dups, setDups] = useState<
    { _id: string; name: string; description?: string }[]
  >([]);

  const normalized = (s: string) => s.trim().toLowerCase();

  const durationList = useMemo(
    () =>
      durationOptions
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    [durationOptions]
  );

  const pillStyle = (active: boolean) => [
    styles.pill,
    {
      backgroundColor: active ? COLORS.primary : COLORS.white,
      borderColor: active ? COLORS.primary : "#D1D5DB",
    },
  ];

  const toggleLocation = (loc: LocationOpt) => {
    setLocations((prev) =>
      prev.includes(loc) ? prev.filter((l) => l !== loc) : [...prev, loc]
    );
  };

  const toggleBool = (cur: boolean, setter: (v: boolean) => void) =>
    setter(!cur);

  /* ---------------- TAGS ---------------- */

  const addTag = (raw: string) => {
    const tag = raw.trim();
    if (!tag) return;
    const exists = selectedTags.some((t) => normalized(t) === normalized(tag));
    if (!exists) setSelectedTags((prev) => [...prev, tag]);
  };

  const removeTag = (tag: string) =>
    setSelectedTags((prev) => prev.filter((t) => t !== tag));

  const onTagInputChange = (text: string) => {
    if (text.endsWith(",") || text.endsWith("\n")) {
      addTag(text.replace(/,|\n/g, ""));
      setTagInput("");
    } else {
      setTagInput(text);
    }
  };

  const onAddTagPress = () => {
    addTag(tagInput);
    setTagInput("");
  };

  const onToggleSuggestedTag = (tag: string) => {
    if (selectedTags.some((t) => normalized(t) === normalized(tag))) {
      removeTag(selectedTags.find((t) => normalized(t) === normalized(tag))!);
    } else {
      addTag(tag);
    }
  };

  /* ---------------- Duplicate checking ---------------- */

  const exactMatch = useMemo(() => {
    const n = normalized(name);
    return dups.find((d) => normalized(d.name) === n);
  }, [dups, name]);

  const possibleMatches = useMemo(() => {
    const n = normalized(name);
    return dups.filter((d) => normalized(d.name) !== n);
  }, [dups, name]);

  const onCheckDuplicates = useCallback(async () => {
    const q = name.trim();
    if (!q) {
      Alert.alert("Enter a name", "Please type a hobby name first.");
      return;
    }
    try {
      setChecking(true);
      const results = await searchHobbiesByName(q);
      const n = normalized(q);

      const matches = (results ?? []).filter((h: any) => {
        const m = normalized(h?.name ?? "");
        return m === n || m.includes(n) || n.includes(m);
      });
      setDups(matches);
    } catch (e) {
      console.error("Duplicate check failed:", e);
      Alert.alert("Error", "Could not check for duplicates.");
    } finally {
      setChecking(false);
    }
  }, [name]);

  /* ---------------- Submit ---------------- */

  const onSubmit = useCallback(async () => {
    if (!name.trim() || !description.trim()) {
      Alert.alert("Missing info", "Name and description are required.");
      return;
    }
    if (locations.length === 0) {
      Alert.alert("Pick a location", "Select at least one: Indoor/Outdoor.");
      return;
    }

    // Optional locations entry
    const locs: any[] = [];
    if (addressOrMapsUrl.trim().length > 0) {
      const coords = parseMapsLatLng(addressOrMapsUrl.trim());
      locs.push({
        name: name.trim(),
        address: addressOrMapsUrl.trim(),
        lat: coords?.lat,
        lng: coords?.lng,
        trialAvailable: trialAvailable || undefined,
      });
    }

    // Optional beginner YouTube
    const youTube = youtubeUrl.trim();
    const normalizedYT = youTube ? normalizeYouTubeUrl(youTube) : null;
    const difficultyLevels = normalizedYT
      ? [{ level: "Beginner", youtubeLinks: [normalizedYT] }]
      : undefined;

    const proceed = async () => {
      try {
        setSubmitting(true);
        const payload: any = {
          name: name.trim(),
          description: description.trim(),
          tags: selectedTags,
          durationOptions: durationList,
          locationOptions: locations,
          costEstimate: costEstimate.trim() || undefined,
          wheelchairAccessible,
          ecoFriendly,
          trialAvailable,
        };

        if (locs.length > 0) payload.locations = locs;
        if (difficultyLevels) payload.difficultyLevels = difficultyLevels;

        const created = await createHobby(payload);

        navigation.navigate("Splash", {
          next: { screen: "HobbyDetail", params: { hobby: created } },
        });
      } catch (e: any) {
        console.error("Create hobby failed:", e?.response?.data || e);
        const msg =
          e?.response?.status === 401
            ? "Please log in to add a hobby."
            : "Could not save the hobby. Please try again.";
        Alert.alert("Error", msg);
      } finally {
        setSubmitting(false);
      }
    };

    if (exactMatch) {
      Alert.alert(
        "Possible duplicate",
        "A hobby with this exact name already exists. Do you want to continue anyway?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Continue", style: "destructive", onPress: proceed },
        ]
      );
    } else {
      await proceed();
    }
  }, [
    name,
    description,
    locations,
    costEstimate,
    wheelchairAccessible,
    ecoFriendly,
    trialAvailable,
    selectedTags,
    durationList,
    exactMatch,
    navigation,
    addressOrMapsUrl,
    youtubeUrl,
  ]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      behavior={Platform.select({ ios: "padding", android: undefined })}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.header}>Add a New Hobby</Text>

        {/* SECTION: Basics */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Basics</Text>

          <Text style={styles.label}>Name *</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Urban Sketching"
            placeholderTextColor="#9CA3AF"
            style={styles.input}
            returnKeyType="done"
          />
          <Text style={styles.helper}>A short, clear title works best.</Text>

          <TouchableOpacity
            onPress={onCheckDuplicates}
            style={styles.primaryAction}
            activeOpacity={0.9}
          >
            {checking ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.primaryActionText}>Check if it exists</Text>
            )}
          </TouchableOpacity>

          {/* Duplicate feedback */}
          {dups.length > 0 && exactMatch ? (
            <View style={[styles.banner, styles.bannerWarn]}>
              <Text style={styles.bannerTitle}>⚠️ Exact match found</Text>
              <View style={styles.bannerRow}>
                <Text style={styles.bannerText}>{exactMatch.name}</Text>
                <TouchableOpacity
                  style={styles.bannerBtn}
                  onPress={() =>
                    navigation.navigate("Splash", {
                      next: {
                        screen: "HobbyDetail",
                        params: { hobby: exactMatch },
                      },
                    })
                  }
                >
                  <Text style={styles.bannerBtnText}>View</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {dups.length > 0 && possibleMatches.length > 0 ? (
            <View style={[styles.banner, styles.bannerInfo]}>
              <Text style={styles.bannerTitle}>ℹ️ Similar results</Text>
              {possibleMatches.slice(0, 5).map((h) => (
                <View key={h._id} style={styles.dupRow}>
                  <Text style={styles.dupName}>{h.name}</Text>
                  <TouchableOpacity
                    onPress={() =>
                      navigation.navigate("Splash", {
                        next: { screen: "HobbyDetail", params: { hobby: h } },
                      })
                    }
                    style={[
                      styles.dupViewBtn,
                      { backgroundColor: COLORS.primary },
                    ]}
                  >
                    <Text style={styles.dupViewText}>View</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : null}

          {dups.length === 0 && (name.trim().length > 0 || checking) ? (
            <View style={[styles.banner, styles.bannerOk]}>
              <Text style={styles.bannerTitle}>✅ No matches found</Text>
              <Text style={styles.bannerText}>
                Looks unique — you can go ahead and add it.
              </Text>
            </View>
          ) : null}
        </View>

        {/* SECTION: Description */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.label}>What is it? *</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="What is it? Where/How to do it? Who is it for?"
            placeholderTextColor="#9CA3AF"
            style={[styles.input, styles.textArea]}
            multiline
          />
          <Text style={styles.helper}>
            A couple of sentences is perfect. Keep it friendly and clear.
          </Text>
        </View>

        {/* SECTION: Location preference */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Location Preference</Text>
          <Text style={styles.label}>Choose one or both</Text>
          <View style={styles.pillsRow}>
            {(["Indoor", "Outdoor"] as const).map((loc) => {
              const active = locations.includes(loc);
              return (
                <TouchableOpacity
                  key={loc}
                  style={pillStyle(active)}
                  onPress={() => toggleLocation(loc)}
                >
                  <Text
                    style={[
                      styles.pillText,
                      { color: active ? COLORS.white : COLORS.text },
                    ]}
                  >
                    {loc} {loc === "Indoor" ? "🏠" : "🌤️"}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* SECTION: Links */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Links</Text>

          <Text style={styles.label}>
            Address or Google Maps link (optional)
          </Text>
          <TextInput
            value={addressOrMapsUrl}
            onChangeText={setAddressOrMapsUrl}
            placeholder="Paste an address or a Google Maps URL"
            placeholderTextColor="#9CA3AF"
            style={styles.input}
            returnKeyType="done"
          />
          <Text style={styles.helper}>
            We’ll try to extract map coordinates if you paste a Maps URL.
          </Text>

          <View style={{ height: 12 }} />

          <Text style={styles.label}>YouTube link (optional)</Text>
          <TextInput
            value={youtubeUrl}
            onChangeText={setYoutubeUrl}
            placeholder="Beginner-friendly video (YouTube)"
            placeholderTextColor="#9CA3AF"
            style={styles.input}
            returnKeyType="done"
          />
          <Text style={styles.helper}>
            Great for a quick intro. Supports youtu.be and youtube.com links.
          </Text>
        </View>

        {/* SECTION: Tags */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Tags</Text>

          {selectedTags.length > 0 ? (
            <View style={styles.chipsWrap}>
              {selectedTags.map((t) => (
                <View key={t} style={styles.chip}>
                  <Text style={styles.chipText}>{t}</Text>
                  <TouchableOpacity
                    onPress={() => removeTag(t)}
                    style={styles.chipX}
                  >
                    <Text style={styles.chipXText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : (
            <Text style={[styles.helper, { marginBottom: 8 }]}>
              Add a few keywords so people can find this hobby.
            </Text>
          )}

          <View style={styles.tagInputRow}>
            <TextInput
              value={tagInput}
              onChangeText={onTagInputChange}
              placeholder="Type a tag and press Add (or comma)"
              placeholderTextColor="#9CA3AF"
              style={[styles.input, { flex: 1 }]}
              returnKeyType="done"
              onSubmitEditing={onAddTagPress}
            />
            <TouchableOpacity style={styles.addTagBtn} onPress={onAddTagPress}>
              <Text style={styles.addTagText}>Add</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.helper, { marginTop: 10 }]}>Suggestions</Text>
          <View style={styles.pillsRow}>
            {SUGGESTED_TAGS.map((tag) => {
              const active = selectedTags.some(
                (t) => normalized(t) === normalized(tag)
              );
              return (
                <TouchableOpacity
                  key={tag}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: active ? COLORS.primary : COLORS.white,
                      borderColor: COLORS.primary,
                    },
                  ]}
                  onPress={() => onToggleSuggestedTag(tag)}
                >
                  <Text
                    style={[
                      styles.pillText,
                      { color: active ? COLORS.white : COLORS.text },
                    ]}
                  >
                    {tag}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* SECTION: Duration */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Duration</Text>
          <Text style={styles.label}>Options (comma separated)</Text>
          <TextInput
            value={durationOptions}
            onChangeText={setDurationOptions}
            placeholder="e.g. 30 min, 1 hr, 2 hr"
            placeholderTextColor="#9CA3AF"
            style={styles.input}
            returnKeyType="done"
          />
        </View>

        {/* SECTION: Extras */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Extras</Text>

          <Text style={styles.label}>Cost estimate</Text>
          <TextInput
            value={costEstimate}
            onChangeText={setCostEstimate}
            placeholder="e.g. €10–€25"
            placeholderTextColor="#9CA3AF"
            style={styles.input}
            returnKeyType="done"
          />

          <View style={styles.switchRow}>
            <TouchableOpacity
              onPress={() =>
                toggleBool(wheelchairAccessible, setWheelchairAccessible)
              }
              style={[
                styles.switchPill,
                {
                  backgroundColor: wheelchairAccessible
                    ? COLORS.primary
                    : COLORS.white,
                },
              ]}
            >
              <Text
                style={[
                  styles.switchText,
                  { color: wheelchairAccessible ? COLORS.white : COLORS.text },
                ]}
              >
                ♿ Wheelchair accessible
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => toggleBool(ecoFriendly, setEcoFriendly)}
              style={[
                styles.switchPill,
                {
                  backgroundColor: ecoFriendly ? COLORS.primary : COLORS.white,
                },
              ]}
            >
              <Text
                style={[
                  styles.switchText,
                  { color: ecoFriendly ? COLORS.white : COLORS.text },
                ]}
              >
                🌿 Eco-friendly
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => toggleBool(trialAvailable, setTrialAvailable)}
              style={[
                styles.switchPill,
                {
                  backgroundColor: trialAvailable
                    ? COLORS.primary
                    : COLORS.white,
                },
              ]}
            >
              <Text
                style={[
                  styles.switchText,
                  { color: trialAvailable ? COLORS.white : COLORS.text },
                ]}
              >
                🆓 Trial available
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Submit */}
        <TouchableOpacity
          onPress={onSubmit}
          style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
          activeOpacity={0.95}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.submitText}>Submit Hobby</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const CARD_SHADOW_IOS = {
  shadowColor: "#000",
  shadowOpacity: 0.06,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 8 },
};

const styles = StyleSheet.create({
  container: { padding: 16, gap: 14 },
  header: {
    fontSize: 24,
    fontWeight: "900",
    color: COLORS.primary,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 4,
  },

  // CARD
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    ...Platform.select({
      ios: CARD_SHADOW_IOS,
      android: { elevation: 2 },
    }),
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: COLORS.text,
    marginBottom: 10,
  },

  // TEXT ELEMENTS
  label: {
    color: COLORS.text,
    fontWeight: "800",
    marginBottom: 6,
  },
  helper: {
    color: "#6B7280",
    fontSize: 12,
    marginTop: 6,
  },

  // INPUTS
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: COLORS.text,
  },
  textArea: {
    height: 120,
    textAlignVertical: "top",
  },

  // PRIMARY INLINE ACTION (duplicate check)
  primaryAction: {
    marginTop: 10,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryActionText: { color: COLORS.white, fontWeight: "900" },

  // BANNERS
  banner: {
    marginTop: 12,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  bannerWarn: { backgroundColor: "#FEF3C7", borderColor: "#F59E0B" },
  bannerInfo: { backgroundColor: "#EFF6FF", borderColor: "#3B82F6" },
  bannerOk: { backgroundColor: "#ECFDF5", borderColor: "#10B981" },
  bannerTitle: { fontWeight: "900", color: COLORS.text, marginBottom: 6 },
  bannerText: { color: COLORS.text },
  bannerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bannerBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: COLORS.primary,
  },
  bannerBtnText: { color: COLORS.white, fontWeight: "900" },

  // PILLS / CHIPS
  pillsRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 6 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillText: { fontWeight: "800" },

  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.accent,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  chipText: { color: COLORS.white, fontWeight: "800" },
  chipX: { marginLeft: 8, paddingHorizontal: 6, paddingVertical: 2 },
  chipXText: { color: COLORS.white, fontWeight: "900" },

  tagInputRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  addTagBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  addTagText: { color: COLORS.white, fontWeight: "900" },

  // SWITCH-LIKE BUTTONS
  switchRow: { gap: 8, marginTop: 8 },
  switchPill: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  switchText: { fontWeight: "800" },

  // DUP ROW
  dupRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginTop: 6,
  },
  dupName: { color: COLORS.text, fontWeight: "700", flex: 1, marginRight: 10 },
  dupViewBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: COLORS.accent,
  },
  dupViewText: { color: COLORS.white, fontWeight: "900" },

  // SUBMIT
  submitBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 4,
    marginBottom: 20,
    ...Platform.select({
      ios: CARD_SHADOW_IOS,
      android: { elevation: 3 },
    }),
  },
  submitText: { color: COLORS.white, fontWeight: "900", fontSize: 16 },
});
