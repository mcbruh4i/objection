/**
 * Section header: heavy title with a thick underline bar — visible grid,
 * brutalist hierarchy.
 */
import React from "react";
import { StyleSheet, View } from "react-native";
import { AppText } from "./AppText";
import { theme } from "../../theme/tokens";

interface Props {
  title: string;
  onDark?: boolean;
}

export function SectionHeader({ title, onDark = false }: Props): React.JSX.Element {
  return (
    <View style={styles.wrap}>
      <AppText variant="h1" color={onDark ? "textOnDark" : "textPrimary"}>
        {title}
      </AppText>
      <View
        style={[
          styles.bar,
          { backgroundColor: onDark ? theme.colors.accent : theme.colors.line },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: theme.spacing.xs,
  },
  bar: {
    height: theme.spacing.xs,
    width: theme.spacing.x4l,
    borderRadius: theme.radii.none,
  },
});
