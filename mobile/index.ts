/**
 * Entry point. RTL is locked here, BEFORE anything renders.
 *
 * V1 is Persian-only: no runtime language switch exists, so RTL is forced at
 * build/startup time (roadmap Phase 0, rule 3). On native Android the first
 * forceRTL(true) takes effect after one app restart — expected RN behavior.
 */
import { I18nManager, Platform } from "react-native";
import { registerRootComponent } from "expo";

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

// react-native-web reads the document direction, not I18nManager, so the
// same RTL lock is applied to the DOM when running the 390px web target.
if (Platform.OS === "web" && typeof document !== "undefined") {
  document.documentElement.setAttribute("dir", "rtl");
  document.documentElement.setAttribute("lang", "fa");
}

// i18n must initialize before the first render (Phase 0, i18n-before-UI).
import "./src/i18n";

import App from "./App";

registerRootComponent(App);
