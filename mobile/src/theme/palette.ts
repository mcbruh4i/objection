/**
 * LAYER 1 — RAW PALETTE.
 *
 * ⚠️ THE ONLY FILE IN THE ENTIRE APP WHERE HEX CODES MAY EXIST. ⚠️
 * Components never import this file; they consume the semantic roles in
 * tokens.ts. This split is the reason the previous UI failed — keep it.
 *
 * Values are sampled from the owner's reference images:
 * - dark world / orange accent ref  → ink900/ink800, orange500
 * - paper & tracker mood refs      → cream100/cream200, khaki400
 * Brutalist danger red chosen for stamp/fine emphasis (WCAG-checked on cream).
 */
export const palette = {
  ink900: "#161613",
  ink800: "#262721",
  ink700: "#3A3B33",

  cream100: "#E8E9CA",
  cream200: "#DADBBC",
  khaki400: "#B2B49E",

  white: "#FFFFFF",

  orange500: "#E8642C",
  orange600: "#C94F1D",

  red600: "#C22B15",

  // Success/“paid off” accents intentionally absent: V1 keeps the two-ink
  // discipline (ink + orange, red for danger). Add here first if that changes.
} as const;

export type RawPalette = typeof palette;
