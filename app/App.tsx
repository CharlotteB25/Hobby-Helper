// App.tsx
import React, { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "./src/context/AuthContext";
import AppNavigator from "./src/navigation/AppNavigator";
import "react-native-gesture-handler";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as Notifications from "expo-notifications";
import { Alert, Platform, View, ActivityIndicator } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import BootSplash from "./src/screens/components/BootSplash"; // ← use this
import Toast from "react-native-toast-message";
import { NotificationHandler } from "./src/utils/notificationHandler";
import { NavigationContainer } from "@react-navigation/native";
import { navigationRef } from "./src/services/navigationService";
import { decode as atob, encode as btoa } from "base-64";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const setupNotificationChannel = async () => {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.HIGH,
      sound: "default",
    });
  }
};

if (typeof global.atob === "undefined") global.atob = atob;
if (typeof global.btoa === "undefined") global.btoa = btoa;

export default function App() {
  const [bootLoading, setBootLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        await Notifications.cancelAllScheduledNotificationsAsync();
        await setupNotificationChannel();

        const { status } = await Notifications.getPermissionsAsync();
        if (status !== "granted") {
          const { status: newStatus } =
            await Notifications.requestPermissionsAsync();
          if (newStatus !== "granted") {
            Alert.alert(
              "Notifications Disabled",
              "You won't receive reminders unless notifications are enabled."
            );
          }
        }

        Notifications.addNotificationReceivedListener((n) => {
          console.log("📩 Foreground notification:", n);
        });
      } catch (err) {
        console.warn("Notification setup error:", err);
      } finally {
        setBootLoading(false);
      }
    })();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <SafeAreaProvider>
          <NavigationContainer ref={navigationRef}>
            <NotificationHandler />{" "}
            {/* keep this only here; remove from AppNavigator */}
            {bootLoading ? <BootSplash /> : <AppNavigator />}
          </NavigationContainer>
          <StatusBar style="auto" />
          <Toast />
        </SafeAreaProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
