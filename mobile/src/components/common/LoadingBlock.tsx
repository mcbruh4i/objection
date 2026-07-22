/**
 * Visible loading state: a stark bordered block with the busy line.
 * Brutalism: no spinners-with-blur; a plain pulse of solid squares.
 */
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { AppText } from "./AppText";
import { theme } from "../../theme/tokens";

interface Props {
  label: string;
  tone?: "paper" | "court";
}

const STEPS = 3;

export function LoadingBlock({ label, tone = "paper" }: Props): React.JSX.Element {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((v) => (v + 1) % (STEPS + 1)), 350);
    return () => clearInterval(timer);
  }, []);

  const isCourt = tone === "court";
  return (
    <View
      style={[
        styles.block,
        {
          backgroundColor: isCourt ? theme.colors.surfaceCourt : theme.colors.surface,
          borderColor: isCourt ? theme.colors.lineOnDark : theme.colors.line,
        },
      ]}
      accessibilityRole="progressbar"
    >
      <View style={styles.squares}>
        {Array.from({ length: STEPS }, (_, i) => (
          <View
            key={i}
            style={[
              styles.square,
              {
                backgroundColor:
                  i < tick
                    ? theme.colors.accent
                    : isCourt
                      ? theme.colors.textMutedOnDark
                      : theme.colors.lineSoft,
              },
            ]}
          />
        ))}
      </View>
      <AppText variant="label" color={isCourt ? "textOnDark" : "textPrimary"} align="center">
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    borderWidth: theme.borders.bold,
    borderRadius: theme.radii.none,
    padding: theme.spacing.lg,
    alignItems: "center",
    gap: theme.spacing.md,
  },
  squares: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  square: {
    width: theme.spacing.lg,
    height: theme.spacing.lg,
    borderRadius: theme.radii.none,
  },
});
