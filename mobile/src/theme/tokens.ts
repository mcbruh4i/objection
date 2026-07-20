import { useMemo } from "react";
import { useWindowDimensions } from "react-native";

/**
 * Courtroom Noir is deliberately split into raw pigment names and semantic
 * roles. UI code consumes only `colors`, so a palette change remains local to
 * this file.
 */
export const rawColors = {
  bg0: "#F4EBD9",
  bg1: "#FBF5E8",
  surface: "#FFFDF4",
  beige: "#ECDFC3",
  woodLight: "#A97F52",
  woodLine: "#E0D1B2",
  primary: "#7E2334",
  primarySoft: "#5E1723",
  creamBright: "#FFF6E1",
  creamDeep: "#EFDCB3",
  gaugeTrack: "#DDC79F",
  ink: "#3C2A20",
  inkMuted: "#8B7A5E",
  danger: "#C7483A",
  ok: "#3F7D54",
} as const;

export const colors = {
  background: rawColors.bg0,
  card: rawColors.bg1,
  elevated: rawColors.surface,
  navBar: rawColors.beige,
  trim: rawColors.woodLight,
  borderSubtle: rawColors.woodLine,
  primary: rawColors.primary,
  primaryPressed: rawColors.primarySoft,
  gaugeTrack: rawColors.gaugeTrack,
  gaugeFill: rawColors.creamBright,
  gaugeFillEnd: rawColors.creamDeep,
  text: rawColors.ink,
  textMuted: rawColors.inkMuted,
  input: rawColors.surface,
  success: rawColors.ok,
  objection: rawColors.danger,
  fine: rawColors.danger,
  rejected: rawColors.danger,
  flash: rawColors.surface,
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
  maxHabits: 6,
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
      fontSize: bodySize,
      lineHeight: bodySize + space.xs,
      fontWeight: "400" as const,
    },
    bodyStrong: {
      fontSize: bodySize,
      lineHeight: bodySize + space.xs,
      fontWeight: "700" as const,
    },
    label: {
      fontSize: bodySize * 0.78,
      lineHeight: bodySize,
      fontWeight: "800" as const,
      letterSpacing: space.xxs / 2,
    },
    section: {
      fontSize: bodySize * 1.55,
      lineHeight: bodySize * 1.55 + space.xs,
      fontWeight: "900" as const,
    },
    title: {
      fontSize: bodySize * 1.78,
      lineHeight: bodySize * 1.78 + space.sm,
      fontWeight: "900" as const,
    },
    display: {
      fontSize: bodySize * 2.45,
      lineHeight: bodySize * 2.45 + space.sm,
      fontWeight: "900" as const,
      letterSpacing: space.xxs / 2,
    },
    verdict: {
      fontSize: bodySize * 2.05,
      lineHeight: bodySize * 2.05 + space.sm,
      fontWeight: "900" as const,
      letterSpacing: space.xxs,
    },
  } as const;

  return {
    colors,
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
