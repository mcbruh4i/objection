/**
 * One stat cell of the history panel: big number over a hard-ruled label.
 */
import React from "react";
import { StyleSheet, View } from "react-native";
import { AppText } from "../common/AppText";
import { theme } from "../../theme/tokens";

interface Props {
  label: string;
  value: string;
  emphasize?: boolean;
}

export function StatBlock({ label, value, emphasize = false }: Props): React.JSX.Element {
  return (
    <View style={[styles.cell, emphasize && styles.emphasized]}>
      <AppText variant="h1" color={emphasize ? "onAccent" : "textPrimary"} align="center">
        {value}
      </AppText>
      <AppText variant="caption" color={emphasize ? "onAccent" : "textMuted"} align="center">
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  cell: {
    flex: 1,
    minWidth: "40%",
    borderWidth: theme.borders.bold,
    borderColor: theme.colors.line,
    borderRadius: theme.radii.none,
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  emphasized: {
    backgroundColor: theme.colors.accent,
  },
});
