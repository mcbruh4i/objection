/**
 * One ledger entry — its own separate hard-shadow card (matching the habit
 * card style on Today — owner feedback, round 1). The English server-constant
 * reason line renders in the mono court-record face.
 */
import React from "react";
import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { Fine } from "../../api/types";
import { AppText } from "../common/AppText";
import { BruteCard } from "../common/BruteCard";
import { jalaliOfLocalDate } from "../../utils/jalali";
import { formatMoney, toPersianDigits } from "../../utils/format";
import { theme } from "../../theme/tokens";

interface Props {
  fine: Fine;
}

function jalaliDateLabel(iso: string, monthName: (m: number) => string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const j = jalaliOfLocalDate(date);
  return `${toPersianDigits(j.jd)} ${monthName(j.jm)} ${toPersianDigits(j.jy)}`;
}

export function FineRow({ fine }: Props): React.JSX.Element {
  const { t } = useTranslation();
  const zero = fine.amount_cents === 0;
  return (
    <BruteCard>
      <View style={styles.inner}>
        <View style={styles.topRow}>
          <AppText variant="h2" color={zero ? "textMuted" : "danger"}>
            {zero ? t("court.fine_zero") : formatMoney(fine.amount_cents)}
          </AppText>
          <AppText variant="caption" color="textMuted">
            {jalaliDateLabel(fine.created_at, (m) => t(`calendar.month_${m}`))}
          </AppText>
        </View>
        {/* Court record line — English server constant, untranslated. */}
        <AppText variant="mono" color="textMuted">
          {fine.reason}
        </AppText>
        <View style={styles.stampRow}>
          <View style={styles.recordedChip}>
            <AppText variant="caption" color="textPrimary">
              {t("ledger.entry_recorded")}
            </AppText>
          </View>
        </View>
      </View>
    </BruteCard>
  );
}

const styles = StyleSheet.create({
  inner: {
    gap: theme.spacing.sm,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: theme.spacing.md,
    flexWrap: "wrap",
  },
  stampRow: {
    flexDirection: "row",
  },
  recordedChip: {
    borderWidth: theme.borders.rule,
    borderColor: theme.colors.lineSoft,
    borderRadius: theme.radii.none,
    paddingVertical: theme.spacing.xs / 2,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceAlt,
  },
});
