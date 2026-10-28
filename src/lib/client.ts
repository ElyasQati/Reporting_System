import type { Locale } from "./types";
export class RequestError extends Error {
  constructor(
    public code: string,
    public status: number,
  ) {
    super(code);
  }
}
export async function request<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  const data = await response
    .json()
    .catch(() => ({ error: "SERVER_UNAVAILABLE" }));
  if (!response.ok) {
    if (response.status === 401 && data.error === "UNAUTHORIZED")
      window.dispatchEvent(new Event("session-expired"));
    throw new RequestError(data.error || "SERVER_UNAVAILABLE", response.status);
  }
  if (
    (url === "/api/auth" || url === "/api/auth/email/verify") &&
    options?.method &&
    options.method !== "GET"
  ) {
    try {
      localStorage.setItem("report-desk-auth-change", crypto.randomUUID());
    } catch {
      /* Storage may be disabled. */
    }
  }
  return data as T;
}
export function num(
  value: number | null | undefined,
  locale: Locale,
  decimals = 0,
) {
  return value == null
    ? "—"
    : new Intl.NumberFormat(locale === "fa" ? "fa-AF" : "en-US", {
        maximumFractionDigits: decimals,
        minimumFractionDigits: decimals,
      }).format(value);
}
export function displayDate(
  day: string | null,
  locale: Locale,
  options?: Intl.DateTimeFormatOptions,
) {
  if (!day) return "—";
  return new Intl.DateTimeFormat(
    locale === "fa" ? "fa-AF-u-ca-persian" : "en-US-u-ca-gregory",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
      ...options,
    },
  ).format(new Date(day.slice(0, 10) + "T12:00:00Z"));
}
export function displayTime(time: string | null, locale: Locale) {
  if (!time) return "—";
  return new Intl.DateTimeFormat(locale === "fa" ? "fa-AF" : "en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }).format(new Date(`2000-01-01T${time}:00Z`));
}
