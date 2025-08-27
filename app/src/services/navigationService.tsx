// services/navigationService.ts
import { createNavigationContainerRef } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/AppNavigator";

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigate<RouteName extends keyof RootStackParamList>(
  screen: RouteName,
  ...args: undefined extends RootStackParamList[RouteName]
    ? [] | [RootStackParamList[RouteName]]
    : [RootStackParamList[RouteName]]
) {
  if (navigationRef.isReady()) {
    // @ts-expect-error - TypeScript can't infer tuple overloads well
    navigationRef.navigate(screen, ...args);
  }
}
