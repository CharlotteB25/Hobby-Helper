import React from "react";
import SplashLoadingWrapper from "./SplashLoadingWrapper";
import HobbyList from "../HobbyListScreen";

// Example: centralize your first-load work here.
// Put API calls, asset preloads, and any caching (react-query, etc).
async function preloadHobbyList(params: {
  mood: string;
  location: "Indoor" | "Outdoor";
  tryNew: boolean;
}) {
  // 1) Warm up your API (example)
  // await api.prefetchHobbies(params);
  // 2) Preload any images used by HobbyList cards
  // await Asset.loadAsync([require("../../../assets/hobby1.png")]);
  // 3) Small delay keeps the splash from flashing (optional)
  // await new Promise(r => setTimeout(r, 150));
}

export default function HobbyListWrapper(props: any) {
  const params = props.route?.params ?? {};
  return (
    <SplashLoadingWrapper loadFunction={() => preloadHobbyList(params)}>
      <HobbyList {...props} />
    </SplashLoadingWrapper>
  );
}
