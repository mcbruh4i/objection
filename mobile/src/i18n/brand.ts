/**
 * Brand shouts — deliberately NOT translated and NOT in fa.json.
 *
 * Roadmap hard rule: "brand shouts stay English on purpose". These are the
 * ONLY user-visible strings allowed outside the t() pipeline. They render in
 * the `shout`/`stamp` type variants (Space Grotesk).
 */
export const BRAND_SHOUTS = {
  objection: "OBJECTION!",
  guilty: "GUILTY",
  dismissed: "DISMISSED",
  appName: "OBJECTION!",
} as const;
