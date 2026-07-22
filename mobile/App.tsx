/**
 * App root: font loading gate → settings hydration → providers → navigation.
 * (RTL + i18n are locked in index.ts before this component ever mounts.)
 */
import React from "react";
import { StyleSheet, View } from "react-native";
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { FONT_ASSETS } from "./src/theme/fonts";
import { theme } from "./src/theme/tokens";
import { SettingsProvider, useSettings } from "./src/state/SettingsContext";
import { ApiProvider } from "./src/state/ApiContext";
import { RootNavigator } from "./src/navigation/RootNavigator";

function Gate(): React.JSX.Element {
  const { hydrated } = useSettings();
  if (!hydrated) {
    return <View style={styles.splash} />;
  }
  return (
    <ApiProvider>
      <RootNavigator />
    </ApiProvider>
  );
}

export default function App(): React.JSX.Element {
  const [fontsLoaded] = useFonts(FONT_ASSETS);

  if (!fontsLoaded) {
    // Persian must never render in a fallback font — hold a blank canvas
    // (Phase 0 DoD: the placeholder Persian font renders correctly).
    return <View style={styles.splash} />;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <SettingsProvider>
        <Gate />
      </SettingsProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
});
