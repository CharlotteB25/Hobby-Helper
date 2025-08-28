// src/utils/notificationHandler.tsx
import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import Toast from "react-native-toast-message";
import { getCurrentUser } from "../services/userService";
import { getHobbyById } from "../services/hobbyService";
import { navigationRef } from "../services/navigationService";
import { scheduleRandomNudge } from "../services/notificationService";

// Small helper: normalize any data payload into an object
function parseNotifData(raw: unknown): Record<string, any> {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  // Some platforms put it under dataString as well
  // @ts-ignore
  if (raw?.dataString && typeof raw.dataString === "string") {
    try {
      // @ts-ignore
      return JSON.parse(raw.dataString);
    } catch {
      // fall through
    }
  }
  return (raw as Record<string, any>) || {};
}

export const NotificationHandler = () => {
  // (Optional) gentle dev nudge shortly after app open
  useEffect(() => {
    if (__DEV__) scheduleRandomNudge(30);
  }, []);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(
      async (response) => {
        try {
          const content = response?.notification?.request?.content;
          // Handles data as object, string, or { dataString: "..." }
          const data = parseNotifData(content?.data);
          const type = data?.type;
          const hobbyId = String(data?.hobbyId || "");

          // Debug (comment out if noisy)
          console.log("🔔 Tap payload:", { type, hobbyId, data, content });

          // ── Rating tap ──────────────────────────────────────────────
          if (type === "rating" && hobbyId) {
            try {
              const [hobby, user] = await Promise.all([
                getHobbyById(hobbyId),
                getCurrentUser(),
              ]);
              if (!hobby || !user) throw new Error("Hobby or user not found");

              const go = () =>
                navigationRef.navigate("Rating", {
                  hobby,
                  userId: user._id,
                });

              // Wait for nav tree to be ready
              let retries = 0;
              const interval = setInterval(() => {
                if (navigationRef.isReady()) {
                  clearInterval(interval);
                  go();
                } else if (++retries >= 15) {
                  clearInterval(interval);
                  console.warn("❌ navigationRef not ready after retries.");
                  Toast.show({
                    type: "error",
                    text1: "Navigation not ready",
                    text2: "Please try again.",
                  });
                }
              }, 250);
            } catch (err) {
              console.error("❌ Failed to open Rating:", err);
              Toast.show({
                type: "error",
                text1: "Couldn’t open rating",
                text2: "This hobby couldn’t be loaded.",
              });
            }
            return; // handled
          }

          // ── Nudge tap (example) ────────────────────────────────────
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
              } else if (++retries >= 15) {
                clearInterval(interval);
                console.warn(
                  "❌ navigationRef not ready after retries (nudge)."
                );
              }
            }, 250);
            return;
          }

          // Fallback: unknown tap type
          console.log("ℹ️ Unknown notification tap payload:", data);
        } catch (err) {
          console.error("❌ Notification tap handler error:", err);
        }
      }
    );

    return () => sub.remove();
  }, []);

  return null;
};
