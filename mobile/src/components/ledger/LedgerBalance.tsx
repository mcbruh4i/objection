/**
 * The ledger headline: total owed to the court, stamped big and orange.
 */
import React from "react";
import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AppText } from "../common/AppText";
import { HardShadowBox } from "../common/HardShadowBox";
import { formatMoney } from "../../utils/format";
import { theme } from "../../theme/tokens";

interface Props {
  balanceCents: number;
}

export function LedgerBalance({ balanceCents }: Props): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <HardShadowBox surfaceColor={balanceCents > 0 ? "accent" : "surface"}>
      <View style={styles.inner}>
        <AppText variant="label" color={balanceCents > 0 ? "onAccent" : "textMuted"}>
          {t("ledger.balance_label")}
        </AppText>
        <AppText variant="display" color={balanceCents > 0 ? "onAccent" : "textPrimary"}>
          {formatMoney(balanceCents)}
        </AppText>
      </View>
    </HardShadowBox>
  );
}

const styles = StyleSheet.create({
  inner: {
    padding: theme.spacing.lg,
    gap: theme.spacing.xs,
  },
});
