/**
 * The verdict stamp: GUILTY (rejected, red ink) / DISMISSED (accepted, dark
 * ink). English brand shouts by design (roadmap) — Space Grotesk, rotated,
 * double-ruled like an ink stamp slammed on the case file.
 *
 * Two modes (owner spec, round 3):
 * - "full": the courtroom stamp — keeps its cream paper plate.
 * - "seal": the Today-card seal — PURE INK, fully transparent except the
 *   text and its double-rule border; stretches to the width its parent
 *   gives it (≈ card width) and keeps the diagonal tilt. Card content stays
 *   visible through it.
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
  mode?: "full" | "seal";
}

export function VerdictStamp({ verdict, mode = "full" }: Props): React.JSX.Element {
  const guilty = verdict === "rejected";
  const inkColor = guilty ? theme.colors.danger : theme.colors.textPrimary;
  const shout = guilty ? BRAND_SHOUTS.guilty : BRAND_SHOUTS.dismissed;
  const inkRole = guilty ? ("danger" as const) : ("textPrimary" as const);

  if (mode === "seal") {
    return (
      // No plate, no fill — ink only. Parent controls the width.
      <View style={[styles.sealBox, { borderColor: inkColor }]}>
        <View style={[styles.sealInner, { borderColor: inkColor }]}>
          <AppText variant="stamp" color={inkRole} align="center">
            {shout}
          </AppText>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.center}>
      {/* Paper slip plate: keeps the red GUILTY ink WCAG-legible on the
          dark court canvas (see colors.stampPlate). */}
      <View style={[styles.stamp, { borderColor: inkColor }]}>
        <View style={[styles.innerRule, { borderColor: inkColor }]}>
          <AppText variant="stamp" color={inkRole} align="center">
            {shout}
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
  stamp: {
    backgroundColor: theme.colors.stampPlate,
    borderWidth: theme.borders.heavy,
    borderRadius: theme.radii.none,
    padding: theme.spacing.xs,
    transform: [{ rotate: "-6deg" }],
  },
  innerRule: {
    borderWidth: theme.borders.rule,
    borderRadius: theme.radii.none,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xl,
  },
  // Seal mode: transparent, stretched, same tilt family as the courtroom.
  sealBox: {
    alignSelf: "stretch",
    borderWidth: theme.borders.heavy,
    borderRadius: theme.radii.none,
    padding: theme.spacing.xs,
    transform: [{ rotate: "-8deg" }],
  },
  sealInner: {
    borderWidth: theme.borders.rule,
    borderRadius: theme.radii.none,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    alignItems: "center",
  },
});
