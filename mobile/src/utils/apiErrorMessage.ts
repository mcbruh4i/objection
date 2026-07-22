/**
 * Maps transport errors to calm Persian copy. Backend `detail` strings are
 * English server constants — we never surface them raw in the tracker UI;
 * known statuses get specific keys, everything else gets the generic line.
 */
import type { TFunction } from "i18next";
import { ApiError } from "../api/client";

export function apiErrorMessage(
  error: unknown,
  t: TFunction,
  overrides?: Partial<Record<number, string>>,
): string {
  if (error instanceof ApiError) {
    if (error.kind === "network" || error.kind === "timeout") {
      return t("common.error_network");
    }
    const override = overrides?.[error.status];
    if (override) return override;
  }
  return t("common.error_generic");
}
