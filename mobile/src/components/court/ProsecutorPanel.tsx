/**
 * The prosecutor's turn: objection headline (Persian, from the backend LLM),
 * challenge body, and the pointed question. Long RTL strings wrap freely —
 * nothing here may clip (API contract requirement).
 */
import React from "react";
import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { ProsecutorResponse } from "../../api/types";
import { AppText } from "../common/AppText";
import { theme } from "../../theme/tokens";

interface Props {
  prosecutor: ProsecutorResponse;
  repeated: boolean;
}

export function ProsecutorPanel({ prosecutor, repeated }: Props): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <View style={styles.panel}>
      <View style={styles.nameRow}>
        <View style={styles.nameChip}>
          <AppText variant="label" color="onDanger">
            {t("court.prosecutor_label")}
          </AppText>
        </View>
        {repeated ? (
          // Filled chip: bare red text fails contrast on the dark panel (QA).
          <View style={styles.repeatedChip}>
            <AppText variant="label" color="onDanger">
              {t("court.prosecutor_repeated_tag")}
            </AppText>
          </View>
        ) : null}
      </View>

      <AppText variant="h2" color="textOnDark">
        {prosecutor.objection}
      </AppText>
      <AppText variant="body" color="textOnDark">
        {prosecutor.challenge}
      </AppText>
      <View style={styles.questionBox}>
        <AppText variant="bodyBold" color="textOnDark">
          {prosecutor.question}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderWidth: theme.borders.bold,
    borderColor: theme.colors.danger,
    borderRadius: theme.radii.none,
    backgroundColor: theme.colors.surfaceCourt,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  nameChip: {
    backgroundColor: theme.colors.danger,
    borderRadius: theme.radii.none,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
  },
  repeatedChip: {
    backgroundColor: theme.colors.danger,
    borderRadius: theme.radii.none,
    paddingVertical: theme.spacing.xs / 2,
    paddingHorizontal: theme.spacing.sm,
  },
  questionBox: {
    borderStartWidth: theme.borders.heavy,
    borderStartColor: theme.colors.danger,
    paddingStart: theme.spacing.md,
  },
});
