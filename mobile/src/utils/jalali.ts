/**
 * Jalali (Shamsi) calendar utilities — pure TS, no dependencies.
 *
 * Conversion algorithm adapted from the public-domain jalaali-js arithmetic
 * (Behrooz Kamali et al.), the de-facto standard Jalali<->Gregorian math.
 *
 * ⚠️ KNOWN V1 LIMITATION — /history dates are UTC day boundaries. ⚠️
 * The backend aggregates /history by `substr(<ISO UTC timestamp>, 1, 10)`,
 * i.e. UTC calendar days, NOT Tehran midnight. Tehran is UTC+03:30, so any
 * activity between 00:00 and 03:30 Tehran local time lands on the PREVIOUS
 * day's bucket. This is accepted for V1; the backend stays untouched.
 * All range filtering in this file therefore treats a history `date` string
 * as a UTC day and compares against "today" computed in UTC as well, so the
 * app and backend at least agree on bucket boundaries.
 */

export interface JalaliDate {
  jy: number;
  jm: number; // 1..12
  jd: number; // 1..31
}

/** Saturday-start weekday index: 0=Saturday … 6=Friday (شنبه-first week). */
export type SaturdayWeekdayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

function div(a: number, b: number): number {
  return Math.trunc(a / b);
}

function mod(a: number, b: number): number {
  return a - Math.trunc(a / b) * b;
}

function g2d(gy: number, gm: number, gd: number): number {
  let d =
    div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
    div(153 * mod(gm + 9, 12) + 2, 5) +
    gd -
    34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}

function d2g(jdn: number): { gy: number; gm: number; gd: number } {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}

function jalCal(jy: number): { leap: number; gy: number; march: number } {
  const breaks = [
    -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097,
    2192, 2262, 2324, 2394, 2456, 3178,
  ];
  const bl = breaks.length;
  const gy = jy + 621;
  let leapJ = -14;
  let jp = breaks[0] as number;

  let jump = 0;
  for (let i = 1; i < bl; i += 1) {
    const jm = breaks[i] as number;
    jump = jm - jp;
    if (jy < jm) break;
    leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }
  let n = jy - jp;
  leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;

  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;

  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
  let leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;

  return { leap, gy, march };
}

function j2d(jy: number, jm: number, jd: number): number {
  const r = jalCal(jy);
  return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
}

function d2j(jdn: number): JalaliDate {
  const gy = d2g(jdn).gy;
  let jy = gy - 621;
  const r = jalCal(jy);
  const jdn1f = g2d(gy, 3, r.march);
  let jd: number;
  let jm: number;
  let k = jdn - jdn1f;
  if (k >= 0) {
    if (k <= 185) {
      jm = 1 + div(k, 31);
      jd = mod(k, 31) + 1;
      return { jy, jm, jd };
    }
    k -= 186;
  } else {
    jy -= 1;
    k += 179;
    if (r.leap === 1) k += 1;
  }
  jm = 7 + div(k, 30);
  jd = mod(k, 30) + 1;
  return { jy, jm, jd };
}

/** Gregorian (y, m 1..12, d) → Jalali. */
export function gregorianToJalali(gy: number, gm: number, gd: number): JalaliDate {
  return d2j(g2d(gy, gm, gd));
}

/** Jalali → Gregorian (y, m 1..12, d). */
export function jalaliToGregorian(jy: number, jm: number, jd: number): {
  gy: number;
  gm: number;
  gd: number;
} {
  return d2g(j2d(jy, jm, jd));
}

/**
 * Saturday-start weekday for a JS Date (uses the Date's LOCAL day-of-week).
 * JS getDay(): 0=Sunday … 6=Saturday → shift so 0=Saturday (شنبه).
 */
export function saturdayWeekdayIndex(date: Date): SaturdayWeekdayIndex {
  return ((date.getDay() + 1) % 7) as SaturdayWeekdayIndex;
}

/** Jalali date of a JS Date, using the device's LOCAL calendar day. */
export function jalaliOfLocalDate(date: Date): JalaliDate {
  return gregorianToJalali(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

/**
 * Jalali date of a UTC calendar-day string "YYYY-MM-DD" (the /history bucket
 * format). See the UTC-boundary limitation note at the top of this file.
 */
export function jalaliOfUtcDayString(day: string): JalaliDate | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!m) return null;
  const gy = Number(m[1]);
  const gm = Number(m[2]);
  const gd = Number(m[3]);
  if (!Number.isFinite(gy) || gm < 1 || gm > 12 || gd < 1 || gd > 31) return null;
  return gregorianToJalali(gy, gm, gd);
}

/** Today as a UTC "YYYY-MM-DD" string — matches /history bucket boundaries. */
export function utcTodayString(now: Date = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * The UTC "YYYY-MM-DD" strings of the current Jalali week (Saturday-start),
 * current-Jalali-month membership, and current-Jalali-year membership are
 * derived from these helpers by the history filter (see history.ts).
 */
export function jalaliDayNumber(j: JalaliDate): number {
  return j2d(j.jy, j.jm, j.jd);
}

/** Julian day number of a UTC day string, or null when malformed. */
export function dayNumberOfUtcDayString(day: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!m) return null;
  return g2d(Number(m[1]), Number(m[2]), Number(m[3]));
}

/** Julian day number of "today" in UTC. */
export function utcTodayDayNumber(now: Date = new Date()): number {
  return g2d(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate());
}

/**
 * Saturday-start weekday index for a UTC day string (0=Saturday).
 * JDN weekday: jdn % 7 → 0=Monday … 6=Sunday (JDN 0 was a Monday).
 * Shift so Saturday=0: (jdn + 2) % 7.
 */
export function saturdayWeekdayIndexOfDayNumber(jdn: number): SaturdayWeekdayIndex {
  return mod(jdn + 2, 7) as SaturdayWeekdayIndex;
}
