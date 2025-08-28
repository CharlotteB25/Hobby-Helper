// src/services/notificationService.ts
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "./api";
import { getToken, clearToken } from "./tokenManager";

/** History item saved on the user */
export type HobbyHistoryItem = {
  id: string | number;
  hobbyId?: string;
  name: string;
  date: string; // ISO string
  rating?: number;
  notes?: string;
  mood?: "chill" | "creative" | "energetic" | "social" | "curious" | "focused";
  location?: "Indoor" | "Outdoor";
  tags?: string[];
};

export interface Preferences {
  wheelchairAccessible: boolean;
  ecoFriendly: boolean;
  trialAvailable: boolean;
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  favouriteTags?: string[];
  password?: string;
  preferences?: Preferences;
}

// ⚙️ Foreground behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ✅ Android default channel
export const setupAndroidChannel = async () => {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.HIGH,
      sound: "default",
    });
  }
};

// 🕊️ Android “nudges” channel (gentle)
export const setupAndroidNudgeChannel = async () => {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("nudges", {
      name: "Nudges",
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: null, // fine at the *channel* level
      vibrationPattern: [0],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }
};

// 🔐 Permissions
export const requestNotificationPermissions = async (): Promise<boolean> => {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") {
    const { status: newStatus } = await Notifications.requestPermissionsAsync();
    return newStatus === "granted";
  }
  return true;
};

// 🔔 Rating reminder after X seconds
export const scheduleRatingReminder = async (
  hobbyId: string,
  delayInSeconds: number = 7200
): Promise<void> => {
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    console.warn("🔒 Notification permission not granted.");
    return;
  }

  await setupAndroidChannel();

  const scheduledAt = new Date(Date.now() + delayInSeconds * 1000);
  console.log("📅 Scheduling notification with data:", { hobbyId });
  console.log(
    "📅 Notification will fire at:",
    scheduledAt.toLocaleTimeString()
  );

  const trigger: Notifications.TimeIntervalTriggerInput = {
    type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, // ✅ enum, not string
    seconds: delayInSeconds,
    repeats: false,
    channelId: "default",
  };

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "How was your hobby?",
      body: "Please rate your experience with the hobby.",
      data: { hobbyId: String(hobbyId) },
      sound: "default",
    },
    trigger,
  });
};

// 🌱 Random gentle nudge (default 30s)
const NUDGE_ID_KEY = "nudges:lastScheduledId";
const NUDGE_MESSAGES = [
  "Let’s try something creative today! 🎨",
  "Mini challenge: 10 mins of focused fun? 🎯",
  "How about a chill activity to reset? 🧊",
  "Feeling energetic? Try a quick burst! ⚡",
  "Call a friend and do something social? 🗣️",
  "Learn one new thing today. 🧠",
];

const pickRandom = <T,>(arr: T[]): T =>
  arr[Math.floor(Math.random() * arr.length)];

export const scheduleRandomNudge = async (delaySeconds = 30) => {
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return;

  await setupAndroidNudgeChannel();

  // cancel previous dev nudge
  const prevId = await AsyncStorage.getItem(NUDGE_ID_KEY);
  if (prevId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(prevId);
    } catch {}
  }

  const trigger: Notifications.TimeIntervalTriggerInput = {
    type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, // ✅ enum, not string
    seconds: delaySeconds,
    repeats: false,
    channelId: Platform.OS === "android" ? "nudges" : undefined,
  };

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Quick nudge",
      body: pickRandom(NUDGE_MESSAGES),
      data: { type: "nudge" },
      sound: false, // ✅ silent content (TS expects string | boolean | undefined)
    },
    trigger,
  });

  await AsyncStorage.setItem(NUDGE_ID_KEY, id);
};

// ——— existing auth/user helpers ———
export const loginUser = async (email: string, password: string) => {
  const res = await api.post("/login", { email, password });
  return res.data;
};

export const getCurrentUser = async () => {
  const token = await getToken();
  const res = await api.get("/users/profile", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export const updateUser = async (updatedData: UpdateUserData) => {
  const res = await api.patch("/users/profile", updatedData);
  return res.data;
};

export const saveHobbyHistory = async (historyData: {
  hobbyId: string;
  performedAt: Date;
  rating: number;
  notes?: string;
}) => {
  const res = await api.post("/users/history", historyData);
  return res.data;
};

export const saveUserHobby = async (data: {
  user: string;
  hobby: string;
  performedAt: string; // ISO date string
  rating: number;
  notes?: string;
}) => {
  const res = await api.post("/user-hobbies", data);
  return res.data;
};

export const logoutUser = async () => {
  await AsyncStorage.removeItem("authToken");
  await AsyncStorage.removeItem("userData");
  clearToken?.();
  const storedToken = await AsyncStorage.getItem("authToken");
  console.log("Stored token after logout:", storedToken);
};
