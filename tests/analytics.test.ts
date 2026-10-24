import { describe, it, expect } from "vitest";
import { attendance, rankPeople, summarize } from "../src/lib/analytics";
import { defaultSettings } from "../src/lib/dates";
import type { Person, Report, SchoolClass } from "../src/lib/types";
const base = {
  _id: "",
  createdAt: "2026-09-01T00:00:00Z",
  updatedAt: "2026-09-01T00:00:00Z",
  archivedAt: null,
};
const person = (id: string): Person => ({
  ...base,
  _id: id,
  name: id,
  kind: "supervisor",
  phone: "",
  email: "",
  active: true,
});
const schoolClass = (id: string, supervisorId: string): SchoolClass => ({
  ...base,
  _id: id,
  number: id,
  name: id,
  teacherId: "t",
  supervisorId,
  studentCount: 30,
  startedOn: "2026-09-01",
  location: "Kabul",
  startTime: "08:00",
  endTime: "09:00",
});
const report = (
  id: string,
  classId: string,
  supervisorId: string,
  week: string,
  present = 30,
): Report => ({
  ...base,
  _id: id,
  classId,
  supervisorId,
  teacherId: "t",
  curriculumId: "book",
  topicIds: [],
  lesson: "Lesson",
  totalStudents: 30,
  present,
  reportDate: week,
  weekStart: week,
  submittedAt: `${week}T12:00:00Z`,
  className: classId,
  teacherName: "Teacher",
  supervisorName: supervisorId,
});
describe("Attendance and supervisor scoring", () => {
  it("distinguishes class enrollments from repeated attendance opportunities", () => {
    const c = schoolClass("class", "A");
    const reports = [
      report("r1", "class", "A", "2026-10-16", 25),
      report("r2", "class", "A", "2026-10-23", 30),
    ];
    const summary = summarize(reports, [c]);
    expect(summary.enrolled).toBe(30);
    expect(summary.seats).toBe(60);
    expect(summary.present).toBe(55);
    expect(summary.absent).toBe(5);
    expect(summary.attendance).toBeCloseTo(91.6667, 3);
  });
  it("weights attendance by the actual class size and preserves zero versus missing", () => {
    const a = report("a", "a", "A", "2026-10-16", 10);
    a.totalStudents = 10;
    const b = report("b", "b", "A", "2026-10-16", 0);
    b.totalStudents = 90;
    expect(attendance([a, b])).toBe(10);
    expect(attendance([])).toBeNull();
    expect(attendance([b])).toBe(0);
  });
  it("rewards sustained punctual reporting over one isolated perfect report", () => {
    const people = [person("A"), person("B")];
    const classes = [schoolClass("a", "A"), schoolClass("b", "B")];
    const reports = [
      report("a1", "a", "A", "2026-10-16"),
      report("a2", "a", "A", "2026-10-23"),
      report("b1", "b", "B", "2026-10-16"),
    ];
    const rows = rankPeople(
      people,
      classes,
      reports,
      { ...defaultSettings, rankingWeeks: 2 },
      new Date("2026-10-30T12:00:00Z"),
    );
    expect(rows[0].person._id).toBe("A");
    expect(rows[0].score).toBe(100);
    expect(rows[1].expected).toBe(2);
    expect(rows[1].score).toBeLessThan(50);
  });
  it("does not turn an empty history or an unknown legacy class start into a zero score", () => {
    const c = schoolClass("a", "A");
    c.startedOn = null;
    const row = rankPeople(
      [person("A")],
      [c],
      [],
      defaultSettings,
      new Date("2026-10-30T12:00:00Z"),
    )[0];
    expect(row.score).toBeNull();
  });
  it("keeps historical ownership after a current assignment changes", () => {
    const c = schoolClass("a", "B");
    c.assignments = [
      { teacherId: "t", supervisorId: "A", effectiveOn: "2026-09-01" },
      { teacherId: "t", supervisorId: "B", effectiveOn: "2026-10-30" },
    ];
    const rows = rankPeople(
      [person("A"), person("B")],
      [c],
      [report("r", "a", "A", "2026-10-23")],
      { ...defaultSettings, rankingWeeks: 2 },
      new Date("2026-10-30T12:00:00Z"),
    );
    expect(rows.find((r) => r.person._id === "A")?.expected).toBe(2);
    expect(rows.find((r) => r.person._id === "B")?.expected).toBe(0);
  });
});
