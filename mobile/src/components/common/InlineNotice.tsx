/**
 * Inline notice strip for errors/conflicts — calm Persian copy, hard border.
 * Optional retry action. Never a toast that vanishes mid-read.
 */
import React from "react";
import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AppText } from "./AppText";
import { BruteButton } from "./BruteButton";
import { theme } from "../../theme/tokens";

interface Props {
  message: string;
  tone?: "danger" | "info";
  onRetry?: (() => void) | undefined;
}

export function InlineNotice({ message, tone = "danger", onRetry }: Props): React.JSX.Element {
  const { t } = useTranslation();
  const isDanger = tone === "danger";
  return (
    <View
      style={[
        styles.strip,
        {
          borderColor: theme.colors.line,
          backgroundColor: isDanger ? theme.colors.danger : theme.colors.surfaceAlt,
        },
      ]}
    >
      <AppText variant="bodyBold" color={isDanger ? "onDanger" : "textPrimary"} style={styles.grow}>
        {message}
      </AppText>
      {onRetry ? (
        <BruteButton
          label={t("common.retry")}
          onPress={onRetry}
          tone="surface"
          compact
          textVariant="label"
          style={styles.retry}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    borderWidth: theme.borders.bold,
    borderRadius: theme.radii.none,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  grow: {
    flexShrink: 1,
  },
  retry: {
    alignSelf: "flex-start",
  },
});
