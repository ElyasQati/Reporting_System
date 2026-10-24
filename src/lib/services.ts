import { randomUUID } from "node:crypto";
import { workspaceCollections, initialSettings } from "./workspace";
import { ApiError } from "./errors";
import {
  classSchema,
  curriculumSchema,
  personSchema,
  reportSchema,
} from "./validation";
import { dateKey, weekStart } from "./dates";
import type { Base, SchoolClass } from "./types";
export function base(): Base {
  const now = new Date().toISOString();
  return {
    _id: randomUUID(),
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
  };
}
export const entities = ["classes", "people", "curricula", "reports"] as const;
export type Entity = (typeof entities)[number];
export async function saveEntity(
  ownerId: string,
  entity: Entity,
  input: unknown,
  id?: string,
) {
  const c = await workspaceCollections(ownerId);
  const old = id ? await c.collection(entity).findOne({ _id: id }) : null;
  if (id && !old) throw new ApiError("NOT_FOUND", 404);
  if (old?.archivedAt) throw new ApiError("RESTORE_BEFORE_EDIT", 409);
  let data: object;
  if (entity === "people") {
    const parsed = personSchema.parse(input);
    if (old && parsed.kind !== old.kind)
      throw new ApiError("PERSON_KIND_IMMUTABLE");
    if (
      !parsed.active &&
      (await c.classes.countDocuments({
        archivedAt: null,
        $or: [{ teacherId: id }, { supervisorId: id }],
      }))
    )
      throw new ApiError("PERSON_HAS_CLASSES", 409);
    data = parsed;
  } else if (entity === "classes") {
    const parsed = classSchema.parse(input);
    const [teacher, supervisor] = await Promise.all([
      c.people.findOne({
        _id: parsed.teacherId,
        kind: "teacher",
        active: true,
        archivedAt: null,
      }),
      c.people.findOne({
        _id: parsed.supervisorId,
        kind: "supervisor",
        active: true,
        archivedAt: null,
      }),
    ]);
    if (!teacher || !supervisor) throw new ApiError("INVALID_STAFF");
    const history = old?.assignments ?? [];
    if (old && !history.length && old.startedOn)
      history.push({
        teacherId: old.teacherId,
        supervisorId: old.supervisorId,
        effectiveOn: old.startedOn,
      });
    if (
      !old ||
      old.teacherId !== parsed.teacherId ||
      old.supervisorId !== parsed.supervisorId
    ) {
      history.push({
        teacherId: parsed.teacherId,
        supervisorId: parsed.supervisorId,
        effectiveOn: old ? dateKey(new Date()) : parsed.startedOn,
      });
    }
    if (
      old?.startedOn &&
      old.startedOn !== parsed.startedOn &&
      (await c.reports.countDocuments({
        classId: id,
        reportDate: { $ne: null },
      }))
    )
      throw new ApiError("START_DATE_HAS_REPORTS", 409);
    data = { ...parsed, assignments: history };
  } else if (entity === "curricula") {
    const parsed = curriculumSchema.parse(input);
    if (old) {
      const removed = (old.topics ?? []).filter(
        (topic: { id: string }) =>
          !parsed.topics.some((t) => t.id === topic.id),
      );
      if (
        removed.length &&
        (await c.reports.countDocuments({
          curriculumId: id,
          topicIds: { $in: removed.map((t: { id: string }) => t.id) },
        }))
      )
        throw new ApiError("TOPIC_IN_USE", 409);
    }
    data = parsed;
  } else {
    const parsed = reportSchema.parse(input);
    const settings =
      (await c.settings.findOne({ _id: ownerId })) ?? initialSettings(ownerId);
    if (parsed.reportDate > dateKey(new Date(), settings.timezone))
      throw new ApiError("FUTURE_REPORT_DATE");
    const [schoolClass, curriculum] = await Promise.all([
      c.classes.findOne({ _id: parsed.classId, archivedAt: null }),
      c.curricula.findOne({ _id: parsed.curriculumId, archivedAt: null }),
    ]);
    if (!schoolClass || !curriculum) throw new ApiError("INVALID_REFERENCE");
    if (!schoolClass.startedOn) throw new ApiError("CLASS_START_UNKNOWN");
    if (parsed.reportDate < schoolClass.startedOn)
      throw new ApiError("BEFORE_CLASS_START");
    if (
      parsed.topicIds.some(
        (topicId) => !curriculum.topics.some((t) => t.id === topicId),
      )
    )
      throw new ApiError("INVALID_TOPIC");
    const assignment =
      [...(schoolClass.assignments ?? [])]
        .reverse()
        .find((a) => a.effectiveOn <= parsed.reportDate) ?? schoolClass;
    if (
      old?.weekStart &&
      (old.classId !== parsed.classId ||
        old.weekStart !== weekStart(parsed.reportDate, settings.weekStartsOn))
    )
      throw new ApiError("REPORT_WEEK_IMMUTABLE", 409);
    const [teacher, supervisor] = await Promise.all([
      c.people.findOne({ _id: assignment.teacherId }),
      c.people.findOne({ _id: assignment.supervisorId }),
    ]);
    data = {
      ...parsed,
      weekStart: weekStart(parsed.reportDate, settings.weekStartsOn),
      submittedAt: old?.submittedAt ?? new Date().toISOString(),
      className: old?.className ?? schoolClass.name,
      teacherId: old?.teacherId ?? assignment.teacherId,
      supervisorId: old?.supervisorId ?? assignment.supervisorId,
      teacherName: old?.teacherName ?? teacher?.name ?? "",
      supervisorName: old?.supervisorName ?? supervisor?.name ?? "",
    };
  }
  if (id) {
    await c
      .collection(entity)
      .updateOne(
        { _id: id as never },
        { $set: { ...data, updatedAt: new Date().toISOString() } },
      );
    return { _id: id };
  }
  const record = { ...base(), ...data };
  await c.collection(entity).insertOne(record as never);
  return { _id: record._id };
}
export async function archiveEntity(
  ownerId: string,
  entity: Entity,
  id: string,
  action: "archive" | "restore" | "delete",
) {
  const c = await workspaceCollections(ownerId);
  const collection = c.collection(entity);
  const row = await collection.findOne({ _id: id as never });
  if (!row) throw new ApiError("NOT_FOUND", 404);
  if (
    entity === "people" &&
    (await c.classes.countDocuments({
      ...(action === "delete" ? {} : { archivedAt: null }),
      $or: [{ teacherId: id }, { supervisorId: id }],
    }))
  )
    throw new ApiError("PERSON_HAS_CLASSES", 409);
  if (
    entity === "people" &&
    action === "delete" &&
    ((await c.reports.countDocuments({
      $or: [{ teacherId: id }, { supervisorId: id }],
    })) ||
      (await c.classes.countDocuments({
        $or: [
          { "assignments.teacherId": id },
          { "assignments.supervisorId": id },
        ],
      })))
  )
    throw new ApiError("PERSON_HAS_CLASSES", 409);
  if (
    entity === "curricula" &&
    (await c.reports.countDocuments({ curriculumId: id }))
  )
    throw new ApiError("CURRICULUM_IN_USE", 409);
  if (entity === "reports" && action === "restore") {
    const schoolClass = await c.classes.findOne({ _id: row.classId });
    if (schoolClass?.archivedAt) throw new ApiError("RESTORE_CLASS_FIRST", 409);
  }
  if (entity === "classes" && action === "restore") {
    const active = await c.people.countDocuments({
      _id: { $in: [row.teacherId, row.supervisorId] },
      active: true,
      archivedAt: null,
    });
    if (active !== 2) throw new ApiError("INVALID_STAFF");
  }
  if (action === "delete") {
    const inherited =
      entity === "reports" &&
      Boolean((await c.classes.findOne({ _id: row.classId }))?.archivedAt);
    if (!row.archivedAt && !inherited)
      throw new ApiError("ARCHIVE_BEFORE_DELETE", 409);
    if (entity === "classes") {
      const client = await global.mongoConnection!;
      await client.withSession((session) =>
        session.withTransaction(async () => {
          await c.reports.deleteMany({ classId: id }, { session });
          await c.classes.deleteOne({ _id: id }, { session });
        }),
      );
    } else await collection.deleteOne({ _id: id as never });
  } else {
    // A class archive is inherited by its reports; a single-document write is atomic.
    await collection.updateOne(
      { _id: id as never },
      {
        $set: {
          archivedAt: action === "archive" ? new Date().toISOString() : null,
          updatedAt: new Date().toISOString(),
        },
      },
    );
  }
}
export function assignmentAt(c: SchoolClass, day: string) {
  return (
    [...(c.assignments ?? [])].reverse().find((a) => a.effectiveOn <= day) ?? c
  );
}
