/**
 * i18n skeleton (Phase 0 rule 2): initialized BEFORE any UI renders.
 *
 * - fa.json is the source of truth; en.json mirrors its keys.
 * - V1 is Persian-only and RTL-locked: `lng` is hard-set to "fa". There is
 *   deliberately NO runtime language switch. expo-localization stays wired so
 *   a future version can detect device locale without re-plumbing.
 * - All UI strings flow through t(); the only exceptions are the English
 *   brand shouts in ./brand.ts (roadmap hard rule 3).
 */
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";

import fa from "./fa.json";
import en from "./en.json";

export const deviceLocaleTag: string = getLocales()[0]?.languageTag ?? "fa-IR";

void i18n.use(initReactI18next).init({
  resources: {
    fa: { translation: fa },
    en: { translation: en },
  },
  lng: "fa",
  fallbackLng: "fa",
  interpolation: {
    // React already escapes; double-escaping breaks Persian punctuation.
    escapeValue: false,
  },
  returnNull: false,
});

export default i18n;
