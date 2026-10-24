import { closedWeeks, dateKey, deadline, shiftDate } from "./dates";
import type {
  Person,
  PersonStats,
  Report,
  SchoolClass,
  Settings,
} from "./types";
export function attendance(reports: Report[]) {
  const total = reports.reduce((s, r) => s + r.totalStudents, 0);
  return total
    ? (reports.reduce((s, r) => s + r.present, 0) / total) * 100
    : null;
}
export function summarize(reports: Report[], classes: SchoolClass[]) {
  const seats = reports.reduce((s, r) => s + r.totalStudents, 0);
  const present = reports.reduce((s, r) => s + r.present, 0);
  return {
    classes: classes.length,
    enrolled: classes.reduce((s, c) => s + c.studentCount, 0),
    reports: reports.length,
    seats,
    present,
    absent: seats - present,
    attendance: seats ? (present / seats) * 100 : null,
  };
}
export function rankPeople(
  people: Person[],
  classes: SchoolClass[],
  reports: Report[],
  settings: Settings,
  now = new Date(),
): PersonStats[] {
  const weeks = closedWeeks(settings, now);
  const snapshots = new Map(
    reports
      .filter((r) => !r.archivedAt && r.weekStart)
      .map((r) => [`${r.classId}|${r.weekStart}`, r]),
  );
  const expectedByOwner = new Map<string, number>();
  const eligiblePairs = new Set<string>();
  const currentClasses = new Map<string, SchoolClass[]>();
  for (const c of classes) {
    if (!c.archivedAt)
      for (const kind of ["teacher", "supervisor"] as const) {
        const key = `${kind}|${c[kind === "teacher" ? "teacherId" : "supervisorId"]}`;
        currentClasses.set(key, [...(currentClasses.get(key) ?? []), c]);
      }
    const registered = dateKey(new Date(c.createdAt), settings.timezone);
    const archived = c.archivedAt
      ? dateKey(new Date(c.archivedAt), settings.timezone)
      : null;
    for (const week of weeks) {
      const end = shiftDate(week, 6);
      if (
        !c.startedOn ||
        c.startedOn > end ||
        registered > end ||
        (archived && archived < week)
      )
        continue;
      eligiblePairs.add(`${c._id}|${week}`);
      const owner =
        snapshots.get(`${c._id}|${week}`) ??
        [...(c.assignments ?? [])]
          .reverse()
          .find((a) => a.effectiveOn <= end) ??
        c;
      for (const kind of ["teacher", "supervisor"] as const) {
        const key = `${kind}|${owner[kind === "teacher" ? "teacherId" : "supervisorId"]}|${week}`;
        expectedByOwner.set(key, (expectedByOwner.get(key) ?? 0) + 1);
      }
    }
  }
  const reportsByOwner = new Map<string, Report[]>();
  for (const report of reports) {
    if (
      report.archivedAt ||
      !report.weekStart ||
      !eligiblePairs.has(`${report.classId}|${report.weekStart}`)
    )
      continue;
    for (const kind of ["teacher", "supervisor"] as const) {
      const key = `${kind}|${report[kind === "teacher" ? "teacherId" : "supervisorId"]}`;
      reportsByOwner.set(key, [...(reportsByOwner.get(key) ?? []), report]);
    }
  }
  return people
    .map((person) => {
      const ownerKey = `${person.kind}|${person._id}`;
      const ownClasses = currentClasses.get(ownerKey) ?? [];
      // Historical report ownership comes from the immutable report snapshot.
      const ownReports = reportsByOwner.get(ownerKey) ?? [];
      const weekly = weeks.map((week) => {
        const rows = ownReports.filter((r) => r.weekStart === week);
        return {
          week,
          attendance: attendance(rows),
          submitted: new Set(rows.map((r) => r.classId)).size,
          expected: expectedByOwner.get(`${ownerKey}|${week}`) ?? 0,
        };
      });
      const expected = weekly.reduce((s, w) => s + w.expected, 0);
      const onTime = ownReports.filter(
        (r) =>
          r.weekStart &&
          r.submittedAt &&
          new Date(r.submittedAt) <= deadline(r.weekStart, settings),
      ).length;
      const rates = weekly
        .map((w) => w.attendance)
        .filter((v): v is number => v !== null);
      const average = attendance(ownReports);
      const stability =
        rates.length > 1
          ? Math.max(
              0,
              100 -
                rates
                  .slice(1)
                  .reduce((s, n, i) => s + Math.abs(n - rates[i]), 0) /
                  (rates.length - 1),
            )
          : null;
      const totalWeight =
        settings.weights.timeliness +
        settings.weights.attendance +
        settings.weights.stability;
      // Missing weeks earn no credit; one isolated report must not outrank sustained reporting.
      const coverage = expected ? Math.min(1, ownReports.length / expected) : 0;
      const score =
        expected && totalWeight
          ? (Math.min(1, onTime / expected) *
              100 *
              settings.weights.timeliness +
              (average ?? 0) * coverage * settings.weights.attendance +
              (stability ?? 0) * coverage * settings.weights.stability) /
            totalWeight
          : null;
      return {
        person,
        classes: ownClasses.length,
        students: ownClasses.reduce((s, c) => s + c.studentCount, 0),
        reports: ownReports.length,
        expected,
        onTime,
        attendance: average,
        stability,
        score,
        weekly,
      };
    })
    .sort(
      (a, b) =>
        Number(b.person.active && b.classes > 0) -
          Number(a.person.active && a.classes > 0) ||
        Number(b.person.active) - Number(a.person.active) ||
        (b.score ?? -1) - (a.score ?? -1) ||
        b.reports - a.reports ||
        a.person.name.localeCompare(b.person.name),
    );
}
