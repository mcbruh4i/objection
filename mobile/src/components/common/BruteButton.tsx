/**
 * Brutalist button: thick border, hard shadow that collapses on press
 * (the face "stamps down") — instant state change, no eased animation.
 */
import React, { useState } from "react";
import { Pressable, StyleSheet, View, ViewStyle } from "react-native";
import { AppText } from "./AppText";
import { theme, TypeVariantName } from "../../theme/tokens";

type Tone = "accent" | "surface" | "danger" | "court";

interface Props {
  label: string;
  onPress: () => void;
  tone?: Tone;
  disabled?: boolean;
  compact?: boolean;
  textVariant?: TypeVariantName;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

const faceColors: Record<Tone, { bg: keyof typeof theme.colors; text: keyof typeof theme.colors; border: keyof typeof theme.colors }> = {
  accent: { bg: "accent", text: "onAccent", border: "line" },
  surface: { bg: "surface", text: "textPrimary", border: "line" },
  danger: { bg: "danger", text: "onDanger", border: "line" },
  court: { bg: "surfaceCourt", text: "textOnDark", border: "lineOnDark" },
};

export function BruteButton({
  label,
  onPress,
  tone = "accent",
  disabled = false,
  compact = false,
  textVariant = "bodyBold",
  style,
  accessibilityLabel,
}: Props): React.JSX.Element {
  const [pressed, setPressed] = useState(false);
  const palette = faceColors[tone];
  const offset = theme.shadows.offsetSmall;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      hitSlop={theme.touch.hitSlop}
      style={[styles.wrapper, disabled && styles.disabled, style]}
    >
      <View
        style={[
          styles.shadow,
          {
            backgroundColor: theme.colors.shadow,
            top: offset,
            left: -offset,
          },
        ]}
      />
      <View
        style={[
          styles.face,
          {
            backgroundColor: theme.colors[palette.bg],
            borderColor: theme.colors[palette.border],
            paddingVertical: compact ? theme.spacing.sm : theme.spacing.md,
            paddingHorizontal: compact ? theme.spacing.md : theme.spacing.xl,
          },
          // Press = the face drops onto its shadow. Instant, brutal.
          pressed && { transform: [{ translateY: offset }, { translateX: -offset }] },
        ]}
      >
        <AppText variant={textVariant} color={palette.text} align="center">
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
    alignSelf: "stretch",
    minHeight: theme.touch.minTarget,
    justifyContent: "center",
  },
  shadow: {
    position: "absolute",
    right: 0,
    bottom: 0,
    borderRadius: theme.radii.none,
  },
  face: {
    borderWidth: theme.borders.bold,
    borderRadius: theme.radii.none,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: {
    opacity: theme.opacity.disabled,
  },
});
