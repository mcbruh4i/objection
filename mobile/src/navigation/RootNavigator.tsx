/**
 * Root stack: the tabbed paper world + the Courtroom full-screen takeover.
 * The courtroom disables the back gesture — leaving is an explicit act
 * (LeaveCourtButton), per the roadmap.
 */
import React from "react";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { RootStackParamList } from "./types";
import { MainTabs } from "./MainTabs";
import { CourtroomScreen } from "../screens/CourtroomScreen";
import { theme } from "../theme/tokens";

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: theme.colors.bg,
    card: theme.colors.surface,
    text: theme.colors.textPrimary,
    border: theme.colors.line,
    primary: theme.colors.accent,
  },
};

export function RootNavigator(): React.JSX.Element {
  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen
          name="Courtroom"
          component={CourtroomScreen}
          options={{
            presentation: "fullScreenModal",
            gestureEnabled: false,
            animation: "none",
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
