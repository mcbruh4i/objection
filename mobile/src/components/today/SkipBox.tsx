/**
 * The «امروز نمی‌تونم» little box under each pending habit.
 * This is the dramatic trigger: pressing it opens a court session.
 * Colloquial user-voice copy + a warning hint that court follows.
 */
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AppText } from "../common/AppText";
import { theme } from "../../theme/tokens";

interface Props {
  onPress: () => void;
  disabled?: boolean;
}

export function SkipBox({ onPress, disabled = false }: Props): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("today.skip_box_label")}
      onPress={onPress}
      disabled={disabled}
      hitSlop={theme.touch.hitSlop}
      style={[styles.box, disabled && styles.disabled]}
    >
      <View style={styles.flag} />
      <AppText variant="label" color="danger">
        {t("today.skip_box_label")}
      </AppText>
      <AppText variant="caption" color="textMuted">
        {t("today.skip_box_hint")}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: "row",
    alignItems: "center",
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
  disabled: {
    opacity: theme.opacity.disabled,
  },
});
