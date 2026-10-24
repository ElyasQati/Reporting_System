"use client";
import { calendarDate, calendarParts, dateKey, monthBounds } from "@/lib/dates";
import { useI18n } from "./providers";
import { num } from "@/lib/client";
import { Field } from "./ui";
export function monthNames(locale: "fa" | "en") {
  return locale === "fa"
    ? [
        "حمل",
        "ثور",
        "جوزا",
        "سرطان",
        "اسد",
        "سنبله",
        "میزان",
        "عقرب",
        "قوس",
        "جدی",
        "دلو",
        "حوت",
      ]
    : [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];
}
export function PeriodPicker({
  period,
  onChange,
}: {
  period: string;
  onChange: (value: string) => void;
}) {
  const { locale, t } = useI18n();
  const [year, month] = period.split("-").map(Number);
  const current = calendarParts(
    dateKey(new Date()),
    locale === "fa" ? "persian" : "gregory",
  ).year;
  return (
    <div className="period-picker" role="group" aria-label={t("period")}>
      <select
        aria-label={t("month")}
        value={month}
        onChange={(e) => onChange(`${year}-${e.target.value.padStart(2, "0")}`)}
      >
        {monthNames(locale).map((m, i) => (
          <option key={m} value={i + 1}>
            {m}
          </option>
        ))}
      </select>
      <select
        aria-label={t("year")}
        value={year}
        onChange={(e) =>
          onChange(`${e.target.value}-${String(month).padStart(2, "0")}`)
        }
      >
        {Array.from({ length: 30 }, (_, i) => current + 1 - i).map((y) => (
          <option value={y} key={y}>
            {num(y, locale).replaceAll(",", "").replaceAll("٬", "")}
          </option>
        ))}
      </select>
    </div>
  );
}
export function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const { locale, t } = useI18n();
  const calendar = locale === "fa" ? "persian" : "gregory";
  if (!value)
    return (
      <fieldset className="date-field">
        <legend className="field-label">{label}</legend>
        <button
          type="button"
          className="button button-secondary"
          onClick={() => onChange(dateKey(new Date()))}
        >
          {t("choose")}
        </button>
      </fieldset>
    );
  const parts = calendarParts(value || dateKey(new Date()), calendar);
  const currentYear = calendarParts(dateKey(new Date()), calendar).year;
  const range = monthBounds(
    `${parts.year}-${String(parts.month).padStart(2, "0")}`,
    calendar,
  );
  const days = Math.round(
    (Date.parse(range.to) - Date.parse(range.from)) / 86400000,
  );
  const change = (key: "year" | "month" | "day", n: number) => {
    const next = { ...parts, [key]: n };
    const bounds = monthBounds(
      `${next.year}-${String(next.month).padStart(2, "0")}`,
      calendar,
    );
    const maxDay = Math.round(
      (Date.parse(bounds.to) - Date.parse(bounds.from)) / 86400000,
    );
    onChange(
      calendarDate(next.year, next.month, Math.min(next.day, maxDay), calendar),
    );
  };
  return (
    <fieldset className="date-field">
      <legend className="field-label">{label}</legend>
      <div className="date-selects">
        <select
          aria-label={`${label} — ${t("day")}`}
          value={parts.day}
          onChange={(e) => change("day", Number(e.target.value))}
        >
          {Array.from({ length: days }, (_, i) => i + 1).map((d) => (
            <option key={d} value={d}>
              {num(d, locale)}
            </option>
          ))}
        </select>
        <select
          aria-label={`${label} — ${t("month")}`}
          value={parts.month}
          onChange={(e) => change("month", Number(e.target.value))}
        >
          {monthNames(locale).map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
        <select
          aria-label={`${label} — ${t("year")}`}
          value={parts.year}
          onChange={(e) => change("year", Number(e.target.value))}
        >
          {Array.from({ length: 50 }, (_, i) => currentYear + 1 - i).map(
            (y) => (
              <option key={y} value={y}>
                {String(y)}
              </option>
            ),
          )}
        </select>
      </div>
    </fieldset>
  );
}
export function TimeField({
  label,
  value,
  onChange,
  fixedMinute = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  fixedMinute?: boolean;
}) {
  const { t, locale } = useI18n();
  const [h, m] = value.split(":").map(Number);
  const hour = h % 12 || 12;
  const change = (a: number, b: number, pm: boolean) =>
    onChange(
      `${String((a % 12) + (pm ? 12 : 0)).padStart(2, "0")}:${String(b).padStart(2, "0")}`,
    );
  return (
    <Field label={label}>
      <div className="time-selects">
        <select
          aria-label={`${label} — ${t("hours")}`}
          value={hour}
          onChange={(e) => change(Number(e.target.value), m, h >= 12)}
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {num(n, locale)}
            </option>
          ))}
        </select>
        <select
          aria-label={`${label} — ${locale === "fa" ? "دقیقه" : "Minutes"}`}
          disabled={fixedMinute}
          value={m}
          onChange={(e) => change(hour, Number(e.target.value), h >= 12)}
        >
          {Array.from({ length: 60 }, (_, i) => i).map((n) => (
            <option key={n} value={n}>
              {num(n, locale).padStart(2, locale === "fa" ? "۰" : "0")}
            </option>
          ))}
        </select>
        <select
          aria-label={`${label} — AM/PM`}
          value={h >= 12 ? "pm" : "am"}
          onChange={(e) => change(hour, m, e.target.value === "pm")}
        >
          <option value="am">{t("am")}</option>
          <option value="pm">{t("pm")}</option>
        </select>
      </div>
    </Field>
  );
}
