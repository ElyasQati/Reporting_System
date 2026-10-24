import { NextResponse } from "next/server";
import { z } from "zod";
import { api, ApiError, body } from "@/lib/http";
import { workspaceCollections } from "@/lib/workspace";
import { randomUUID } from "node:crypto";
import {
  classSchema,
  curriculumSchema,
  personSchema,
  settingsSchema,
} from "@/lib/validation";
import { validDate, weekStart } from "@/lib/dates";
const base = z.object({
  _id: z.uuid(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  archivedAt: z.iso.datetime().nullable(),
});
const report = z
  .object({
    classId: z.uuid(),
    curriculumId: z.uuid(),
    topicIds: z.array(z.uuid()),
    lesson: z.string().max(2000),
    totalStudents: z.number().int().min(0),
    present: z.number().int().min(0),
    reportDate: z.string().refine(validDate).nullable(),
    weekStart: z.string().refine(validDate).nullable(),
    submittedAt: z.union([z.iso.datetime(), z.literal("")]),
    teacherId: z.uuid(),
    supervisorId: z.uuid(),
    className: z.string(),
    teacherName: z.string(),
    supervisorName: z.string(),
    legacy: z
      .object({
        id: z.number(),
        month: z.string(),
        week: z.number(),
        monthWeek: z.number(),
      })
      .optional(),
  })
  .refine((r) => r.present <= r.totalStudents);
const backupSchema = z.object({
  version: z.literal(2),
  classes: z
    .array(
      base.extend(classSchema.shape).extend({
        startedOn: z.string().refine(validDate).nullable(),
        startTime: z
          .string()
          .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
          .nullable(),
        endTime: z
          .string()
          .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
          .nullable(),
        legacySchedule: z.string().optional(),
        assignments: z
          .array(
            z.object({
              teacherId: z.uuid(),
              supervisorId: z.uuid(),
              effectiveOn: z.string().refine(validDate),
            }),
          )
          .optional(),
      }),
    )
    .max(10000),
  people: z.array(base.extend(personSchema.shape)).max(10000),
  curricula: z.array(base.extend(curriculumSchema.shape)).max(10000),
  reports: z.array(base.extend(report.shape)).max(50000),
  settings: settingsSchema,
});
export const POST = api(async (request, user) => {
  const data = backupSchema.parse(await body(request, 50_000_000));
  const c = await workspaceCollections(user._id);
  if (
    (await c.classes.countDocuments()) +
    (await c.people.countDocuments()) +
    (await c.curricula.countDocuments()) +
    (await c.reports.countDocuments())
  )
    throw new ApiError("WORKSPACE_NOT_EMPTY", 409);
  for (const rows of [data.classes, data.people, data.curricula, data.reports])
    if (new Set(rows.map((r) => r._id)).size !== rows.length)
      throw new ApiError("INVALID_BACKUP");
  const people = new Map(data.people.map((p) => [p._id, p]));
  const classes = new Map(data.classes.map((p) => [p._id, p]));
  const curricula = new Map(data.curricula.map((p) => [p._id, p]));
  if (
    data.classes.some(
      (row) =>
        people.get(row.teacherId)?.kind !== "teacher" ||
        people.get(row.supervisorId)?.kind !== "supervisor" ||
        (row.endTime && row.startTime && row.endTime <= row.startTime),
    )
  )
    throw new ApiError("INVALID_BACKUP");
  if (data.curricula.some((row) => !curriculumSchema.safeParse(row).success))
    throw new ApiError("INVALID_BACKUP");
  if (
    data.reports.some(
      (row) =>
        !classes.has(row.classId) ||
        !curricula.has(row.curriculumId) ||
        row.topicIds.some(
          (id) =>
            !curricula.get(row.curriculumId)!.topics.some((t) => t.id === id),
        ) ||
        !report.safeParse(row).success ||
        (row.reportDate
          ? row.weekStart !==
            weekStart(row.reportDate, data.settings.weekStartsOn)
          : row.weekStart !== null),
    )
  )
    throw new ApiError("INVALID_BACKUP");
  // IDs in a portable backup may already exist in another account. Remap every
  // document/reference so restoring a copy cannot collide with its source owner.
  const identifiers = new Map(
    [...data.people, ...data.classes, ...data.curricula, ...data.reports].map(
      (row) => [row._id, randomUUID()],
    ),
  );
  const remap = (id: string) => {
    const next = identifiers.get(id);
    if (!next) throw new ApiError("INVALID_BACKUP");
    return next;
  };
  const restoredPeople = data.people.map((row) => ({
    ...row,
    _id: remap(row._id),
  }));
  const restoredCurricula = data.curricula.map((row) => ({
    ...row,
    _id: remap(row._id),
  }));
  const restoredClasses = data.classes.map((row) => ({
    ...row,
    _id: remap(row._id),
    teacherId: remap(row.teacherId),
    supervisorId: remap(row.supervisorId),
    assignments: row.assignments?.map((assignment) => ({
      ...assignment,
      teacherId: remap(assignment.teacherId),
      supervisorId: remap(assignment.supervisorId),
    })),
  }));
  const restoredReports = data.reports.map((row) => ({
    ...row,
    _id: remap(row._id),
    classId: remap(row.classId),
    curriculumId: remap(row.curriculumId),
    teacherId: remap(row.teacherId),
    supervisorId: remap(row.supervisorId),
  }));
  const client = await global.mongoConnection!;
  await client.withSession((session) =>
    session.withTransaction(async () => {
      // Serialize restores in this workspace; another owner's settings are never touched.
      await c.settings.updateOne(
        { _id: user._id },
        { $set: data.settings },
        { upsert: true, session },
      );
      if (
        (await c.classes.countDocuments({}, { session })) +
        (await c.people.countDocuments({}, { session })) +
        (await c.curricula.countDocuments({}, { session })) +
        (await c.reports.countDocuments({}, { session }))
      )
        throw new ApiError("WORKSPACE_NOT_EMPTY", 409);
      if (restoredPeople.length)
        await c.people.insertMany(restoredPeople, { session });
      if (restoredClasses.length)
        await c.classes.insertMany(restoredClasses, { session });
      if (restoredCurricula.length)
        await c.curricula.insertMany(restoredCurricula, { session });
      if (restoredReports.length)
        await c.reports.insertMany(restoredReports, { session });
    }),
  );
  return NextResponse.json({ ok: true });
}, true);
