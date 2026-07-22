/**
 * LEDGER — the fines record of the paper world.
 */
import React, { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import type { LedgerResponse } from "../api/types";
import { useApi } from "../state/ApiContext";
import { ScreenContainer } from "../components/common/ScreenContainer";
import { SectionHeader } from "../components/common/SectionHeader";
import { InlineNotice } from "../components/common/InlineNotice";
import { LoadingBlock } from "../components/common/LoadingBlock";
import { AppText } from "../components/common/AppText";
import { LedgerBalance } from "../components/ledger/LedgerBalance";
import { FineRow } from "../components/ledger/FineRow";
import { apiErrorMessage } from "../utils/apiErrorMessage";
import { theme } from "../theme/tokens";

export function LedgerScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const api = useApi();
  const [ledger, setLedger] = useState<LedgerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setError(null);
    try {
      setLedger(await api.getLedger());
    } catch (err) {
      setError(apiErrorMessage(err, t));
    } finally {
      setLoading(false);
    }
  }, [api, t]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <ScreenContainer world="paper">
      <SectionHeader title={t("ledger.title")} />

      {loading ? (
        <LoadingBlock label={t("common.loading")} />
      ) : error ? (
        <InlineNotice message={error} onRetry={() => void load()} />
      ) : ledger ? (
        <>
          <LedgerBalance balanceCents={ledger.balance_cents} />
          {ledger.entries.length === 0 ? (
            <AppText variant="body" color="textMuted">
              {t("ledger.empty")}
            </AppText>
          ) : (
            <View style={styles.list}>
              {ledger.entries.map((fine) => (
                <FineRow key={fine.id} fine={fine} />
              ))}
            </View>
          )}
        </>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: {
    // Same rhythm as the Today habit list — separate shadowed cards.
    gap: theme.spacing.lg,
  },
});
