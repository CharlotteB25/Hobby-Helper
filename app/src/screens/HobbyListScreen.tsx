import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  Alert,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import COLORS from "../style/colours";
import { getSuggestedHobbies } from "../services/hobbyService";
import { useAuth } from "../context/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { hasCompletedOnboarding } from "../utils/onboardingStorage";

const HobbyList = ({ route, navigation }: any) => {
  const { duration, location, tryNew } = route.params;
  const [hobbies, setHobbies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const { token, user, hasOnboarded } = useAuth();

  const [modalVisible, setModalVisible] = useState(false);
  const [redirectHobby, setRedirectHobby] = useState<any | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const handlePressHobby = async (hobby: any) => {
    const onboarded = await hasCompletedOnboarding();

    if (token && hasOnboarded) {
      navigation.navigate("HobbyDetail", { hobby });
      return;
    }

    await AsyncStorage.setItem(
      "postLoginRedirect",
      JSON.stringify({
        screen: "HobbyDetail",
        params: { hobby },
      })
    );

    setRedirectHobby(hobby);
    setShowLogin(!token);
    setShowOnboarding(!onboarded);
    setModalVisible(true);
  };

  useFocusEffect(
    useCallback(() => {
      const fetchHobbies = async () => {
        try {
          setLoading(true);

          let filters: any = { duration, location, tryNew };

          if (token && user) {
            const preferences = user.preferences ?? {};
            filters = {
              ...filters,
              wheelchairAccessible: preferences.wheelchairAccessible,
              ecoFriendly: preferences.ecoFriendly,
              trialAvailable: preferences.trialAvailable,
            };
          }

          console.log("🔍 Filters:", filters);
          const data = await getSuggestedHobbies(filters);
          setHobbies(data);
        } catch (err) {
          console.error("❌ Error fetching hobbies:", err);
          Alert.alert("Error", "Unable to load hobbies. Try again later.");
        } finally {
          setLoading(false);
        }
      };

      fetchHobbies();
    }, [duration, location, tryNew, token, user])
  );

  if (loading || (token && !user)) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Suggested Hobbies</Text>

      {hobbies.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No Matches Found</Text>
          <Text style={styles.emptyMessage}>
            Try adjusting your filters or updating your profile preferences.
          </Text>
          <TouchableOpacity
            style={styles.tryAgainButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.tryAgainText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={hobbies}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ paddingBottom: 100 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => handlePressHobby(item)}
              activeOpacity={0.9}
            >
              <View style={styles.infoSection}>
                <Text style={styles.hobbyName}>{item.name}</Text>
                <Text style={styles.hobbyDesc} numberOfLines={2}>
                  {item.description}
                </Text>
                <View style={styles.tagRow}>
                  <Text style={styles.tag}>
                    {item.tags.slice(0, 3).join(", ")}
                  </Text>
                  <Text style={styles.cost}>{item.costEstimate}</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
          scrollEnabled={!modalVisible}
        />
      )}

      {modalVisible && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Access Required</Text>
            <Text style={styles.modalText}>
              Please log in or finish onboarding to view hobby details.
            </Text>

            {showLogin && (
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => {
                  setModalVisible(false);
                  navigation.navigate("Login");
                }}
              >
                <Text style={styles.modalButtonText}>Login</Text>
              </TouchableOpacity>
            )}

            {showOnboarding && (
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => {
                  setModalVisible(false);
                  navigation.navigate("Onboarding");
                }}
              >
                <Text style={styles.modalButtonText}>Complete Onboarding</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backButtonText}>Nothing you love? Try again!</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: COLORS.background },
  header: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 40,
    textAlign: "center",
    color: COLORS.primary,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginBottom: 16,
    padding: 16,
    elevation: 4,
  },
  infoSection: {
    flexDirection: "row",
  },
  hobbyName: { fontSize: 18, fontWeight: "700", color: COLORS.primary },
  hobbyDesc: { fontSize: 14, color: COLORS.text, marginVertical: 10 },
  tagRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  tag: { fontSize: 14, color: COLORS.primary },
  cost: { fontSize: 14, color: COLORS.text, fontWeight: "600" },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  backButton: {
    backgroundColor: COLORS.action,
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: "center",
    marginBottom: 30,
  },
  backButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "bold",
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modalContainer: {
    backgroundColor: COLORS.white,
    padding: 24,
    borderRadius: 12,
    width: "80%",
    alignItems: "center",
    elevation: 6,
  },
  modalTitle: { fontSize: 20, fontWeight: "bold", color: COLORS.primary },
  modalText: {
    fontSize: 16,
    color: COLORS.text,
    textAlign: "center",
    marginVertical: 12,
  },
  modalButton: {
    backgroundColor: COLORS.action,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 10,
    width: "100%",
    alignItems: "center",
  },
  modalButtonText: { color: COLORS.white, fontWeight: "600" },
  cancelText: {
    color: COLORS.primary,
    marginTop: 10,
    fontWeight: "500",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    padding: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 10,
    textAlign: "center",
  },
  emptyMessage: {
    fontSize: 16,
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 20,
  },
  tryAgainButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  tryAgainText: {
    color: COLORS.white,
    fontWeight: "bold",
    fontSize: 16,
  },
});

export default HobbyList;
