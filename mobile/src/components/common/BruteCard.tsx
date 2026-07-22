/**
 * Standard bordered card of the paper world: white surface, hard border,
 * hard offset shadow, sharp corners, token padding.
 */
import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { HardShadowBox } from "./HardShadowBox";
import { theme } from "../../theme/tokens";

interface Props {
  children: React.ReactNode;
  surfaceColor?: keyof typeof theme.colors;
  padded?: boolean;
  style?: ViewStyle;
}

export function BruteCard({
  children,
  surfaceColor = "surface",
  padded = true,
  style,
}: Props): React.JSX.Element {
  return (
    <HardShadowBox surfaceColor={surfaceColor} style={style}>
      <View style={padded ? styles.padded : null}>{children}</View>
    </HardShadowBox>
  );
}

const styles = StyleSheet.create({
  padded: {
    padding: theme.spacing.lg,
  },
});
