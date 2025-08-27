// src/navigation/OnboardingNavigator.tsx
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import OnboardingNameScreen from "../screens/onboarding/OnboardingNameScreen";
import OnboardingEmailScreen from "../screens/onboarding/OnboardingEmailScreen";
import OnboardingPasswordScreen from "../screens/onboarding/OnboardingPasswordScreen";
import OnboardingTagsScreen from "../screens/onboarding/OnboardingTagsScreen";

export type OnboardingStackParamList = {
  OnboardingName: undefined;
  OnboardingEmail: { name: string };
  OnboardingPassword: { name: string; email: string };
  OnboardingTags: { name: string; email: string };
};

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export default function OnboardingNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="OnboardingName" component={OnboardingNameScreen} />
      <Stack.Screen name="OnboardingEmail" component={OnboardingEmailScreen} />
      <Stack.Screen
        name="OnboardingPassword"
        component={OnboardingPasswordScreen}
        options={{ headerShown: false }}
      />

      <Stack.Screen name="OnboardingTags" component={OnboardingTagsScreen} />
    </Stack.Navigator>
  );
}
// This navigator handles the onboarding flow, including name, email, and tags selection.
// It uses a stack navigator to manage the screens in the onboarding process.
