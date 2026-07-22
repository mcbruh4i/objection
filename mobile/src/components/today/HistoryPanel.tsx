/**
 * Past-performance section INSIDE the Today screen (roadmap requirement):
 * day / week / month / year tabs over GET /history aggregates, computed on
 * Jalali boundaries (Saturday-start weeks) with Persian digits.
 *
 * ⚠️ Buckets are UTC days — see utils/jalali.ts for the documented
 * 00:00–03:30 Tehran drift limitation (V1).
 */
import React, { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { HistoryDay } from "../../api/types";
import { AppText } from "../common/AppText";
import { HistoryTabButton } from "./HistoryTabButton";
import { StatBlock } from "./StatBlock";
import { totalsForTab, HistoryTab } from "../../utils/history";
import { formatMoney, toPersianDigits } from "../../utils/format";
import { theme } from "../../theme/tokens";

interface Props {
  days: readonly HistoryDay[];
}

// No yearly tab — the yearly cadence/range was removed by owner decision.
const TABS: readonly HistoryTab[] = ["day", "week", "month"];

export function HistoryPanel({ days }: Props): React.JSX.Element {
  const { t } = useTranslation();
  const [tab, setTab] = useState<HistoryTab>("day");
  const totals = useMemo(() => totalsForTab(days, tab), [days, tab]);
  const empty = totals.daysCounted === 0;

  return (
    <View style={styles.wrap}>
      <View style={styles.tabs}>
        {TABS.map((key) => (
          <HistoryTabButton
            key={key}
            label={t(`today.history_tab_${key}`)}
            active={tab === key}
            onPress={() => setTab(key)}
          />
        ))}
      </View>

      {empty ? (
        <View style={styles.empty}>
          <AppText variant="body" color="textMuted" align="center">
            {t("today.history_empty")}
          </AppText>
        </View>
      ) : (
        <View style={styles.grid}>
          <StatBlock label={t("today.history_total")} value={toPersianDigits(totals.total)} />
          <StatBlock
            label={t("today.history_completed")}
            value={toPersianDigits(totals.completed)}
          />
          <StatBlock label={t("today.history_skipped")} value={toPersianDigits(totals.skipped)} />
          <StatBlock
            label={t("today.history_fines")}
            value={formatMoney(totals.fineCents)}
            emphasize={totals.fineCents > 0}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: theme.spacing.md,
  },
  tabs: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  empty: {
    borderWidth: theme.borders.bold,
    borderColor: theme.colors.lineSoft,
    borderStyle: "dashed",
    borderRadius: theme.radii.none,
    padding: theme.spacing.xl,
  },
});
