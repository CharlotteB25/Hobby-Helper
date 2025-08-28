// services/navigationService.ts
import { createNavigationContainerRef } from "@react-navigation/native";
// 👇 type-only import to avoid runtime circular deps
import type { RootStackParamList } from "../navigation/AppNavigator";

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/**
 * Typed navigate helper that works with routes that have params or `undefined`.
 * Use this anywhere you can’t use the `useNavigation` hook (e.g. menu sheets).
 */
export function navigate<RouteName extends keyof RootStackParamList>(
  screen: RouteName,
  ...args: undefined extends RootStackParamList[RouteName]
    ? [] | [RootStackParamList[RouteName]]
    : [RootStackParamList[RouteName]]
) {
  if (navigationRef.isReady()) {
    // TS struggles to infer tuple overloads here; this cast is safe for our usage.
    (navigationRef.navigate as any)(screen, ...args);
  }
}
