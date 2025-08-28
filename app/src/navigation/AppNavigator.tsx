// src/navigation/AppNavigator.tsx
import React, { useState, useEffect, useMemo } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import COLORS from "../style/colours";

import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import HomeScreen from "../screens/HomeScreen";
import HobbyListWrapper from "../screens/components/HobbyListWrapper";
import ProfileScreen from "../screens/ProfileScreen";
import HobbyDetailScreen from "../screens/HobbyDetailScreen";
import RatingScreen from "../screens/RatingScreen";
import OnboardingNavigator from "./OnboardingNavigator";
import { NotificationHandler } from "../utils/notificationHandler";
// ⬇️ use both the ref (for .getCurrentRoute()) and the typed helper for navigating
import {
  navigationRef,
  navigate as navTo,
} from "../services/navigationService";
import { useAuth } from "../context/AuthContext";
import SplashScreen from "../screens/components/SplashScreen";

type DifficultyLevel = { level: string; youtubeLinks: string[] };
type Location = {
  name: string;
  address: string;
  lat: number;
  lng: number;
  trialAvailable: boolean;
};
type Hobby = {
  trialAvailable: boolean;
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
  Splash:
    | { next?: { screen: keyof RootStackParamList; params?: any } }
    | undefined;
  Login: undefined;
  Register: undefined;
  Home: undefined;
  HobbyList:
    | { mood: string; location: "Indoor" | "Outdoor"; tryNew: boolean }
    | undefined;
  Profile: undefined;
  HobbyDetail: { hobby: Hobby; showRatingModal?: boolean };
  Rating: { hobby: Hobby; userId: string };
  Onboarding: undefined;
  Explore: { tag: string };
  AddHobby: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

type MenuItem =
  | {
      key: string;
      label: string;
      route: keyof RootStackParamList;
      action?: never;
    }
  | {
      key: string;
      label: string;
      route?: never;
      action: "logout";
    };

export default function AppNavigator() {
  const [menuVisible, setMenuVisible] = useState(false);
  const { isAuthenticated, refreshOnboarding, loading, logout, user } =
    useAuth() as any;

  useEffect(() => {
    (async () => {
      if (!isAuthenticated) {
        await AsyncStorage.removeItem("hasOnboarded");
      }
      await refreshOnboarding();
    })();
  }, [isAuthenticated, refreshOnboarding]);

  const menuItems: MenuItem[] = useMemo(() => {
    if (isAuthenticated) {
      return [
        { key: "profile", label: "Profile", route: "Profile" },
        { key: "add", label: "Add a Hobby", route: "AddHobby" },
        { key: "logout", label: "Log out", action: "logout" },
      ];
    }
    return [{ key: "login", label: "Log in", icon: "🔑", route: "Login" }];
  }, [isAuthenticated]);

  const onSelect = async (item: MenuItem) => {
    setMenuVisible(false);
    if (item.action === "logout") {
      try {
        await logout();
        await refreshOnboarding();
        Alert.alert("Logged Out", "You have successfully logged out.");
        if (navigationRef.getCurrentRoute()?.name !== "Home") {
          navTo("Home"); // ✅ use typed helper
        }
      } catch (error) {
        console.error("Logout failed:", error);
        Alert.alert("Logout Error", "Something went wrong while logging out.");
      }
      return;
    }
    if (item.route) {
      navTo(item.route); // ✅ typed; fixes “No overload matches this call”
    }
  };

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
        <Text style={{ color: COLORS.primary, fontSize: 18 }}>Loading…</Text>
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
          headerBackVisible: false,

          headerTitle: () => (
            <TouchableOpacity
              onPress={() => {
                if (navigationRef.getCurrentRoute()?.name !== "Home") {
                  navTo("Home"); // ✅ typed helper here too
                }
              }}
            >
              <Image
                source={require("../../assets/title_logo.png")}
                style={{
                  height: 90,
                  width: 200,
                  resizeMode: "contain",
                  marginLeft: -50,
                  marginBottom: -20,
                  marginTop: -10,
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
          name="Splash"
          component={SplashScreen}
          options={{ headerShown: false }}
        />
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
        <Stack.Screen name="HobbyList" component={HobbyListWrapper} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="HobbyDetail" component={HobbyDetailScreen} />
        {/* ✅ make sure RatingScreen is typed — see file below */}
        <Stack.Screen name="Rating" component={RatingScreen} />
        <Stack.Screen
          name="AddHobby"
          component={require("../screens/AddHobbyScreen").default}
        />
      </Stack.Navigator>

      {/* Side Menu */}
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
          <View style={styles.menuSheet}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuAppTitle}>Hobby Helper</Text>
              <Text style={styles.menuGreeting}>
                {isAuthenticated
                  ? `Hi, ${user?.name || "friend"}!`
                  : "Welcome!"}
              </Text>
            </View>

            <View style={styles.menuList}>
              {menuItems.map((item) => (
                <TouchableOpacity
                  key={item.key}
                  onPress={() => onSelect(item)}
                  activeOpacity={0.85}
                  style={styles.menuRow}
                >
                  <Text style={styles.menuLabel}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.menuFooter}>
              <Text style={styles.menuFooterText}>v1.0 • Stay curious ✨</Text>
            </View>
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
    paddingRight: 16,
    backgroundColor: "rgba(0,0,0,0.12)",
  },

  menuSheet: {
    width: 120,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },

  menuHeader: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  menuAppTitle: {
    color: COLORS.white,
    fontWeight: "900",
    fontSize: 16,
  },
  menuGreeting: {
    color: COLORS.white,
    opacity: 0.9,
    marginTop: 2,
  },

  menuList: {
    paddingVertical: 6,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  menuIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  menuLabel: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: "800",
  },

  menuFooter: {
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#F9FAFB",
  },
  menuFooterText: {
    fontSize: 12,
    color: COLORS.text,
    opacity: 0.6,
    textAlign: "center",
  },
});
