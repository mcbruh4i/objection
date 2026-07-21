import { useMemo } from "react";
import { useWindowDimensions } from "react-native";

/**
 * Objection! design system — two layers, one file.
 *
 * Layer 1 · Tracker (calm, daily use): parchment canvas, courtroom-navy ink,
 * Space Grotesk type. Judicial gold is reserved for streaks and achievements.
 * Layer 2 · Courtroom (dramatic): courtroom-navy canvas, bench-navy panels,
 * Anton all-caps display, prosecutor red vs defense blue, high contrast.
 *
 * UI code consumes the semantic maps (`tracker`, `court`), so a palette
 * change stays local to this file. `colors` is the legacy map kept so
 * not-yet-restyled screens keep compiling during the screen-by-screen pass.
 */
export const palette = {
  parchment: "#F3ECD9",
  courtroomNavy: "#16213C",
  benchNavy: "#24345A",
  judicialGold: "#C9A227",
  gallerySlate: "#93A0BB",
  railNavy: "#3B4C74",
  prosecutorRed: "#E05141",
  defenseBlue: "#5B8DEF",
} as const;

/** Tints derived from the registered palette — no new hues. */
const tints = {
  parchmentRaised: "#FBF6E8",
  navyWhisper: "rgba(22, 33, 60, 0.06)",
  navyTrack: "rgba(22, 33, 60, 0.12)",
  navyLine: "rgba(22, 33, 60, 0.18)",
  navySoft: "rgba(22, 33, 60, 0.62)",
  goldSoft: "rgba(201, 162, 39, 0.18)",
  parchmentVeil: "rgba(243, 236, 217, 0.08)",
} as const;

export const fonts = {
  body: "SpaceGrotesk_400Regular",
  bodyMedium: "SpaceGrotesk_500Medium",
  bodyStrong: "SpaceGrotesk_700Bold",
  display: "Anton_400Regular",
} as const;

/** Layer 1 — the calm tracker. Gold appears only on streaks/achievements. */
export const tracker = {
  background: palette.parchment,
  card: tints.parchmentRaised,
  sunken: tints.navyWhisper,
  line: tints.navyLine,
  text: palette.courtroomNavy,
  textMuted: tints.navySoft,
  primary: palette.courtroomNavy,
  onPrimary: palette.parchment,
  accent: palette.judicialGold,
  accentSoft: tints.goldSoft,
  gaugeTrack: tints.navyTrack,
  danger: "#B23A2E",
} as const;

/** Layer 2 — the dramatic courtroom. */
export const court = {
  background: palette.courtroomNavy,
  panel: palette.benchNavy,
  line: palette.railNavy,
  text: palette.parchment,
  textMuted: palette.gallerySlate,
  gold: palette.judicialGold,
  prosecutor: palette.prosecutorRed,
  defense: palette.defenseBlue,
  veil: tints.parchmentVeil,
} as const;

/**
 * Legacy semantic map. Values point at the tracker layer so screens that
 * have not been restyled yet stay calm and readable; each screen is being
 * repointed to `tracker`/`court` explicitly as the redesign lands.
 */
export const colors = {
  background: tracker.background,
  card: tracker.card,
  elevated: tracker.card,
  navBar: tracker.card,
  trim: palette.railNavy,
  borderSubtle: tracker.line,
  primary: tracker.primary,
  primaryPressed: palette.benchNavy,
  gaugeTrack: tracker.gaugeTrack,
  gaugeFill: palette.courtroomNavy,
  gaugeFillEnd: palette.benchNavy,
  text: tracker.text,
  textMuted: tracker.textMuted,
  input: tracker.card,
  success: palette.judicialGold,
  objection: palette.prosecutorRed,
  fine: palette.prosecutorRed,
  rejected: palette.prosecutorRed,
  flash: palette.parchment,
} as const;

const raw = {
  baseWidth: 24,
  minUnit: 14,
  maxUnit: 22,
  compactBreakpoint: 520,
  tabletBreakpoint: 760,
  desktopMaxWidth: 940,
  videoWidthRatio: 0.92,
  videoAspectRatio: 480 / 636,
  gaugeUnits: 11,
  gaugeStrokeRatio: 0.12,
  checkStrokeRatio: 0.18,
  heatmapColumns: 7,
  heatmapRows: 5,
  heatmapCellGapPercent: 6,
  heatmapIntensityOne: 1,
  heatmapIntensityTwo: 2,
  heatmapIntensityThree: 3,
  heatmapDemoPattern: [0, 1, 2, 1, 0, 2, 1] as const,
  percentBase: 100,
  dialogueBlipStride: 2,
  maxSubmissionLength: 600,
  maxHabits: 20,
  maxHabitTitleLength: 80,
  full: "100%" as const,
  almostFull: "92%" as const,
  tabWidth: "50%" as const,
  zero: 0,
  flexOne: 1,
  borderThin: 1,
  borderStrong: 2,
  transparent: 0,
  opaque: 1,
  subdued: 0.66,
  pressed: 0.82,
  inactive: 0.48,
  titleLongPressMs: 750,
  gaugeDurationMs: 700,
  typewriterMsPerCharacter: 28,
  typewriterStartDelayMs: 140,
  courtAutoAdvanceMs: 1200,
  preShoutSilenceMs: 300,
  videoProgressUpdateMs: 32,
  benchImpactMs: 210,
  pointImpactMs: 260,
  flashFramesMs: 66,
  splashDurationMs: 460,
  stampDurationMs: 540,
  sceneTransitionMs: 160,
  objectionStartScale: 4.4,
  objectionEndScale: 1,
  objectionJitter: 1,
  shakeDistance: 1,
  noRotation: "0deg" as const,
  objectionRotation: "-2deg" as const,
  stampStartRotation: "-8deg" as const,
  spinnerSmall: "small" as const,
  spinnerLarge: "large" as const,
} as const;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

