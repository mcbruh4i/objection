/**
 * Font tokens + the expo-font loading map.
 *
 * OWNER DECISION (2026-07-22): the final Persian font is still being tested
 * (candidates: Peyda for body; Kalameh / Rokh / Doran / Morabba / Quarantine
 * Black weights for display). Estedad (OFL, Google Fonts) is a TEMPORARY
 * placeholder for BOTH `body` and `display`.
 *
 * Swapping the final font later = change the family strings below and the
 * corresponding entries in FONT_ASSETS. One-line-per-token, nothing else in
 * the codebase names a font family. Components consume theme.type variants
 * (tokens.ts), which reference these families.
 */

// Semantic family tokens. Weight variants are separate families because
// Android resolves weights per-family-file, not via fontWeight.
export const fontFamilies = {
  body: {
    regular: "Estedad-Regular",
    medium: "Estedad-Medium",
    bold: "Estedad-Bold",
  },
  display: {
    // Display placeholder = Estedad heavy cuts until the display font lands.
    bold: "Estedad-Bold",
    black: "Estedad-Black",
  },
  // English brand shouts (OBJECTION! / GUILTY / DISMISSED) — locked.
  shout: {
    regular: "SpaceGrotesk-Regular",
    medium: "SpaceGrotesk-Medium",
    bold: "SpaceGrotesk-Bold",
  },
  // Ledger fine.reason court-record line — locked.
  mono: {
    regular: "SpaceMono-Regular",
    bold: "SpaceMono-Bold",
  },
} as const;

import estedadRegular from "../../assets/fonts/Estedad-Regular.ttf";
import estedadMedium from "../../assets/fonts/Estedad-Medium.ttf";
import estedadBold from "../../assets/fonts/Estedad-Bold.ttf";
import estedadBlack from "../../assets/fonts/Estedad-Black.ttf";
import spaceGroteskRegular from "../../assets/fonts/SpaceGrotesk-Regular.ttf";
import spaceGroteskMedium from "../../assets/fonts/SpaceGrotesk-Medium.ttf";
import spaceGroteskBold from "../../assets/fonts/SpaceGrotesk-Bold.ttf";
import spaceMonoRegular from "../../assets/fonts/SpaceMono-Regular.ttf";
import spaceMonoBold from "../../assets/fonts/SpaceMono-Bold.ttf";

/** expo-font loading map. Keys MUST equal the family strings above. */
export const FONT_ASSETS = {
  "Estedad-Regular": estedadRegular,
  "Estedad-Medium": estedadMedium,
  "Estedad-Bold": estedadBold,
  "Estedad-Black": estedadBlack,
  "SpaceGrotesk-Regular": spaceGroteskRegular,
  "SpaceGrotesk-Medium": spaceGroteskMedium,
  "SpaceGrotesk-Bold": spaceGroteskBold,
  "SpaceMono-Regular": spaceMonoRegular,
  "SpaceMono-Bold": spaceMonoBold,
} as const;
