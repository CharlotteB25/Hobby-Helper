import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import Toast from "react-native-toast-message";
import { getCurrentUser } from "../services/userService";
import { getHobbyById } from "../services/hobbyService";
import { navigationRef } from "../services/navigationService";

export const NotificationHandler = () => {
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(
      async (response) => {
        const hobbyId = response.notification.request.content.data?.hobbyId;
        console.log("📨 Tapped hobby ID:", hobbyId);

        if (!hobbyId || typeof hobbyId !== "string") {
          console.warn("❌ Invalid hobby ID in notification");
          return;
        }

        try {
          const [hobby, user] = await Promise.all([
            getHobbyById(hobbyId),
            //404 error probably
            getCurrentUser(),
          ]);

          if (!hobby || !user) {
            throw new Error("Hobby or user not found");
          }

          const navigateToRating = () => {
            navigationRef.navigate("Rating", {
              hobby,
              userId: user._id,
            });
          };

          // Retry until navigation is ready
          let retries = 0;
          const interval = setInterval(() => {
            if (navigationRef.isReady()) {
              clearInterval(interval);
              navigateToRating();
            } else {
              retries++;
              console.warn("⏳ NavigationRef not ready, retrying...");
              if (retries >= 10) {
                clearInterval(interval);
                console.warn("❌ NavigationRef not ready after retries.");
              }
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
      }
    );

    return () => sub.remove();
  }, []);

  return null;
};
