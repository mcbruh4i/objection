/**
 * The resolved case: stamp, the judge's FORMAL Persian reasoning, and the
 * fine record. The fine.reason line is an English server constant — shown
 * as-is in the mono court-record face (owner decision).
 */
import React from "react";
import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { Fine, JudgeVerdict } from "../../api/types";
import { AppText } from "../common/AppText";
import { VerdictStamp } from "./VerdictStamp";
import { BruteButton } from "../common/BruteButton";
import { formatMoney } from "../../utils/format";
import { theme } from "../../theme/tokens";

interface Props {
  verdict: JudgeVerdict;
  fine: Fine;
  onExit: () => void;
}

export function VerdictPanel({ verdict, fine, onExit }: Props): React.JSX.Element {
  const { t } = useTranslation();
  const accepted = verdict.verdict === "accepted";

  return (
    <View style={styles.wrap}>
      <VerdictStamp verdict={verdict.verdict} />

      <AppText variant="h1" color="textOnDark" align="center">
        {accepted ? t("court.verdict_accepted_headline") : t("court.verdict_rejected_headline")}
      </AppText>

      <View style={styles.reasonBox}>
        <AppText variant="label" color="textMutedOnDark">
          {t("court.verdict_reason_label")}
        </AppText>
        <AppText variant="body" color="textOnDark">
          {verdict.reasoning}
        </AppText>
      </View>

      <View style={styles.fineBox}>
        <View style={styles.fineRow}>
          <AppText variant="label" color="textMutedOnDark">
            {t("court.fine_label")}
          </AppText>
          {/* Accent (not danger) on the dark canvas — QA: red fails contrast here. */}
          <AppText variant="h2" color={fine.amount_cents > 0 ? "accent" : "textOnDark"}>
            {fine.amount_cents > 0 ? formatMoney(fine.amount_cents) : t("court.fine_zero")}
          </AppText>
        </View>
        {/* English court-record constant, deliberately untranslated. */}
        <AppText variant="mono" color="textMutedOnDark">
          {fine.reason}
        </AppText>
        {fine.amount_cents > 0 ? (
          <AppText variant="caption" color="textMutedOnDark">
            {t("court.fine_recorded_note")}
          </AppText>
        ) : null}
      </View>

      <BruteButton label={t("court.back_to_today")} onPress={onExit} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: theme.spacing.lg,
  },
  reasonBox: {
    borderWidth: theme.borders.bold,
    borderColor: theme.colors.lineOnDark,
    borderRadius: theme.radii.none,
    backgroundColor: theme.colors.surfaceCourt,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  fineBox: {
    borderWidth: theme.borders.bold,
    borderColor: theme.colors.lineOnDark,
    borderRadius: theme.radii.none,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  fineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: theme.spacing.md,
  },
});
