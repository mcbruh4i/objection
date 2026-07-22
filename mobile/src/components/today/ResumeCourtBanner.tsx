/**
 * Shown when /today carries an open court session: the day is legally
 * blocked until the case is heard. Orange flood, impossible to miss.
 */
import React from "react";
import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AppText } from "../common/AppText";
import { BruteButton } from "../common/BruteButton";
import { HardShadowBox } from "../common/HardShadowBox";
import { theme } from "../../theme/tokens";

interface Props {
  habitTitle: string;
  onResume: () => void;
}

export function ResumeCourtBanner({ habitTitle, onResume }: Props): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <HardShadowBox surfaceColor="accent">
      <View style={styles.inner}>
        <AppText variant="h1" color="onAccent">
          {t("today.resume_court_title")}
        </AppText>
        <AppText variant="body" color="onAccent">
          {t("today.resume_court_body", { habit: habitTitle })}
        </AppText>
        <BruteButton
          label={t("today.resume_court_cta")}
          onPress={onResume}
          tone="court"
          style={styles.cta}
        />
      </View>
    </HardShadowBox>
  );
}

const styles = StyleSheet.create({
  inner: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  cta: {
    marginTop: theme.spacing.xs,
  },
});
