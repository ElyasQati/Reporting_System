import { describe, it, expect } from "vitest";
import {
  calendarDate,
  calendarParts,
  closedWeeks,
  dateKey,
  deadline,
  defaultSettings,
  monthBounds,
  weekStart,
} from "../src/lib/dates";
describe("Reporting calendar", () => {
  it("separates the same month in different years", () => {
    expect(monthBounds("2025-06")).toEqual({
      from: "2025-06-01",
      to: "2025-07-01",
    });
    expect(monthBounds("2026-06")).toEqual({
      from: "2026-06-01",
      to: "2026-07-01",
    });
    expect(monthBounds("2026-12").to).toBe("2027-01-01");
  });
  it("converts Nowruz and Persian leap months without changing the canonical date", () => {
    expect(calendarDate(1404, 1, 1, "persian")).toBe("2025-03-21");
    expect(calendarDate(1403, 12, 30, "persian")).toBe("2025-03-20");
    expect(calendarParts("2025-03-21", "persian")).toEqual({
      year: 1404,
      month: 1,
      day: 1,
    });
    expect(monthBounds("1403-12", "persian")).toEqual({
      from: "2025-02-19",
      to: "2025-03-21",
    });
    expect(() => calendarDate(1404, 12, 30, "persian")).toThrow("INVALID_DATE");
  });
  it("keeps Friday through Thursday in the same week across a year boundary", () => {
    expect(weekStart("2026-01-01", 5)).toBe("2025-12-26");
    expect(weekStart("2026-01-02", 5)).toBe("2026-01-02");
    expect(weekStart("2026-10-24", 5)).toBe("2026-10-23");
  });
  it("closes the week only after Thursday 11:59 PM in Kabul", () => {
    expect(deadline("2026-10-16", defaultSettings).toISOString()).toBe(
      "2026-10-22T19:29:59.999Z",
    );
    const before = closedWeeks(
      defaultSettings,
      new Date("2026-10-22T19:29:59Z"),
    );
    const after = closedWeeks(
      defaultSettings,
      new Date("2026-10-22T19:30:00Z"),
    );
    expect(before.at(-1)).toBe("2026-10-09");
    expect(after.at(-1)).toBe("2026-10-16");
    expect(dateKey(new Date("2026-10-22T20:00:00Z"))).toBe("2026-10-23");
  });
});
