import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// ⚙️ Configure how notifications behave when the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ✅ Android-only: Ensure notification channel exists
const setupAndroidChannel = async () => {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.HIGH,
      sound: "default", // Must be a string
    });
  }
};

// 🔐 Request and check permissions
export const requestNotificationPermissions = async (): Promise<boolean> => {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") {
    const { status: newStatus } = await Notifications.requestPermissionsAsync();
    return newStatus === "granted";
  }
  return true;
};

// 🔔 Schedule a reminder after X seconds (e.g., 7200 for 2 hours)
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

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "How was your hobby?",
      body: "Please rate your experience with the hobby.",
      data: { hobbyId: String(hobbyId) },
      sound: "default",
    },
    trigger: {
      seconds: delayInSeconds,
      repeats: false,
      channelId: "default", // ✅ required for Android
    },
  });
};
