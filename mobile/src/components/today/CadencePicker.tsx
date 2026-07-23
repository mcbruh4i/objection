/**
 * Cadence FILTER TABS: daily / weekly / monthly (owner spec, round 3 — the
 * control filters the habit list AND decides what cadence the add-input
 * creates). NO yearly option exists (owner decision). Active tab = solid ink
 * flood, instant switch — same brutalist pattern as the history tabs.
 */
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AppText } from "../common/AppText";
import { CADENCES, HabitCadence } from "../../state/cadenceStore";
import { theme } from "../../theme/tokens";

interface Props {
  value: HabitCadence;
  onChange: (cadence: HabitCadence) => void;
  disabled?: boolean;
}

export function CadencePicker({ value, onChange, disabled = false }: Props): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <View style={styles.row}>
      {CADENCES.map((cadence) => {
        const active = cadence === value;
        return (
          <Pressable
            key={cadence}
            accessibilityRole="tab"
            accessibilityState={{ selected: active, disabled }}
            onPress={() => onChange(cadence)}
            disabled={disabled}
            hitSlop={theme.touch.hitSlop}
            style={[styles.segment, active && styles.active, disabled && styles.disabled]}
          >
            <AppText variant="label" color={active ? "textOnDark" : "textPrimary"} align="center">
              {t(`today.cadence_${cadence}`)}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  segment: {
    flex: 1,
    borderWidth: theme.borders.bold,
    borderColor: theme.colors.line,
    borderRadius: theme.radii.none,
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  active: {
    backgroundColor: theme.colors.textPrimary,
  },
  disabled: {
    opacity: theme.opacity.disabled,
  },
});
