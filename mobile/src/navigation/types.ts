/**
 * Navigation params. The Courtroom is a ROOT-level full-screen route —
 * not a tab — so the bottom tab bar is structurally absent there
 * (roadmap: nav hidden in the courtroom, explicit exit only).
 */
import type { ProsecutorResponse, SessionState } from "../api/types";

export type RootStackParamList = {
  MainTabs: undefined;
  Courtroom: {
    sessionId: string;
    /** Needed to record the verdict per habit when the case resolves. */
    habitId: string | null;
    habitTitle: string;
    initialState: Exclude<SessionState, "resolved">;
    initialProsecutor: ProsecutorResponse | null;
  };
};

export type MainTabsParamList = {
  Today: undefined;
  Ledger: undefined;
  Settings: undefined;
};
