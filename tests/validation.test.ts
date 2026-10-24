import { describe, it, expect } from "vitest";
import {
  curriculumSchema,
  reportSchema,
  settingsSchema,
} from "../src/lib/validation";
import { defaultSettings } from "../src/lib/dates";
import { parseLegacySql } from "../src/lib/legacy-sql";
const id = "84356d43-a2b5-4f63-8a82-9a2bd38cb28f";
describe("Domain input validation", () => {
  it("accepts a fully absent class and rejects impossible or fractional counts", () => {
    const data = {
      classId: id,
      curriculumId: id,
      topicIds: [],
      lesson: "Lesson",
      totalStudents: 20,
      present: 0,
      reportDate: "2026-10-24",
    };
    expect(reportSchema.safeParse(data).success).toBe(true);
    expect(reportSchema.safeParse({ ...data, present: 21 }).success).toBe(
      false,
    );
    expect(reportSchema.safeParse({ ...data, present: -1 }).success).toBe(
      false,
    );
    expect(reportSchema.safeParse({ ...data, present: 1.5 }).success).toBe(
      false,
    );
    expect(
      reportSchema.safeParse({ ...data, reportDate: "2026-02-30" }).success,
    ).toBe(false);
  });
  it("rejects lesson page ranges outside the book", () => {
    expect(
      curriculumSchema.safeParse({
        name: "Book",
        pages: 100,
        topics: [{ id, title: "Lesson", startPage: 80, endPage: 101 }],
      }).success,
    ).toBe(false);
    expect(
      curriculumSchema.safeParse({
        name: "Book",
        pages: 100,
        topics: [{ id, title: "Lesson", startPage: 1, endPage: 10 }],
      }).success,
    ).toBe(true);
  });
  it("requires an explicit 100 percent ranking formula", () => {
    expect(settingsSchema.safeParse(defaultSettings).success).toBe(true);
    expect(
      settingsSchema.safeParse({
        ...defaultSettings,
        weights: { timeliness: 70, attendance: 50, stability: 15 },
      }).success,
    ).toBe(false);
  });
  it("reads Unicode SQL data as data without executing SQL statements", () => {
    const sql =
      "DROP TABLE users; INSERT INTO `reports` (`report_id`,`onvan_dars`,`report_date`) VALUES (1,'درس, اول; ادامه',NULL),(2,'Teacher\\'s lesson','2026-10-24');";
    const data = parseLegacySql(sql);
    expect(data.reports[0]).toEqual({
      report_id: 1,
      onvan_dars: "درس, اول; ادامه",
      report_date: null,
    });
    expect(data.reports[1].onvan_dars).toBe("Teacher's lesson");
    expect(data.users).toBeUndefined();
  });
});
