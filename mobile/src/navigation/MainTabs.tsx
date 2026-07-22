/**
 * Bottom tabs of the paper world: Today / Ledger / Settings.
 * Brutalist bar: hard top rule, square active marker, no ripple niceties.
 */
import React from "react";
import { StyleSheet, View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useTranslation } from "react-i18next";
import type { MainTabsParamList } from "./types";
import { TodayScreen } from "../screens/TodayScreen";
import { LedgerScreen } from "../screens/LedgerScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { theme } from "../theme/tokens";

const Tabs = createBottomTabNavigator<MainTabsParamList>();

function TabMarker({ focused }: { focused: boolean }): React.JSX.Element {
  return (
    <View
      style={[
        styles.marker,
        { backgroundColor: focused ? theme.colors.accent : theme.colors.lineSoft },
      ]}
    />
  );
}

export function MainTabs(): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.bar,
        tabBarActiveTintColor: theme.colors.textPrimary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarLabelStyle: theme.type.label,
        tabBarIcon: TabMarker,
      }}
    >
      <Tabs.Screen name="Today" component={TodayScreen} options={{ title: t("tabs.today") }} />
      <Tabs.Screen name="Ledger" component={LedgerScreen} options={{ title: t("tabs.ledger") }} />
      <Tabs.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: t("tabs.settings") }}
      />
    </Tabs.Navigator>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: theme.colors.surface,
    borderTopWidth: theme.borders.heavy,
    borderTopColor: theme.colors.line,
    height: theme.spacing.x4l + theme.spacing.lg,
    paddingTop: theme.spacing.xs,
  },
  marker: {
    width: theme.spacing.lg,
    height: theme.spacing.xs,
    borderRadius: theme.radii.none,
  },
});
