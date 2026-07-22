/**
 * Formatting utilities — Persian digits everywhere, money in ONE place.
 */
import i18n from "../i18n";

const PERSIAN_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"] as const;

/** Convert every ASCII digit in a string to Persian (Farsi) digits. */
export function toPersianDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => PERSIAN_DIGITS[Number(d)] as string);
}

/** Group thousands with the Persian separator («٬»). */
export function groupThousands(value: number): string {
  const sign = value < 0 ? "-" : "";
  const digits = Math.trunc(Math.abs(value)).toString();
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, "٬");
  return sign + grouped;
}

/**
 * Money display — THE single place money formatting lives.
 *
 * Backend sends integer `*_cents` values. Owner decision (feedback round 1):
 * fines must feel like real money — a broken daily promise ≈ 70–100k Toman.
 * The backend caps penalty_cents at 100,000, so the DISPLAY scale maps
 * 1 cent → 10 Toman (8,000¢ → «۸۰٬۰۰۰ تومان», 20,000¢ → «۲۰۰٬۰۰۰ تومان»).
 * First pass — tune ONLY here if the scale changes again.
 */
export const TOMAN_PER_CENT = 10;

export function formatMoney(amountCents: number): string {
  return `${toPersianDigits(groupThousands(amountCents * TOMAN_PER_CENT))} ${i18n.t("common.money_unit")}`;
}

/** Local wall-clock HH:MM of an ISO timestamp, in Persian digits. */
export function formatTimeOfIso(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return toPersianDigits("--:--");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return toPersianDigits(`${hh}:${mm}`);
}

/** «۱۲ از ۶۰۰» style counter for plea/rebuttal inputs. */
export function formatCharCount(count: number, max: number): string {
  return i18n.t("common.char_count", {
    count: toPersianDigits(count) as unknown as number,
    max: toPersianDigits(max),
  });
}
