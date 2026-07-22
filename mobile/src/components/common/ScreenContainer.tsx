/**
 * Screen scaffold: safe area + scroll + the world's canvas color.
 * Content width is capped near the 390px design target so the Expo-web
 * dev view and Android phones share one layout.
 */
import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "../../theme/tokens";

interface Props {
  children: React.ReactNode;
  world?: "paper" | "court";
  scroll?: boolean;
}

const CONTENT_MAX_WIDTH = 430; // fits the 390px target with token gutters

export function ScreenContainer({ children, world = "paper", scroll = true }: Props): React.JSX.Element {
  const bg = world === "court" ? theme.colors.bgCourt : theme.colors.bg;
  const body = <View style={styles.content}>{children}</View>;
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: bg }]} edges={["top", "bottom"]}>
      {scroll ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {body}
        </ScrollView>
      ) : (
        body
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    width: "100%",
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.x3l,
    gap: theme.spacing.lg,
  },
});
