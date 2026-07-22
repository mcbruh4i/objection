/**
 * The ONLY exit from the courtroom (tab bar is hidden there — roadmap).
 * Small, explicit, always reachable at the top of the takeover.
 */
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AppText } from "../common/AppText";
import { theme } from "../../theme/tokens";

interface Props {
  onPress: () => void;
}

export function LeaveCourtButton({ onPress }: Props): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("court.leave_court")}
      onPress={onPress}
      hitSlop={theme.touch.hitSlop}
      style={styles.button}
    >
      <View style={styles.glyph} />
      <AppText variant="label" color="textOnDark">
        {t("court.leave_court")}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    alignSelf: "flex-start",
    borderWidth: theme.borders.bold,
    borderColor: theme.colors.lineOnDark,
    borderRadius: theme.radii.none,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    minHeight: theme.touch.minTarget - theme.spacing.md,
  },
  glyph: {
    width: theme.spacing.sm,
    height: theme.spacing.sm,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radii.none,
  },
});
