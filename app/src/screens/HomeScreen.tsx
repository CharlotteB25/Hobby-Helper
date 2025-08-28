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
import COLORS from "../style/colours"; // using your updated palette

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
  const {
    user,
    isAuthenticated,
    hasOnboarded,
    setToken,
    setUser,
    loading,
    logout,
  } = useAuth();

  const [menuVisible, setMenuVisible] = useState(false);
  const [mood, setMood] = useState<Mood>(MOODS[0]);
  const [location, setLocation] = useState<"Indoor" | "Outdoor">("Indoor");

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={{ marginTop: 10, color: COLORS.text }}>Loading...</Text>
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
        {/* Orange Hero Section */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Find your next hobby</Text>
          <Text style={styles.heroSubtitle}>Match it to your mood & place</Text>
        </View>

        {/* White Sheet */}
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
                      <Text style={styles.moodText}>{m.label}</Text>
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
                        style={
                          selected
                            ? styles.segmentTextSelected
                            : styles.segmentText
                        }
                      >
                        {loc} {loc === "Indoor" ? "🏠" : "🌤️"}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          {/* Sticky CTA inside sheet */}

          <View style={styles.ctaWrapper}>
            {isAuthenticated && (
              <TouchableOpacity
                style={styles.tryNewButton}
                onPress={() =>
                  navigation.push("HobbyList", {
                    mood: mood.key,
                    location,
                    tryNew: true,
                  })
                }
                activeOpacity={0.95}
              >
                <Text style={styles.tryNewText}>Try Something New</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.generateButton}
              onPress={() =>
                navigation.push("HobbyList", {
                  mood: mood.key,
                  location,
                  tryNew: false,
                })
              }
              activeOpacity={0.98}
            >
              <Text style={styles.generateText}>Generate</Text>
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
  safe: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1, backgroundColor: COLORS.background },

  // Hero
  hero: {
    backgroundColor: COLORS.primary,
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: "center",
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  heroTitle: { color: COLORS.white, fontSize: 28, fontWeight: "900" },
  heroSubtitle: {
    color: COLORS.white,
    fontSize: 15,
    marginTop: 8,
    opacity: 0.9,
  },
  avatar: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.secondary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  avatarEmoji: { fontSize: 16 },

  // Sheet
  sheet: {
    flex: 1,
    backgroundColor: COLORS.secondary,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: 20,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: -2 },
  },
  scrollContent: { padding: 20, paddingBottom: 120 },

  // Section
  sectionTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 12,
  },

  // Mood grid
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
  moodText: { color: COLORS.text, fontWeight: "600", fontSize: 13 },

  // Location segmented
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
    paddingVertical: 25,
    borderRadius: 8,
    alignItems: "center",
  },
  segmentItemSelected: { backgroundColor: COLORS.accent },
  segmentText: { color: COLORS.text, fontWeight: "700" },
  segmentTextSelected: { color: COLORS.text, fontWeight: "800" },

  // CTA area
  ctaWrapper: {
    padding: 20,
  },
  tryNewButton: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white,
  },
  tryNewText: { color: COLORS.primary, fontSize: 15, fontWeight: "800" },
  generateButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  generateText: { color: COLORS.white, fontSize: 16, fontWeight: "900" },

  // Menu + loading
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
  menuText: { fontSize: 16, color: COLORS.text },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
});

export default HomeScreen;
