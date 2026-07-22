/**
 * Habit fine cadence — daily / weekly / monthly. NO yearly cadence exists,
 * by owner decision (feedback round 1). Do not add one.
 *
 * ⚠️ CLIENT-SIDE CATEGORY (V1): the backend Habit model has no cadence
 * field and the backend stays untouched, so cadence lives on-device
 * (AsyncStorage) keyed by habit id. It drives:
 *   - Today-screen section grouping (daily promises vs weekly/monthly targets)
 *   - the default penalty_cents sent at habit creation
 * When the backend grows a cadence field, this module becomes a thin mirror.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

export type HabitCadence = "daily" | "weekly" | "monthly";

export const CADENCES: readonly HabitCadence[] = ["daily", "weekly", "monthly"];

/**
 * Default fines per cadence, in backend cents (display = ×10 Toman, see
 * utils/format.ts). First pass per owner: daily ≈ 80k Toman, weekly targets
 * ≈ 200k Toman, monthly heavier still. Backend cap: 100,000 cents.
 */
export const DEFAULT_PENALTY_CENTS: Record<HabitCadence, number> = {
  daily: 8_000, // → ۸۰٬۰۰۰ تومان
  weekly: 20_000, // → ۲۰۰٬۰۰۰ تومان
  monthly: 30_000, // → ۳۰۰٬۰۰۰ تومان (placeholder — tune with owner)
};

const STORAGE_KEY = "objection.habitCadence.v1";

/** Demo/mock seed habits ship with a known cadence (mock API only). */
const SEED_CADENCES: Record<string, HabitCadence> = {
  "habit-seed-4": "weekly",
};

export type CadenceMap = Record<string, HabitCadence>;

function isCadence(value: unknown): value is HabitCadence {
  return value === "daily" || value === "weekly" || value === "monthly";
}

export async function loadCadences(): Promise<CadenceMap> {
  let stored: CadenceMap = {};
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed === "object" && parsed !== null) {
        for (const [id, cadence] of Object.entries(parsed as Record<string, unknown>)) {
          if (isCadence(cadence)) stored[id] = cadence;
        }
      }
    }
  } catch {
    stored = {};
  }
  return { ...SEED_CADENCES, ...stored };
}

export async function saveCadence(habitId: string, cadence: HabitCadence): Promise<void> {
  const current = await loadCadences();
  current[habitId] = cadence;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Persistence failure must never crash the app; grouping falls back to daily.
  }
}

export function cadenceOf(map: CadenceMap, habitId: string): HabitCadence {
  return map[habitId] ?? "daily";
}
