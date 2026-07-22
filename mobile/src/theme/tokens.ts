/**
 * LAYER 2 — SEMANTIC TOKENS. The only theme surface components may import.
 *
 * Brutalist system (per approved plan, grounded in ui-ux-pro-max
 * "Kinetic Brutalism (Mobile)"): 0px radius, thick visible borders, hard
 * offset shadows with zero blur, heavy weights, instant transitions.
 *
 * Two worlds:
 *   - paper world (tracker): colors.bg / surface / textPrimary…
 *   - court world (courtroom): colors.bgCourt / surfaceCourt / textOnDark…
 */
import { TextStyle } from "react-native";
import { palette } from "./palette";
import { fontFamilies } from "./fonts";

export const colors = {
  // paper world
  bg: palette.cream100,
  surface: palette.white,
  surfaceAlt: palette.cream200,
  textPrimary: palette.ink900,
  textMuted: palette.ink700,
  line: palette.ink900,
  lineSoft: palette.khaki400,

  // court world
  bgCourt: palette.ink800,
  surfaceCourt: palette.ink900,
  textOnDark: palette.cream100,
  textMutedOnDark: palette.khaki400,
  lineOnDark: palette.cream100,

  // shared roles
  accent: palette.orange500,
  accentPressed: palette.orange600,
  onAccent: palette.ink900,
  danger: palette.red600,
  onDanger: palette.white,
  shadow: palette.ink900,
  /**
   * Light plate behind verdict stamps: red/ink stamps sit on a paper slip so
   * GUILTY stays WCAG-legible inside the dark court world (QA: red on the
   * dark canvas is 2.6:1 — on this plate it is 4.6:1).
   */
  stampPlate: palette.cream100,
} as const;

/** Spacing scale — the only spacing values allowed in components. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  x3l: 32,
  x4l: 48,
} as const;

/** Border widths — visible structure is the brutalist skeleton. */
export const borders = {
  rule: 1,
  bold: 2,
  heavy: 3,
} as const;

/** Hard shadows: offset only, NO blur. Rendered by HardShadowBox. */
export const shadows = {
  offset: 4,
  offsetSmall: 3,
} as const;

export const radii = {
  /** Brutalism: sharp corners everywhere. Single token so it stays auditable. */
  none: 0,
} as const;

/** Opacity steps (pressed states are instant, not animated). */
export const opacity = {
  pressed: 0.85,
  disabled: 0.45,
} as const;

/** Touch targets (ux QA: min 44, hitSlop for smaller glyphs). */
export const touch = {
  minTarget: 44,
  hitSlop: { top: 10, bottom: 10, left: 10, right: 10 },
} as const;

type TypeVariant = Pick<
  TextStyle,
  "fontFamily" | "fontSize" | "lineHeight" | "letterSpacing" | "textTransform"
>;

/**
 * Type scale. Persian needs generous line-height (≥1.7×) — long judge and
 * prosecutor strings must never clip (API contract note).
 * English shout/stamp/mono variants keep the tight brutalist rhythm.
 */
export const type = {
  shout: {
    fontFamily: fontFamilies.shout.bold,
    fontSize: 44,
    lineHeight: 46,
    letterSpacing: -1,
    textTransform: "uppercase",
  },
  stamp: {
    fontFamily: fontFamilies.shout.bold,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  /** Compact verdict stamp for in-card seals (same ink, smaller slam). */
  stampSmall: {
    fontFamily: fontFamilies.shout.bold,
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  display: {
    fontFamily: fontFamilies.display.black,
    fontSize: 28,
    lineHeight: 44,
  },
  h1: {
    fontFamily: fontFamilies.display.bold,
    fontSize: 21,
    lineHeight: 34,
  },
  h2: {
    fontFamily: fontFamilies.body.bold,
    fontSize: 17,
    lineHeight: 28,
  },
  body: {
    fontFamily: fontFamilies.body.regular,
    fontSize: 15,
    lineHeight: 26,
  },
  bodyBold: {
    fontFamily: fontFamilies.body.bold,
    fontSize: 15,
    lineHeight: 26,
  },
  label: {
    fontFamily: fontFamilies.body.medium,
    fontSize: 13,
    lineHeight: 22,
  },
  caption: {
    fontFamily: fontFamilies.body.regular,
    fontSize: 12,
    lineHeight: 20,
  },
  mono: {
    fontFamily: fontFamilies.mono.regular,
    fontSize: 12,
    lineHeight: 18,
  },
  monoBold: {
    fontFamily: fontFamilies.mono.bold,
    fontSize: 13,
    lineHeight: 20,
  },
} as const satisfies Record<string, TypeVariant>;

export type TypeVariantName = keyof typeof type;

export const theme = {
  colors,
  spacing,
  borders,
  shadows,
  radii,
  opacity,
  touch,
  type,
} as const;

export type Theme = typeof theme;
