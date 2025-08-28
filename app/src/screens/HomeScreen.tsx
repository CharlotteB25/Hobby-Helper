import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import COLORS from "../style/colours"; // make sure: white, green, orange, text defined

type Mood = { key: string; label: string; emoji: string };

const MOODS: Mood[] = [
  { key: "chill", emoji: "🧊", label: "Chill" },
  { key: "creative", emoji: "🎨", label: "Creative" },
  { key: "energetic", emoji: "⚡", label: "Energetic" },
  { key: "social", emoji: "🗣️", label: "Social" },
  { key: "curious", emoji: "🧠", label: "Curious" },
  { key: "focused", emoji: "🎯", label: "Focused" },
];

const HomeScreen = ({ navigation }: any) => {
  const { isAuthenticated, loading, logout } = useAuth();

  const [menuVisible, setMenuVisible] = useState(false);
  const [mood, setMood] = useState<Mood>(MOODS[0]);
  const [location, setLocation] = useState<"Indoor" | "Outdoor">("Indoor");

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.orange} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const handleLogout = async () => {
    await logout();
    navigation.replace("Login");
  };

  const handleMenuSelect = (option: string) => {
    setMenuVisible(false);
    if (option === "Profile") navigation.navigate("Profile");
    else if (option === "Home") navigation.navigate("Home");
    else if (option === "Logout") handleLogout();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Hero (orange = 10%) */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Find your next hobby</Text>
          <Text style={styles.heroSubtitle}>Match it to your mood & place</Text>
        </View>

        {/* White Sheet (60% neutral) */}
        <View style={styles.sheet}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Mood grid */}
            <View>
              <Text style={styles.sectionTitle}>How are you feeling?</Text>
              <View style={styles.moodGrid}>
                {MOODS.map((m) => {
                  const selected = m.key === mood.key;
                  return (
                    <TouchableOpacity
                      key={m.key}
                      onPress={() => setMood(m)}
                      style={[
                        styles.moodItem,
                        selected && styles.moodItemSelected,
                      ]}
                      activeOpacity={0.9}
                    >
                      <Text style={styles.moodEmoji}>{m.emoji}</Text>
                      <Text
                        style={[
                          styles.moodText,
                          selected && styles.moodTextSelected,
                        ]}
                      >
                        {m.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Location */}
            <View>
              <Text style={styles.sectionTitle}>Where are you?</Text>
              <View style={styles.segment}>
                {(["Indoor", "Outdoor"] as const).map((loc) => {
                  const selected = location === loc;
                  return (
                    <TouchableOpacity
                      key={loc}
                      style={[
                        styles.segmentItem,
                        selected && styles.segmentItemSelected,
                      ]}
                      onPress={() => setLocation(loc)}
                      activeOpacity={0.9}
                    >
                      <Text
                        style={[
                          styles.segmentText,
                          selected && styles.segmentTextSelected,
                        ]}
                      >
                        {loc} {loc === "Indoor" ? "🏠" : "🌤️"}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          {/* CTAs (orange buttons) */}
          <View style={styles.ctaWrapper}>
            {isAuthenticated && (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() =>
                  navigation.push("HobbyList", {
                    mood: mood.key,
                    location,
                    tryNew: true,
                  })
                }
                activeOpacity={0.95}
              >
                <Text style={styles.secondaryButtonText}>
                  Try Something New
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() =>
                navigation.push("HobbyList", {
                  mood: mood.key,
                  location,
                  tryNew: false,
                })
              }
              activeOpacity={0.98}
            >
              <Text style={styles.primaryButtonText}>Generate</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Menu */}
        <Modal
          visible={menuVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setMenuVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPressOut={() => setMenuVisible(false)}
          >
            <View style={styles.menuContainer}>
              {["Home", "Profile", "Logout"].map((item) => (
                <TouchableOpacity
                  key={item}
                  onPress={() => handleMenuSelect(item)}
                  style={{ paddingVertical: 8 }}
                >
                  <Text style={styles.menuText}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  /* Background (60%) */
  safe: { flex: 1, backgroundColor: COLORS.white },
  container: { flex: 1, backgroundColor: COLORS.white },

  /* Hero (10% orange, eyecatcher) */
  hero: {
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    paddingHorizontal: 15,
    alignItems: "center",
    borderBottomLeftRadius: 60,
    borderBottomRightRadius: 60,
  },
  heroTitle: { color: COLORS.white, fontSize: 28, fontWeight: "900" },
  heroSubtitle: {
    color: COLORS.white,
    fontSize: 15,
    marginTop: 6,
    opacity: 0.9,
  },

  /* Sheet */
  sheet: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: 20,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: -2 },
  },
  scrollContent: { padding: 20, paddingBottom: 120 },

  /* Section titles */
  sectionTitle: {
    color: COLORS.accent,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 12,
  },

  /* Mood grid (green accents) */
  moodGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
  },
  moodItem: {
    width: "32%",
    aspectRatio: 1,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.accent,
    marginBottom: 10,
  },
  moodItemSelected: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  moodEmoji: { fontSize: 24, marginBottom: 6 },
  moodText: { color: COLORS.accent, fontWeight: "600", fontSize: 13 },
  moodTextSelected: { color: COLORS.white, fontWeight: "700" },

  /* Location segmented (green) */
  segment: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 22,
    borderRadius: 8,
    alignItems: "center",
  },
  segmentItemSelected: { backgroundColor: COLORS.accent },
  segmentText: { color: COLORS.accent, fontWeight: "700" },
  segmentTextSelected: { color: COLORS.white, fontWeight: "800" },

  /* CTAs (orange) */
  ctaWrapper: { padding: 20 },
  secondaryButton: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white,
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: "800",
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryButtonText: { color: COLORS.white, fontSize: 16, fontWeight: "900" },

  /* Menu */
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 60,
    paddingRight: 20,
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  menuContainer: {
    backgroundColor: COLORS.white,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  menuText: { fontSize: 16, color: COLORS.accent },

  /* Loading */
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.white,
  },
  loadingText: { marginTop: 10, color: COLORS.accent },
});

export default HomeScreen;
