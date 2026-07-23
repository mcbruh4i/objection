/**
 * The skip box under each pending habit — the dramatic trigger that opens a
 * court session.
 *
 * Round-3 spec: wording is cadence-aware (daily «امروز…», weekly «این
 * هفته…», monthly «این ماه…») with 3 rotating variants per cadence, plus 3
 * rotating court-warning hints — picked DETERMINISTICALLY per habit id so a
 * card's wording is stable across renders and reloads (no flicker), while
 * different habits get variety.
 */
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AppText } from "../common/AppText";
import type { HabitCadence } from "../../state/cadenceStore";
import { theme } from "../../theme/tokens";

interface Props {
  habitId: string;
  cadence: HabitCadence;
  onPress: () => void;
}

const VARIANTS = 3;

/** Cheap stable hash of the habit id → variant index (deterministic). */
function stableIndex(seed: string, salt: number): number {
  let hash = salt;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 997;
  }
  return (hash % VARIANTS) + 1; // i18n keys are 1-based
}

export function SkipBox({ habitId, cadence, onPress }: Props): React.JSX.Element {
  const { t } = useTranslation();
  // Different salts de-correlate label and hint picks.
  const label = t(`today.skip_label_${cadence}_${stableIndex(habitId, 7)}`);
  const hint = t(`today.skip_hint_${stableIndex(habitId, 131)}`);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={theme.touch.hitSlop}
      style={styles.box}
    >
      <View style={styles.flag} />
      <AppText variant="label" color="danger">
        {label}
      </AppText>
      <AppText variant="caption" color="textMuted">
        {hint}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    alignSelf: "flex-start",
    borderWidth: theme.borders.bold,
    borderColor: theme.colors.danger,
    borderRadius: theme.radii.none,
    borderStyle: "dashed",
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    minHeight: theme.touch.minTarget - theme.spacing.md,
  },
  flag: {
    width: theme.spacing.sm,
    height: theme.spacing.sm,
    backgroundColor: theme.colors.danger,
    borderRadius: theme.radii.none,
  },
});
