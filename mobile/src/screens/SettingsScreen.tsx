/**
 * SETTINGS — self-contained app settings. No language switch (Persian-only,
 * RTL locked) and NO server URL field: that's a dev-only concern configured
 * via app.json → extra.defaultServerUrl, never user-facing (owner, round 1).
 * Includes an in-app court guide so the app explains itself without a
 * companion website. More sections land with the owner's next feedback.
 */
import React from "react";
import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSettings } from "../state/SettingsContext";
import { ScreenContainer } from "../components/common/ScreenContainer";
import { SectionHeader } from "../components/common/SectionHeader";
import { AppText } from "../components/common/AppText";
import { BruteCard } from "../components/common/BruteCard";
import { ToggleRow } from "../components/settings/ToggleRow";
import { toPersianDigits } from "../utils/format";
import { theme } from "../theme/tokens";

export function SettingsScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const { settings, setUseMock, setReduceMotion } = useSettings();

  const guideSteps = [
    t("settings.guide_step_1"),
    t("settings.guide_step_2"),
    t("settings.guide_step_3"),
  ];

  return (
    <ScreenContainer world="paper">
      <SectionHeader title={t("settings.title")} />

      <View style={styles.section}>
        <AppText variant="label" color="textMuted">
          {t("settings.section_app")}
        </AppText>
        <ToggleRow
          label={t("settings.reduce_motion_label")}
          hint={t("settings.reduce_motion_hint")}
          value={settings.reduceMotion}
          onChange={setReduceMotion}
        />
      </View>

      <View style={styles.section}>
        <AppText variant="label" color="textMuted">
          {t("settings.section_data")}
        </AppText>
        <ToggleRow
          label={t("settings.mock_label")}
          hint={t("settings.mock_hint")}
          value={settings.useMock}
          onChange={setUseMock}
        />
      </View>

      <View style={styles.section}>
        <AppText variant="label" color="textMuted">
          {t("settings.guide_section")}
        </AppText>
        <BruteCard>
          <View style={styles.guideList}>
            {guideSteps.map((step, index) => (
              <View key={index} style={styles.guideRow}>
                <View style={styles.guideNumber}>
                  <AppText variant="label" color="onAccent" align="center">
                    {toPersianDigits(index + 1)}
                  </AppText>
                </View>
                <AppText variant="body" style={styles.guideText}>
                  {step}
                </AppText>
              </View>
            ))}
          </View>
        </BruteCard>
      </View>

      <View style={styles.section}>
        <AppText variant="label" color="textMuted">
          {t("settings.about_section")}
        </AppText>
        <BruteCard>
          <AppText variant="caption" color="textMuted">
            {t("settings.about_v1_note")}
          </AppText>
        </BruteCard>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  guideList: {
    gap: theme.spacing.lg,
  },
  guideRow: {
    flexDirection: "row",
    gap: theme.spacing.md,
    alignItems: "flex-start",
  },
  guideNumber: {
    width: theme.spacing.xxl,
    height: theme.spacing.xxl,
    backgroundColor: theme.colors.accent,
    borderWidth: theme.borders.bold,
    borderColor: theme.colors.line,
    borderRadius: theme.radii.none,
    alignItems: "center",
    justifyContent: "center",
  },
  guideText: {
    flex: 1,
  },
});
