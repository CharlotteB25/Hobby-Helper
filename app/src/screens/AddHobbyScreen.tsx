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

const pill = (active: boolean) => [
  styles.pill,
  {
    backgroundColor: active ? COLORS.accent : "#fff",
    borderColor: COLORS.accent,
  },
];

export default function AddHobbyScreen({ navigation }: any) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState(""); // comma separated
  const [durationOptions, setDurationOptions] = useState(""); // comma separated
  const [costEstimate, setCostEstimate] = useState("");
  const [wheelchairAccessible, setWheelchairAccessible] = useState(false);
  const [ecoFriendly, setEcoFriendly] = useState(false);
  const [trialAvailable, setTrialAvailable] = useState(false);
  const [locations, setLocations] = useState<LocationOpt[]>(["Indoor"]);

  const [checking, setChecking] = useState(false);
  const [duplicates, setDuplicates] = useState<
    { _id: string; name: string; description?: string }[]
  >([]);
  const [submitting, setSubmitting] = useState(false);

  const tagList = useMemo(
    () =>
      tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    [tags]
  );

  const durationList = useMemo(
    () =>
      durationOptions
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    [durationOptions]
  );

  const toggleLocation = (loc: LocationOpt) => {
    setLocations((prev) =>
      prev.includes(loc) ? prev.filter((l) => l !== loc) : [...prev, loc]
    );
  };

  const toggleBool = (cur: boolean, setter: (v: boolean) => void) =>
    setter(!cur);

  const normalized = (s: string) => s.trim().toLowerCase();

  const onCheckDuplicates = useCallback(async () => {
    const q = name.trim();
    if (!q) {
      Alert.alert("Enter a name", "Please type a hobby name first.");
      return;
    }
    try {
      setChecking(true);
      const results = await searchHobbiesByName(q);
      // Simple client-side match: same or contains
      const norm = normalized(q);
      const matches = (results ?? []).filter((h: any) => {
        const n = normalized(h?.name ?? "");
        return n === norm || n.includes(norm) || norm.includes(n);
      });
      setDuplicates(matches);
    } catch (e) {
      console.error("Duplicate check failed:", e);
      Alert.alert("Error", "Could not check for duplicates.");
    } finally {
      setChecking(false);
    }
  }, [name]);

  const onSubmit = useCallback(async () => {
    if (!name.trim() || !description.trim()) {
      Alert.alert("Missing info", "Name and description are required.");
      return;
    }
    if (locations.length === 0) {
      Alert.alert("Pick a location", "Select at least one: Indoor/Outdoor.");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: name.trim(),
        description: description.trim(),
        tags: tagList,
        durationOptions: durationList,
        locationOptions: locations,
        costEstimate: costEstimate.trim() || undefined,
        wheelchairAccessible,
        ecoFriendly,
        trialAvailable,
      };

      const created = await createHobby(payload);

      // Route through Splash so the HobbyDetail gets a beat to load maps
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
  }, [
    name,
    description,
    tagList,
    durationList,
    locations,
    costEstimate,
    wheelchairAccessible,
    ecoFriendly,
    trialAvailable,
    navigation,
  ]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      behavior={Platform.select({ ios: "padding", android: undefined })}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.header}>Add a New Hobby</Text>

        {/* Name + duplicate check */}
        <View style={styles.card}>
          <Text style={styles.label}>Name *</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Urban Sketching"
            placeholderTextColor="#9CA3AF"
            style={styles.input}
          />
          <TouchableOpacity
            onPress={onCheckDuplicates}
            style={styles.checkBtn}
            activeOpacity={0.9}
          >
            {checking ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.checkBtnText}>Check if it exists</Text>
            )}
          </TouchableOpacity>

          {duplicates.length > 0 ? (
            <View style={styles.dupWrap}>
              <Text style={styles.dupTitle}>Possible matches</Text>
              {duplicates.map((h) => (
                <View key={h._id} style={styles.dupRow}>
                  <Text style={styles.dupName}>{h.name}</Text>
                  <TouchableOpacity
                    onPress={() =>
                      navigation.navigate("Splash", {
                        next: { screen: "HobbyDetail", params: { hobby: h } },
                      })
                    }
                    style={styles.dupViewBtn}
                  >
                    <Text style={styles.dupViewText}>View</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        {/* Description */}
        <View style={styles.card}>
          <Text style={styles.label}>Description *</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="What is it? Where/How to do it? Who is it for?"
            placeholderTextColor="#9CA3AF"
            style={[styles.input, { height: 100, textAlignVertical: "top" }]}
            multiline
          />
        </View>

        {/* Locations */}
        <View style={styles.card}>
          <Text style={styles.label}>Location</Text>
          <View style={styles.pillsRow}>
            {(["Indoor", "Outdoor"] as const).map((loc) => (
              <TouchableOpacity
                key={loc}
                style={pill(locations.includes(loc))}
                onPress={() => toggleLocation(loc)}
              >
                <Text
                  style={[
                    styles.pillText,
                    {
                      color: locations.includes(loc)
                        ? COLORS.white
                        : COLORS.text,
                    },
                  ]}
                >
                  {loc} {loc === "Indoor" ? "🏠" : "🌤️"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Tags + durations */}
        <View style={styles.card}>
          <Text style={styles.label}>Tags (comma separated)</Text>
          <TextInput
            value={tags}
            onChangeText={setTags}
            placeholder="e.g. Art, Drawing, Mindfulness"
            placeholderTextColor="#9CA3AF"
            style={styles.input}
          />

          <Text style={[styles.label, { marginTop: 10 }]}>
            Duration options (comma separated)
          </Text>
          <TextInput
            value={durationOptions}
            onChangeText={setDurationOptions}
            placeholder="e.g. 30 min, 1 hr, 2 hr"
            placeholderTextColor="#9CA3AF"
            style={styles.input}
          />
        </View>

        {/* Extras */}
        <View style={styles.card}>
          <Text style={styles.label}>Cost estimate</Text>
          <TextInput
            value={costEstimate}
            onChangeText={setCostEstimate}
            placeholder="e.g. €10–€25"
            placeholderTextColor="#9CA3AF"
            style={styles.input}
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
                    ? COLORS.accent
                    : "#fff",
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
                { backgroundColor: ecoFriendly ? COLORS.accent : "#fff" },
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
                { backgroundColor: trialAvailable ? COLORS.accent : "#fff" },
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
          style={styles.submitBtn}
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

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  header: {
    fontSize: 22,
    fontWeight: "900",
    color: COLORS.primary,
    textAlign: "center",
    marginBottom: 8,
  },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },

  label: { color: COLORS.text, fontWeight: "800", marginBottom: 6 },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    padding: 12,
    color: COLORS.text,
  },

  pillsRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 2,
  },
  pillText: { fontWeight: "800" },

  switchRow: { gap: 8, marginTop: 8 },
  switchPill: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  switchText: { fontWeight: "800" },

  checkBtn: {
    marginTop: 10,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  checkBtnText: { color: COLORS.white, fontWeight: "900" },

  dupWrap: { marginTop: 12, gap: 8 },
  dupTitle: { fontWeight: "900", color: COLORS.text, marginBottom: 2 },
  dupRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  dupName: { color: COLORS.text, fontWeight: "700", flex: 1, marginRight: 10 },
  dupViewBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: COLORS.accent,
  },
  dupViewText: { color: COLORS.white, fontWeight: "900" },

  submitBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 4,
  },
  submitText: { color: COLORS.white, fontWeight: "900", fontSize: 16 },
});
