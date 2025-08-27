import React, { useEffect, useState } from "react";
import {
  NavigationContainer,
  useNavigationContainerRef,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  TouchableOpacity,
  Text,
  View,
  Modal,
  Image,
  Alert,
  StyleSheet,
  Pressable,
} from "react-native";

import COLORS from "../style/colours";

import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import HomeScreen from "../screens/HomeScreen";
import HobbyListScreen from "../screens/HobbyListScreen";
import ProfileScreen from "../screens/ProfileScreen";
import HobbyDetailScreen from "../screens/HobbyDetailScreen";
import RatingScreen from "../screens/RatingScreen";
import OnboardingNavigator from "./OnboardingNavigator";
import { NotificationHandler } from "../utils/notificationHandler";
import { navigationRef } from "../services/navigationService";

import { useAuth } from "../context/AuthContext";
import { logoutUser } from "../services/userService";

type DifficultyLevel = { level: string; youtubeLinks: string[] };
type Location = {
  name: string;
  address: string;
  lat: number;
  lng: number;
  trialAvailable: boolean;
};
type Hobby = {
  _id?: string;
  name: string;
  description: string;
  durationOptions: string[];
  locationOptions: string[];
  tags: string[];
  difficultyLevels: DifficultyLevel[];
  locations: Location[];
  equipment: string[];
  costEstimate: string;
  safetyNotes: string;
  wheelchairAccessible: boolean;
  ecoFriendly: boolean;
  createdAt?: Date;
};

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Home: undefined;
  HobbyList: undefined;
  Profile: undefined;
  HobbyDetail: { hobby: Hobby; showRatingModal?: boolean };
  Rating: { hobby: Hobby; userId: string };
  Onboarding: undefined;
  Explore: { tag: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const [menuVisible, setMenuVisible] = useState(false);

  const { token, setToken, hasOnboarded, refreshOnboarding, loading, logout } =
    useAuth();

  const isAuthenticated = Boolean(token) && hasOnboarded;

  // 🔐 Ensure onboarding state is always fresh
  useEffect(() => {
    const sync = async () => {
      if (token) {
        await refreshOnboarding();
      } else {
        await AsyncStorage.removeItem("hasOnboarded");
        await refreshOnboarding();
      }
    };

    sync();
  }, [token]);

  const handleMenuSelect = async (item: "Profile" | "Logout" | "Login") => {
    setMenuVisible(false);
    if (item === "Logout") {
      try {
        await logout();
        await refreshOnboarding();
        Alert.alert("Logged Out", "You have successfully logged out.");

        if (navigationRef.getCurrentRoute()?.name !== "Home") {
          navigationRef.navigate("Home");
        }
      } catch (error) {
        console.error("Logout failed:", error);
        Alert.alert("Logout Error", "Something went wrong while logging out.");
      }
    } else {
      navigationRef.navigate(item);
    }
  };

  // 🛑 Wait until auth state is ready
  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: COLORS.background,
        }}
      >
        <Text style={{ color: COLORS.primary, fontSize: 18 }}>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <NotificationHandler />
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.background },
          headerTintColor: COLORS.primary,
          headerTitleStyle: { fontWeight: "bold", fontSize: 20 },
          contentStyle: { backgroundColor: COLORS.primary },
          headerBackVisible: false,

          headerTitle: () => (
            <TouchableOpacity
              onPress={() => {
                if (navigationRef.getCurrentRoute()?.name !== "Home") {
                  navigationRef.navigate("Home");
                }
              }}
            >
              {" "}
              <Image
                source={require("../../assets/hobbyHelper_logo.png")}
                style={{
                  height: 40,
                  width: 40,
                  resizeMode: "contain",
                  marginLeft: -40,
                }}
              />
            </TouchableOpacity>
          ),

          headerRight: () => (
            <TouchableOpacity
              onPress={() => setMenuVisible(true)}
              style={{ marginRight: 16 }}
            >
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: "bold",
                  color: COLORS.primary,
                }}
              >
                ☰
              </Text>
            </TouchableOpacity>
          ),
        }}
      >
        <Stack.Screen
          name="Onboarding"
          component={OnboardingNavigator}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Register"
          component={RegisterScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="HobbyList" component={HobbyListScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="HobbyDetail" component={HobbyDetailScreen} />
        <Stack.Screen name="Rating" component={RatingScreen} />
      </Stack.Navigator>

      {/* Side menu */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPressOut={() => setMenuVisible(false)}
        >
          <View style={styles.menuContainer}>
            {menuVisible &&
              (["Profile", isAuthenticated ? "Logout" : "Login"] as const).map(
                (item) => (
                  <TouchableOpacity
                    key={item}
                    onPress={() => handleMenuSelect(item)}
                    style={{ paddingVertical: 8 }}
                  >
                    <Text style={styles.menuText}>{item}</Text>
                  </TouchableOpacity>
                )
              )}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
});