/**
 * The layout scale is derived from the viewport and clamped to remain tactile
 * on compact phones and composed on desktop Expo Web.
 */
export function createThemeTokens(width: number) {
  const unit = clamp(width / raw.baseWidth, raw.minUnit, raw.maxUnit);
  const space = {
    xxs: unit * 0.25,
    xs: unit * 0.5,
    sm: unit * 0.75,
    md: unit,
    lg: unit * 1.5,
    xl: unit * 2,
    xxl: unit * 3,
    xxxl: unit * 4,
  } as const;
  const bodySize = unit;
  const type = {
    body: {
      fontFamily: fonts.body,
      fontSize: bodySize,
      lineHeight: bodySize + space.xs,
    },
    bodyStrong: {
      fontFamily: fonts.bodyStrong,
      fontSize: bodySize,
      lineHeight: bodySize + space.xs,
    },
    label: {
      fontFamily: fonts.bodyStrong,
      fontSize: bodySize * 0.78,
      lineHeight: bodySize,
      letterSpacing: space.xxs,
      textTransform: "uppercase" as const,
    },
    section: {
      fontFamily: fonts.bodyStrong,
      fontSize: bodySize * 1.55,
      lineHeight: bodySize * 1.55 + space.xs,
    },
    title: {
      fontFamily: fonts.bodyStrong,
      fontSize: bodySize * 1.78,
      lineHeight: bodySize * 1.78 + space.sm,
    },
    numeric: {
      fontFamily: fonts.bodyStrong,
      fontSize: bodySize * 2.45,
      lineHeight: bodySize * 2.45 + space.sm,
      fontVariant: ["tabular-nums"] as "tabular-nums"[],
    },
    display: {
      fontFamily: fonts.display,
      fontSize: bodySize * 2.45,
      lineHeight: bodySize * 2.45 + space.sm,
      letterSpacing: space.xxs,
      textTransform: "uppercase" as const,
    },
    verdict: {
      fontFamily: fonts.display,
      fontSize: bodySize * 2.05,
      lineHeight: bodySize * 2.05 + space.sm,
      letterSpacing: space.xxs,
      textTransform: "uppercase" as const,
    },
  } as const;

  return {
    colors,
    tracker,
    court,
    fonts,
    raw,
    unit,
    width,
    isCompact: width < raw.compactBreakpoint,
    isTablet: width >= raw.tabletBreakpoint,
    space,
    type,
    layout: {
      contentWidth: width >= raw.tabletBreakpoint ? raw.almostFull : raw.full,
      contentMaxWidth: raw.desktopMaxWidth,
      videoWidth: raw.videoWidthRatio * 100,
      buttonMinHeight: space.xxl,
      buttonMaxWidth: "70%" as const,
      inputMinHeight: space.xxxl,
      cardRadius: space.md,
      controlRadius: space.sm,
      pillRadius: space.xxl,
      capsuleRadius: space.xxxl,
      borderThin: raw.borderThin,
      borderStrong: raw.borderStrong,
      heatmapCells: raw.heatmapColumns * raw.heatmapRows,
      heatmapColumns: raw.heatmapColumns,
      heatmapCellWidth: `${(raw.percentBase - raw.heatmapCellGapPercent) / raw.heatmapColumns}%` as const,
      safeBottomPad: space.md,
    },
    motion: {
      gaugeDurationMs: raw.gaugeDurationMs,
      typewriterMsPerCharacter: raw.typewriterMsPerCharacter,
      typewriterStartDelayMs: raw.typewriterStartDelayMs,
      courtAutoAdvanceMs: raw.courtAutoAdvanceMs,
      preShoutSilenceMs: raw.preShoutSilenceMs,
      videoProgressUpdateMs: raw.videoProgressUpdateMs,
      benchImpactMs: raw.benchImpactMs,
      pointImpactMs: raw.pointImpactMs,
      flashFramesMs: raw.flashFramesMs,
      splashDurationMs: raw.splashDurationMs,
      stampDurationMs: raw.stampDurationMs,
      sceneTransitionMs: raw.sceneTransitionMs,
    },
    media: {
      videoAspectRatio: raw.videoAspectRatio,
      gaugeUnits: raw.gaugeUnits,
      gaugeStrokeRatio: raw.gaugeStrokeRatio,
      checkStrokeRatio: raw.checkStrokeRatio,
      splashStartScale: raw.objectionStartScale,
      splashEndScale: raw.objectionEndScale,
      splashJitter: raw.objectionJitter,
      shakeDistance: raw.shakeDistance,
    },
    icons: {
      flameViewBox: "0 0 24 24",
      flamePath: "M12 2C8.7 6.2 6.2 8.7 6.2 13.4c0 3.6 2.6 6.6 5.8 6.6s5.8-3 5.8-6.6C17.8 9.7 15.3 6.2 12 2Zm0 15.4c-1.6 0-2.8-1.4-2.8-3.1 0-1.5.8-2.9 2.8-5.4 2 2.5 2.8 3.9 2.8 5.4 0 1.7-1.2 3.1-2.8 3.1Z",
      checkViewBox: "0 0 24 24",
      checkPath: "M5 12.5 9.5 17 19 7.5",
    },
  } as const;
}

export type ThemeTokens = ReturnType<typeof createThemeTokens>;

export function useThemeTokens() {
  const { width } = useWindowDimensions();
  return useMemo(() => createThemeTokens(width), [width]);
}
