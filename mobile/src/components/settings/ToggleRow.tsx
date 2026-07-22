/**
 * Settings toggle: its own separate hard-shadow box (matching the habit
 * card style on Today — owner feedback, round 1), with a brutalist square
 * switch: solid flood when ON, instant flip, no sliding-thumb animation.
 */
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "../common/AppText";
import { HardShadowBox } from "../common/HardShadowBox";
import { theme } from "../../theme/tokens";

interface Props {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

export function ToggleRow({ label, hint, value, onChange }: Props): React.JSX.Element {
  return (
    <HardShadowBox>
      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: value }}
        accessibilityLabel={label}
        onPress={() => onChange(!value)}
        style={styles.row}
      >
        <View style={styles.texts}>
          <AppText variant="bodyBold">{label}</AppText>
          {hint ? (
            <AppText variant="caption" color="textMuted">
              {hint}
            </AppText>
          ) : null}
        </View>
        <View style={[styles.switchTrack, value && styles.trackOn]}>
          <View style={[styles.knob, value && styles.knobOn]} />
        </View>
      </Pressable>
    </HardShadowBox>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.lg,
    padding: theme.spacing.lg,
    minHeight: theme.touch.minTarget,
  },
  texts: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  switchTrack: {
    width: theme.spacing.x4l,
    height: theme.spacing.xxl,
    borderWidth: theme.borders.bold,
    borderColor: theme.colors.line,
    borderRadius: theme.radii.none,
    backgroundColor: theme.colors.surfaceAlt,
    justifyContent: "center",
    // RTL-first: OFF knob rests at the inline start.
    alignItems: "flex-start",
    padding: theme.spacing.xs / 2,
  },
  trackOn: {
    backgroundColor: theme.colors.accent,
    alignItems: "flex-end",
  },
  knob: {
    width: theme.spacing.lg,
    height: theme.spacing.lg,
    backgroundColor: theme.colors.textPrimary,
    borderRadius: theme.radii.none,
  },
  knobOn: {
    backgroundColor: theme.colors.surface,
  },
});
