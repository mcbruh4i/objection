/**
 * Metro asset module declarations (font files imported in src/theme/fonts.ts).
 * Metro resolves these to asset reference numbers at bundle time.
 */
declare module "*.ttf" {
  const asset: number;
  export default asset;
}
