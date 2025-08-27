import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, Alert } from "react-native";
import COLORS from "../style/colours";
import UserInfoSection from "./components/UserInfoSection";
import HobbyHistorySection from "./components/HobbyHistorySection";
import { getCurrentUser, updateUser } from "../services/userService";
import SplashLoadingWrapper from "./components/SplashLoadingWrapper";
import { HobbyHistoryItem } from "./components/HobbyHistorySection"; // Adjust the import based on your project structure

const ProfileScreen = () => {
  const [profile, setProfile] = useState<{
    name: string;
    email: string;
    favouriteTags: string[];
    preferences: {
      wheelchairAccessible: boolean;
      ecoFriendly: boolean;
      trialAvailable: boolean;
    };
    hobbyHistory?: HobbyHistoryItem[];
  }>({
    name: "",
    email: "",
    favouriteTags: [],
    preferences: {
      wheelchairAccessible: false,
      ecoFriendly: false,
      trialAvailable: false,
    },
  });

  // ✅ Fetch user profile from DB on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await getCurrentUser();
        setProfile(data);
      } catch (err) {
        console.error("Failed to fetch profile:", err);
        Alert.alert("Error", "Failed to load profile.");
      }
    };

    fetchProfile();
  }, []);

  const handleSave = async (updatedData: typeof profile) => {
    try {
      const data = await updateUser(updatedData);
      setProfile(data);
      Alert.alert("Success", "Profile updated!");
    } catch (err) {
      console.error("Failed to update profile:", err);
      Alert.alert("Error", "Failed to update profile.");
    }
  };

  const hobbyHistoryData: any[] = profile.hobbyHistory || [];

  const DATA: SectionItem[] = [
    { type: "header" },
    { type: "userInfo" },
    { type: "hobbyHistory", data: hobbyHistoryData },
  ];

  type SectionItem =
    | { type: "header" }
    | { type: "userInfo" }
    | { type: "hobbyHistory"; data: any[] }; // Replace 'any[]' with the correct type if available

  const renderSection = ({ item }: { item: SectionItem }) => {
    switch (item.type) {
      case "header":
        return <Text style={styles.header}>Profile</Text>;

      case "userInfo":
        return (
          <View style={styles.card}>
            <UserInfoSection profile={profile} onSave={handleSave} />
          </View>
        );

      case "hobbyHistory":
        return (
          <View style={styles.card}>
            <HobbyHistorySection data={item.data} />
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={DATA}
        keyExtractor={(item, index) => index.toString()}
        renderItem={renderSection}
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 20,
    textAlign: "center",
    color: COLORS.primary,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});

export default ProfileScreen;
