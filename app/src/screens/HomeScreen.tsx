import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import COLORS from "../style/colours";

const generateDurationOptions = () => [
  "15 min",
  "30 min",
  "45 min",
  "1 hr",
  "1.5 hr",
  "2 hr",
  "3 hr",
  "4 hr",
];

const HomeScreen = ({ navigation }: any) => {
  const { user, isAuthenticated, hasOnboarded, setToken, setUser, loading } =
    useAuth();

  const [menuVisible, setMenuVisible] = useState(false);
  const [duration, setDuration] = useState("45 min");
  const [location, setLocation] = useState<"Indoor" | "Outdoor">("Indoor");

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: 10, color: COLORS.text }}>Loading...</Text>
      </View>
    );
  }

  const handleLogout = async () => {
    await setToken(null);
    await setUser(null);
    navigation.replace("Login");
  };

  const handleMenuSelect = (option: string) => {
    setMenuVisible(false);
    if (option === "Profile") navigation.navigate("Profile");
    else if (option === "Home") navigation.navigate("Home");
    else if (option === "Logout") handleLogout();
  };

  const durationOptions = generateDurationOptions();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Hobby Helper!</Text>

      <View style={styles.contentContainer}>
        <View style={styles.durationHeader}>
          <Text style={styles.sectionTitle}>How much time do you have?</Text>
          <Text style={styles.scrollHint}>→</Text>
        </View>

        <FlatList
          data={durationOptions}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.timeItem,
                item === duration && styles.timeItemSelected,
              ]}
              onPress={() => setDuration(item)}
            >
              <Text
                style={
                  item === duration ? styles.selectedText : styles.timeText
                }
              >
                {item}
              </Text>
            </TouchableOpacity>
          )}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.timeList}
        />

        <Text style={styles.sectionTitle}>Where are you?</Text>
        <View style={styles.locationButtonsContainer}>
          {["Indoor", "Outdoor"].map((loc) => (
            <TouchableOpacity
              key={loc}
              style={[
                styles.locationButton,
                location === loc && styles.locationButtonSelected,
              ]}
              onPress={() => setLocation(loc as "Indoor" | "Outdoor")}
            >
              <Text
                style={
                  location === loc
                    ? styles.locationTextSelected
                    : styles.locationText
                }
              >
                {loc}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.generateWrapper}>
        {/* Only show this for onboarded authenticated users */}
        {isAuthenticated && hasOnboarded && user && (
          <TouchableOpacity
            style={styles.tryNewButton}
            onPress={() =>
              navigation.push("HobbyList", {
                duration,
                location,
                tryNew: true,
              })
            }
          >
            <Text style={styles.buttonTextNew}>Try Something New</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.generateButton}
          onPress={() =>
            navigation.push("HobbyList", {
              duration,
              location,
              tryNew: false,
            })
          }
        >
          <Text style={styles.buttonText}>Generate</Text>
        </TouchableOpacity>
      </View>

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
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: COLORS.background },
  title: {
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
    color: COLORS.primary,
    marginBottom: 20,
  },
  contentContainer: { marginBottom: 20, marginTop: 20 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 20,
  },
  timeItem: {
    width: 85,
    height: 85,
    borderRadius: 20,
    backgroundColor: COLORS.secondary,
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  timeList: {
    paddingHorizontal: 20,
    paddingVertical: 5,
    marginBottom: 50,
  },
  timeItemSelected: { backgroundColor: COLORS.action },
  timeText: { fontSize: 16, color: COLORS.text },
  selectedText: {
    color: COLORS.white,
    fontWeight: "bold",
    fontSize: 16,
  },
  durationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  scrollHint: { fontSize: 20, color: COLORS.primary, fontWeight: "600" },
  locationButtonsContainer: {
    flexDirection: "row",
    gap: 20,
    justifyContent: "center",
    marginTop: 20,
  },
  locationButton: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    backgroundColor: COLORS.secondary,
    borderRadius: 20,
  },
  locationButtonSelected: { backgroundColor: COLORS.action },
  locationText: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
    textAlign: "center",
  },
  locationTextSelected: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.white,
    textAlign: "center",
  },
  tryNewButton: {
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: "center",
    marginBottom: 20,
    borderColor: COLORS.primary,
    borderWidth: 1,
  },
  generateWrapper: {
    flex: 1,
    justifyContent: "flex-end",
    paddingBottom: 50,
  },
  generateButton: {
    backgroundColor: COLORS.action,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "bold",
  },
  buttonTextNew: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: "bold",
  },
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
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
  },
  menuText: {
    fontSize: 16,
    color: COLORS.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
});

export default HomeScreen;
