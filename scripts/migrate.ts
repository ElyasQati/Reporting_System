import nextEnv from "@next/env";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { collections, ensureIndexes } from "../src/lib/db";
import { parseLegacySql } from "../src/lib/legacy-sql";
import type { Curriculum, Person, Report, SchoolClass } from "../src/lib/types";
import { defaultSettings, validDate, weekStart } from "../src/lib/dates";
import { workspaceCollections } from "../src/lib/workspace";
nextEnv.loadEnvConfig(process.cwd());
async function migrate() {
  const filename = process.argv[2];
  if (!filename)
    throw new Error('Usage: npm run migrate -- "E:/gozaresh_db.sql" [--apply]');
  const tables = parseLegacySql(await readFile(filename, "utf8"));
  const now = new Date().toISOString();
  const base = () => ({
    _id: randomUUID(),
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
  });
  const people: Person[] = [];
  const classes: SchoolClass[] = [];
  const curricula: Curriculum[] = [];
  const reports: Report[] = [];
  const staff = (name: string, kind: "teacher" | "supervisor") => {
    let p = people.find((p) => p.kind === kind && p.name === name);
    if (!p) {
      p = { ...base(), kind, name, phone: "", email: "", active: true };
      people.push(p);
    }
    return p;
  };
  const classMap = new Map<number, SchoolClass>();
  for (const row of tables.classes ?? []) {
    const teacher = staff(
      String(row.ostad_senf || "نام استاد ثبت نشده"),
      "teacher",
    );
    const supervisor = staff(
      String(row.negaran_senf || "نام نگران ثبت نشده"),
      "supervisor",
    );
    const oldReports = (tables.reports ?? []).filter(
      (r) => r.class_id === row.class_id,
    );
    const latest = [...oldReports].sort(
      (a, b) => Number(b.report_id) - Number(a.report_id),
    )[0];
    const times =
      String(row.time_senf || "").match(/\b([0-2]?\d:[0-5]\d)\b/g) ?? [];
    const normalize = (value: string | undefined) =>
      value && /^([01]?\d|2[0-3]):[0-5]\d$/.test(value)
        ? value.padStart(5, "0")
        : null;
    const knownDates = oldReports
      .map((r) => r.report_date)
      .filter((d): d is string => typeof d === "string" && validDate(d))
      .sort();
    const item: SchoolClass = {
      ...base(),
      number: String(row.shomara),
      name: String(row.nam_senf),
      teacherId: teacher._id,
      supervisorId: supervisor._id,
      location: String(row.mahal_dars || ""),
      startTime: normalize(times[0]),
      endTime: normalize(times[1]),
      legacySchedule: String(row.time_senf || ""),
      studentCount: Number(latest?.tedad_shagerdan ?? 0),
      startedOn: knownDates[0] ?? null,
    };
    classes.push(item);
    classMap.set(Number(row.class_id), item);
  }
  for (const row of tables.curricula ?? [])
    curricula.push({
      ...base(),
      name: String(row.name),
      pages: Number(row.pages),
      topics: [],
    });
  for (const row of tables.reports ?? []) {
    const schoolClass = classMap.get(Number(row.class_id));
    if (!schoolClass)
      throw new Error("A legacy report refers to a missing class.");
    let curriculum = curricula.find((c) => c.name === row.nesab);
    if (!curriculum) {
      curriculum = {
        ...base(),
        name: String(row.nesab || "نصاب نامشخص"),
        pages: 1,
        topics: [],
      };
      curricula.push(curriculum);
    }
    const reportDate =
      typeof row.report_date === "string" && validDate(row.report_date)
        ? row.report_date
        : null;
    reports.push({
      ...base(),
      classId: schoolClass._id,
      curriculumId: curriculum._id,
      topicIds: [],
      lesson: String(row.onvan_dars || ""),
      totalStudents: Number(row.tedad_shagerdan),
      present: Number(row.hazeran),
      reportDate,
      weekStart: reportDate
        ? weekStart(reportDate, defaultSettings.weekStartsOn)
        : null,
      submittedAt: "",
      className: schoolClass.name,
      teacherId: schoolClass.teacherId,
      supervisorId: schoolClass.supervisorId,
      teacherName: people.find((p) => p._id === schoolClass.teacherId)!.name,
      supervisorName: people.find((p) => p._id === schoolClass.supervisorId)!
        .name,
      legacy: {
        id: Number(row.report_id),
        month: String(row.month ?? ""),
        week: Number(row.hafta ?? 0),
        monthWeek: Number(row.month_week ?? 0),
      },
    });
  }
  console.log(
    `Migration preview: ${classes.length} classes, ${people.length} people, ${curricula.length} curricula, ${reports.length} reports.`,
  );
  console.log(
    `${reports.filter((r) => !r.reportDate).length} reports have no known date and will be excluded from dated statistics. Class start dates and ambiguous times must be reviewed.`,
  );
  if (!process.argv.includes("--apply")) {
    console.log("Dry run only. Add --apply to import into an empty workspace.");
    return;
  }
  await ensureIndexes();
  const username =
    process.argv
      .find((argument) => argument.startsWith("--username="))
      ?.slice(11) ||
    process.env.ADMIN_USERNAME ||
    "admin";
  const user = await (
    await collections()
  ).users.findOne(
    { username, active: true },
    { collation: { locale: "en", strength: 2 } },
  );
  if (!user)
    throw new Error(
      "The target account must exist before importing legacy data.",
    );
  const c = await workspaceCollections(user._id);
  const settings = await c.settings.findOne({ _id: user._id });
  for (const report of reports)
    report.weekStart = report.reportDate
      ? weekStart(
          report.reportDate,
          settings?.weekStartsOn ?? defaultSettings.weekStartsOn,
        )
      : null;
  if (
    (await c.classes.countDocuments()) +
    (await c.reports.countDocuments()) +
    (await c.people.countDocuments()) +
    (await c.curricula.countDocuments())
  )
    throw new Error("The destination workspace must be empty.");
  const client = await global.mongoConnection!;
  await client.withSession((session) =>
    session.withTransaction(async () => {
      if (people.length) await c.people.insertMany(people, { session });
      if (classes.length) await c.classes.insertMany(classes, { session });
      if (curricula.length)
        await c.curricula.insertMany(curricula, { session });
      if (reports.length) await c.reports.insertMany(reports, { session });
    }),
  );
  console.log(
    "Legacy data imported. No year or submission time was invented for old reports.",
  );
}
migrate()
  .catch((error) => {
    console.error(
      "Migration failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    if (global.mongoConnection) await (await global.mongoConnection).close();
  });
