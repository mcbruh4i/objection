/**
 * The verdict stamp: GUILTY (rejected, red ink) / DISMISSED (accepted, dark
 * ink). English brand shouts by design (roadmap) — Space Grotesk, rotated,
 * double-ruled like an ink stamp slammed on the case file.
 *
 * `compact` renders the same stamp at card scale — reused as the seal
 * overlay on judged habit cards (owner decision, round 2) so the courtroom
 * and the tracker share one stamp language.
 * (Phase 2 adds the slam animation; V1 renders the final state.)
 */
import React from "react";
import { StyleSheet, View } from "react-native";
import type { VerdictKind } from "../../api/types";
import { AppText } from "../common/AppText";
import { BRAND_SHOUTS } from "../../i18n/brand";
import { theme } from "../../theme/tokens";

interface Props {
  verdict: VerdictKind;
  /** Card-scale seal (judged habit cards) vs full courtroom stamp. */
  compact?: boolean;
}

export function VerdictStamp({ verdict, compact = false }: Props): React.JSX.Element {
  const guilty = verdict === "rejected";
  const inkColor = guilty ? theme.colors.danger : theme.colors.textPrimary;
  return (
    <View style={compact ? styles.centerCompact : styles.center}>
      {/* Paper slip plate: keeps the red GUILTY ink WCAG-legible on any
          canvas (see colors.stampPlate). */}
      <View
        style={[
          styles.stamp,
          compact ? styles.stampCompact : null,
          { borderColor: inkColor },
        ]}
      >
        <View style={[styles.innerRule, compact ? styles.innerRuleCompact : null, { borderColor: inkColor }]}>
          <AppText
            variant={compact ? "stampSmall" : "stamp"}
            color={guilty ? "danger" : "textPrimary"}
            align="center"
          >
            {guilty ? BRAND_SHOUTS.guilty : BRAND_SHOUTS.dismissed}
          </AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
    paddingVertical: theme.spacing.md,
  },
  centerCompact: {
    alignItems: "center",
  },
  stamp: {
    backgroundColor: theme.colors.stampPlate,
    borderWidth: theme.borders.heavy,
    borderRadius: theme.radii.none,
    padding: theme.spacing.xs,
    transform: [{ rotate: "-6deg" }],
  },
  stampCompact: {
    borderWidth: theme.borders.bold,
    padding: theme.spacing.xs / 2,
    transform: [{ rotate: "-8deg" }],
  },
  innerRule: {
    borderWidth: theme.borders.rule,
    borderRadius: theme.radii.none,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xl,
  },
  innerRuleCompact: {
    paddingVertical: theme.spacing.xs / 2,
    paddingHorizontal: theme.spacing.sm,
  },
});
