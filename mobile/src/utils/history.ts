/**
 * Client-side aggregation of GET /history for the TODAY screen tabs.
 *
 * The backend returns per-day rows keyed by UTC "YYYY-MM-DD" strings.
 * ⚠️ UTC boundary limitation (see jalali.ts header): buckets are UTC days,
 * not Tehran midnight — Tehran activity between 00:00 and 03:30 local time
 * lands on the previous day's bucket. Accepted for V1.
 *
 * Tab semantics (owner-approved):
 * - day   → today's UTC bucket
 * - week  → current Jalali week, Saturday-start (شنبه تا جمعه)
 * - month → current Jalali month
 * NO yearly range exists — removed by owner decision (feedback round 1).
 */
import type { HistoryDay } from "../api/types";
import {
  dayNumberOfUtcDayString,
  jalaliOfUtcDayString,
  jalaliOfLocalDate,
  saturdayWeekdayIndexOfDayNumber,
  utcTodayDayNumber,
  utcTodayString,
} from "./jalali";

export type HistoryTab = "day" | "week" | "month";

export interface HistoryTotals {
  total: number;
  completed: number;
  skipped: number;
  fineCents: number;
  daysCounted: number;
}

const EMPTY: HistoryTotals = {
  total: 0,
  completed: 0,
  skipped: 0,
  fineCents: 0,
  daysCounted: 0,
};

function inRange(day: HistoryDay, tab: HistoryTab, now: Date): boolean {
  if (tab === "day") {
    return day.date === utcTodayString(now);
  }
  if (tab === "week") {
    const jdn = dayNumberOfUtcDayString(day.date);
    if (jdn === null) return false;
    const todayJdn = utcTodayDayNumber(now);
    // Start of the current Saturday-start week containing "today" (UTC).
    const weekStart = todayJdn - saturdayWeekdayIndexOfDayNumber(todayJdn);
    return jdn >= weekStart && jdn < weekStart + 7;
  }
  // month
  const j = jalaliOfUtcDayString(day.date);
  if (j === null) return false;
  const jNow = jalaliOfLocalDate(now);
  return j.jy === jNow.jy && j.jm === jNow.jm;
}

export function totalsForTab(
  days: readonly HistoryDay[],
  tab: HistoryTab,
  now: Date = new Date(),
): HistoryTotals {
  return days.reduce<HistoryTotals>((acc, day) => {
    if (!inRange(day, tab, now)) return acc;
    return {
      total: acc.total + day.total,
      completed: acc.completed + day.completed,
      skipped: acc.skipped + day.skipped,
      fineCents: acc.fineCents + day.fine_cents,
      daysCounted: acc.daysCounted + 1,
    };
  }, EMPTY);
}
