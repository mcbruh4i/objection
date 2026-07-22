/**
 * Seed data for the mock API — Persian titles, realistic history spread.
 * Long titles included on purpose: the UI must survive them (no clipping).
 *
 * Money (owner, round 1): penalties in backend cents, DISPLAYED ×10 Toman
 * (utils/format.ts). Daily fines ≈ 8,000¢ → ۸۰٬۰۰۰ تومان; weekly targets
 * 20,000¢ → ۲۰۰٬۰۰۰ تومان. Backend cap: penalty_cents ≤ 100,000.
 */
import type { Fine, Habit, HistoryDay, HistoryResponse } from "./types";

function isoDaysAgoUtc(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function utcTodayAt(hour: number, minute: number): string {
  const d = new Date();
  d.setUTCHours(hour, minute, 0, 0);
  return d.toISOString();
}

export interface MockSeed {
  habits: Habit[];
  fines: Fine[];
  history: HistoryResponse;
}

export function buildMockSeed(): MockSeed {
  const habits: Habit[] = [
    {
      id: "habit-seed-1",
      title: "نیم ساعت مطالعهٔ کتاب",
      minutes: 30,
      deadline_at: utcTodayAt(20, 29),
      penalty_cents: 8_000, // → ۸۰٬۰۰۰ تومان
      status: "pending",
    },
    {
      id: "habit-seed-2",
      title: "ورزش صبحگاهی — حداقل بیست دقیقه حرکات کششی و هوازی، حتی اگر دیر بیدار شدم",
      minutes: 20,
      deadline_at: utcTodayAt(6, 29),
      penalty_cents: 10_000, // → ۱۰۰٬۰۰۰ تومان
      status: "completed",
    },
    {
      id: "habit-seed-3",
      title: "ساعت ۱۱ خواب باشم",
      minutes: 15,
      deadline_at: utcTodayAt(19, 29),
      penalty_cents: 7_000, // → ۷۰٬۰۰۰ تومان
      status: "pending",
    },
    {
      // Weekly target (cadence seeded in state/cadenceStore.ts SEED_CADENCES).
      id: "habit-seed-4",
      title: "سه جلسه باشگاه در این هفته",
      minutes: 60,
      deadline_at: utcTodayAt(21, 59),
      penalty_cents: 20_000, // → ۲۰۰٬۰۰۰ تومان (weekly targets fine heavier)
      status: "pending",
    },
  ];

  const fines: Fine[] = [
    {
      id: "fine-seed-1",
      amount_cents: 8_000,
      reason: "Court rejected a repeated excuse.",
      created_at: `${isoDaysAgoUtc(1)}T18:42:00+00:00`,
      status: "recorded",
    },
    {
      id: "fine-seed-2",
      amount_cents: 0,
      reason: "Case accepted — no mock fine.",
      created_at: `${isoDaysAgoUtc(3)}T20:12:00+00:00`,
      status: "recorded",
    },
    {
      id: "fine-seed-3",
      amount_cents: 20_000,
      reason: "Court issued a default absentia ruling after the Judge call failed.",
      created_at: `${isoDaysAgoUtc(9)}T17:05:00+00:00`,
      status: "recorded",
    },
  ];

  // ~10 weeks of plausible day rows (UTC buckets, like the backend).
  const days: HistoryDay[] = [];
  for (let i = 0; i < 70; i += 1) {
    const wave = (i * 7 + 3) % 10;
    const total = 2 + (wave % 3);
    const skipped = wave >= 8 ? 1 : 0;
    const completed = Math.max(0, total - skipped - (wave === 5 ? 1 : 0));
    days.push({
      date: isoDaysAgoUtc(i),
      total,
      completed,
      skipped,
      fine_cents: skipped > 0 ? (wave === 9 ? 20_000 : 8_000) : 0,
    });
  }

  return { habits, fines, history: { days } };
}
