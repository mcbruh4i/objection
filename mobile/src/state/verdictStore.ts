/**
 * Per-habit verdict record — which way a habit's court case resolved
 * (rejected → GUILTY, accepted → DISMISSED), so the Today screen can stamp
 * judged cards with the correct seal.
 *
 * ⚠️ CLIENT-SIDE (V1): /today exposes only OPEN sessions; resolved verdicts
 * never come back from the API (and fines carry no habit id). The verdict is
 * captured at the moment the courtroom resolves and persisted on-device.
 * If a judged habit's verdict is unknown (fresh install, resolution on
 * another device), the UI shows the neutral «مختومه» chip WITHOUT a stamp —
 * never a guessed verdict.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { VerdictKind } from "../api/types";

const STORAGE_KEY = "objection.habitVerdicts.v1";

export type VerdictMap = Record<string, VerdictKind>;

function isVerdict(value: unknown): value is VerdictKind {
  return value === "accepted" || value === "rejected";
}

export async function loadVerdicts(): Promise<VerdictMap> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    const map: VerdictMap = {};
    for (const [id, verdict] of Object.entries(parsed as Record<string, unknown>)) {
      if (isVerdict(verdict)) map[id] = verdict;
    }
    return map;
  } catch {
    return {};
  }
}

export async function saveVerdict(habitId: string, verdict: VerdictKind): Promise<void> {
  const current = await loadVerdicts();
  current[habitId] = verdict;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Persistence failure must never crash the app; the card falls back
    // to the stamp-less «مختومه» chip.
  }
}
