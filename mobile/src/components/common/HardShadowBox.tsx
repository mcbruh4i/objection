/**
 * Brutalist hard shadow: a solid offset backing block, ZERO blur.
 * Implemented with a nested backing View so it renders identically on
 * Android, iOS and web (native shadow APIs blur or drop the offset).
 */
import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { theme } from "../../theme/tokens";

interface Props {
  children: React.ReactNode;
  /** Shadow offset token. */
  size?: "regular" | "small";
  /** Background of the face layer. */
  surfaceColor?: keyof typeof theme.colors;
  borderColor?: keyof typeof theme.colors;
  shadowColor?: keyof typeof theme.colors;
  style?: ViewStyle;
}

export function HardShadowBox({
  children,
  size = "regular",
  surfaceColor = "surface",
  borderColor = "line",
  shadowColor = "shadow",
  style,
}: Props): React.JSX.Element {
  const offset = size === "regular" ? theme.shadows.offset : theme.shadows.offsetSmall;
  return (
    <View style={[styles.wrapper, { paddingBottom: offset }, style]}>
      <View
        style={[
          styles.shadowLayer,
          {
            backgroundColor: theme.colors[shadowColor],
            top: offset,
            // RTL-first: the shadow falls toward the visual bottom-left,
            // mirroring the paper stack direction of an RTL page.
            left: -offset,
          },
        ]}
      />
      <View
        style={[
          styles.face,
          {
            backgroundColor: theme.colors[surfaceColor],
            borderColor: theme.colors[borderColor],
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
  },
  shadowLayer: {
    position: "absolute",
    right: 0,
    bottom: 0,
    borderRadius: theme.radii.none,
  },
  face: {
    borderWidth: theme.borders.bold,
    borderRadius: theme.radii.none,
  },
});
