import { addDays, format, isValid, parseISO } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import type { Settings } from "./types";
export const defaultSettings: Settings = {
  _id: "general",
  organization: "Report Desk",
  timezone: "Asia/Kabul",
  weekStartsOn: 5,
  deadlineDay: 4,
  deadlineHour: 23,
  rankingWeeks: 8,
  weights: { timeliness: 50, attendance: 35, stability: 15 },
};
export function dateKey(value: Date, timezone = "Asia/Kabul") {
  return formatInTimeZone(value, timezone, "yyyy-MM-dd");
}
export function validDate(value: string) {
  const d = parseISO(value);
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    isValid(d) &&
    format(d, "yyyy-MM-dd") === value
  );
}
export function shiftDate(value: string, days: number) {
  return format(addDays(parseISO(value), days), "yyyy-MM-dd");
}
export function weekStart(value: string, firstDay = 5) {
  const day = parseISO(value).getDay();
  return shiftDate(value, -((day - firstDay + 7) % 7));
}
export function deadline(week: string, settings: Settings) {
  const day = shiftDate(
    week,
    (settings.deadlineDay - settings.weekStartsOn + 7) % 7,
  );
  return fromZonedTime(
    `${day}T${String(settings.deadlineHour).padStart(2, "0")}:59:59.999`,
    settings.timezone,
  );
}
export function closedWeeks(settings: Settings, now = new Date()) {
  let last = weekStart(dateKey(now, settings.timezone), settings.weekStartsOn);
  if (deadline(last, settings) >= now) last = shiftDate(last, -7);
  return Array.from({ length: settings.rankingWeeks }, (_, i) =>
    shiftDate(last, -7 * (settings.rankingWeeks - i - 1)),
  );
}
export type Calendar = "persian" | "gregory";
export function calendarParts(day: string, calendar: Calendar) {
  const parts = new Intl.DateTimeFormat(`en-US-u-ca-${calendar}`, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    timeZone: "UTC",
  }).formatToParts(new Date(`${day}T12:00:00Z`));
  const read = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value);
  return { year: read("year"), month: read("month"), day: read("day") };
}
export function calendarDate(
  year: number,
  month: number,
  day: number,
  calendar: Calendar,
): string {
  if (calendar === "gregory")
    return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
  // Intl is the calendar authority; binary search avoids hand-maintained leap-year tables.
  const anchor = Date.UTC(year + 621, 2, 10);
  let low = 0,
    high = 380;
  const target = year * 10000 + month * 100 + day;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const key = new Date(anchor + mid * 86400000).toISOString().slice(0, 10);
    const p = calendarParts(key, calendar);
    const actual = p.year * 10000 + p.month * 100 + p.day;
    if (actual === target) return key;
    if (actual < target) low = mid + 1;
    else high = mid - 1;
  }
  throw new Error("INVALID_DATE");
}
export function monthBounds(period: string, calendar: Calendar = "gregory") {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period))
    throw new Error("INVALID_PERIOD");
  const [year, month] = period.split("-").map(Number);
  return {
    from: calendarDate(year, month, 1, calendar),
    to: calendarDate(
      month === 12 ? year + 1 : year,
      month === 12 ? 1 : month + 1,
      1,
      calendar,
    ),
  };
}
