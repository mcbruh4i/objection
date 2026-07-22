/**
 * One tab of the history range switcher. Active tab = solid ink flood.
 * Instant switch — no sliding indicator (brutalism).
 */
import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { AppText } from "../common/AppText";
import { theme } from "../../theme/tokens";

interface Props {
  label: string;
  active: boolean;
  onPress: () => void;
}

export function HistoryTabButton({ label, active, onPress }: Props): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      hitSlop={theme.touch.hitSlop}
      style={[styles.tab, active && styles.active]}
    >
      <AppText variant="label" color={active ? "textOnDark" : "textPrimary"} align="center">
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tab: {
    flex: 1,
    borderWidth: theme.borders.bold,
    borderColor: theme.colors.line,
    borderRadius: theme.radii.none,
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    minHeight: theme.touch.minTarget - theme.spacing.sm,
  },
  active: {
    backgroundColor: theme.colors.textPrimary,
  },
});
