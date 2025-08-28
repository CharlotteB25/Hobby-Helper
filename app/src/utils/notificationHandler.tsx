// src/utils/notificationHandler.tsx
import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import Toast from "react-native-toast-message";
import { getCurrentUser } from "../services/userService";
import { getHobbyById } from "../services/hobbyService";
import { navigationRef } from "../services/navigationService";
import { scheduleRandomNudge } from "../services/notificationService";

export const NotificationHandler = () => {
  // Schedule a gentle test nudge ~30s after app open
  useEffect(() => {
    // If you only want this in dev, wrap: if (__DEV__) { scheduleRandomNudge(30); }
    scheduleRandomNudge(30);
  }, []);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(
      async (response) => {
        const data: any = response?.notification?.request?.content?.data ?? {};
        const hobbyId = data?.hobbyId;
        const type = data?.type;

        // 1) Tap from rating reminder (your existing flow)
        if (hobbyId && typeof hobbyId === "string") {
          try {
            const [hobby, user] = await Promise.all([
              getHobbyById(hobbyId),
              getCurrentUser(), // may 404 if not logged in
            ]);

            if (!hobby || !user) {
              throw new Error("Hobby or user not found");
            }

            const go = () =>
              navigationRef.navigate("Rating", {
                hobby,
                userId: user._id,
              });

            let retries = 0;
            const interval = setInterval(() => {
              if (navigationRef.isReady()) {
                clearInterval(interval);
                go();
              } else if (++retries >= 10) {
                clearInterval(interval);
                console.warn("❌ NavigationRef not ready after retries.");
              }
            }, 300);
          } catch (err) {
            console.error("❌ Failed to handle notification tap:", err);
            Toast.show({
              type: "error",
              text1: "Oops!",
              text2: "This hobby could not be loaded or no longer exists.",
            });
          }
          return;
        }

        // 2) Tap from gentle nudge → take them to a creative list
        if (type === "nudge") {
          const goCreative = () =>
            navigationRef.navigate("HobbyList", {
              mood: "creative",
              location: "Indoor",
              tryNew: false,
            });

          let retries = 0;
          const interval = setInterval(() => {
            if (navigationRef.isReady()) {
              clearInterval(interval);
              goCreative();
            } else if (++retries >= 10) {
              clearInterval(interval);
              console.warn("❌ NavigationRef not ready after retries (nudge).");
            }
          }, 300);
        }
      }
    );

    return () => sub.remove();
  }, []);

  return null;
};
