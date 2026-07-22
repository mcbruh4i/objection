/**
 * Renders a MediaSlot. Lives in src/media/ ON PURPOSE: when final media
 * arrives, both the slot mapping (courtMedia.ts) and this renderer change —
 * and nothing outside src/media/ does.
 *
 * V1 placeholders are token-styled only: solid silhouettes + typographic
 * cards. No decorative overlay lines on characters (roadmap rule).
 */
import React from "react";
import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { MediaSlot } from "./courtMedia";
import { AppText } from "../components/common/AppText";
import { theme } from "../theme/tokens";

interface Props {
  slot: MediaSlot;
  /** Stage slots are tall; banner slots are compact. */
  layout: "stage" | "banner";
}

export function MediaSlotView({ slot, layout }: Props): React.JSX.Element {
  const { t } = useTranslation();
  const content = slot.content;

  if (content.kind === "typographic") {
    return (
      <View style={[styles.typographic, layout === "stage" && styles.stageHeight]}>
        <AppText variant="shout" color="onAccent" align="center">
          {content.shout}
        </AppText>
        {content.captionKey ? (
          <AppText variant="caption" color="onAccent" align="center">
            {t(content.captionKey)}
          </AppText>
        ) : null}
      </View>
    );
  }

  // Solid silhouette placeholder: a stark block on the dark court canvas.
  const silhouetteShape =
    content.character === "judge"
      ? styles.judgeShape
      : content.character === "prosecutor"
        ? styles.prosecutorShape
        : styles.stageShape;

  return (
    <View style={[styles.silhouette, layout === "stage" ? styles.stageHeight : styles.bannerHeight]}>
      <View style={silhouetteShape} />
      <AppText variant="label" color="textMutedOnDark" align="center">
        {t(content.captionKey)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  typographic: {
    backgroundColor: theme.colors.accent,
    borderWidth: theme.borders.heavy,
    borderColor: theme.colors.lineOnDark,
    borderRadius: theme.radii.none,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
  },
  silhouette: {
    backgroundColor: theme.colors.surfaceCourt,
    borderWidth: theme.borders.bold,
    borderColor: theme.colors.lineOnDark,
    borderRadius: theme.radii.none,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.xl,
  },
  stageHeight: {
    minHeight: 180,
  },
  bannerHeight: {
    minHeight: 72,
  },
  judgeShape: {
    width: 96,
    height: 72,
    backgroundColor: theme.colors.textMutedOnDark,
    borderRadius: theme.radii.none,
  },
  prosecutorShape: {
    width: 64,
    height: 96,
    backgroundColor: theme.colors.textMutedOnDark,
    borderRadius: theme.radii.none,
  },
  stageShape: {
    width: 120,
    height: 56,
    backgroundColor: theme.colors.textMutedOnDark,
    borderRadius: theme.radii.none,
  },
});
