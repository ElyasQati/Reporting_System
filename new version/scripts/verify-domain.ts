import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { collections, ensureIndexes } from "../src/lib/db";
import {
  saveEntity as saveOwned,
  archiveEntity as archiveOwned,
  type Entity,
} from "../src/lib/services";
import { workspaceCollections, initialSettings } from "../src/lib/workspace";
import { dateKey, shiftDate } from "../src/lib/dates";
import { assignLegacyWorkspace } from "../src/lib/legacy-workspace";
import { base } from "../src/lib/services";
import { defaultSettings } from "../src/lib/dates";
// Run only against a fresh, explicitly isolated database.
process.env.MONGODB_DB = `report_desk_test_d_${randomUUID().slice(0, 12)}`;
export async function verifyDomain() {
  const ownerId = randomUUID();
  const saveEntity = (entity: Entity, input: unknown, id?: string) =>
    saveOwned(ownerId, entity, input, id);
  const archiveEntity = (
    entity: Entity,
    id: string,
    action: "archive" | "restore" | "delete",
  ) => archiveOwned(ownerId, entity, id, action);
  try {
    await ensureIndexes();
    const c = await workspaceCollections(ownerId);
    await c.settings.insertOne(initialSettings(ownerId));
    const teacher = await saveEntity("people", {
      kind: "teacher",
      name: "Integration teacher",
      phone: "",
      email: "",
      active: true,
    });
    const supervisor = await saveEntity("people", {
      kind: "supervisor",
      name: "Integration supervisor",
      phone: "",
      email: "",
      active: true,
    });
    const topicId = randomUUID();
    const curriculum = await saveEntity("curricula", {
      name: "Integration book",
      pages: 100,
      topics: [{ id: topicId, title: "Lesson", startPage: 1, endPage: 10 }],
    });
    const today = dateKey(new Date());
    const schoolClass = await saveEntity("classes", {
      number: "test-101",
      name: "Integration class",
      teacherId: teacher._id,
      supervisorId: supervisor._id,
      location: "Test",
      startTime: "14:00",
      endTime: "15:00",
      studentCount: 30,
      startedOn: shiftDate(today, -28),
    });
    const input = {
      classId: schoolClass._id,
      curriculumId: curriculum._id,
      topicIds: [topicId],
      lesson: "Lesson",
      totalStudents: 30,
      present: 27,
      reportDate: today,
    };
    const report = await saveEntity("reports", input);
    const original = await c.reports.findOne({ _id: report._id });
    assert.equal(original?.present, 27);
    await assert.rejects(
      () => saveEntity("reports", input),
      (error) =>
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === 11000,
    );
    await assert.rejects(() =>
      saveEntity("reports", { ...input, present: 31 }),
    );
    await assert.rejects(() =>
      saveEntity(
        "reports",
        { ...input, reportDate: shiftDate(today, -7) },
        report._id,
      ),
    );
    await saveEntity("reports", { ...input, present: 25 }, report._id);
    assert.equal(
      (await c.reports.findOne({ _id: report._id }))?.submittedAt,
      original?.submittedAt,
    );
    await assert.rejects(() =>
      archiveEntity("curricula", curriculum._id, "archive"),
    );
    await assert.rejects(() =>
      saveEntity(
        "curricula",
        { name: "Renamed book", pages: 100, topics: [] },
        curriculum._id,
      ),
    );
    await saveEntity(
      "curricula",
      {
        name: "Renamed book",
        pages: 100,
        topics: [{ id: topicId, title: "Lesson", startPage: 1, endPage: 10 }],
      },
      curriculum._id,
    );
    assert.equal(
      (await c.reports.findOne({ _id: report._id }))?.curriculumId,
      curriculum._id,
    );
    const otherOwner = randomUUID();
    const other = await workspaceCollections(otherOwner);
    assert.equal(await other.classes.countDocuments(), 0);
    assert.equal(await other.people.countDocuments(), 0);
    assert.equal(await other.curricula.countDocuments(), 0);
    assert.equal(await other.reports.countDocuments(), 0);
    assert.equal(
      await other.collection("reports").findOne({ _id: report._id }),
      null,
    );
    await assert.rejects(() =>
      saveOwned(otherOwner, "reports", { ...input, present: 1 }, report._id),
    );
    for (const action of ["archive", "restore", "delete"] as const)
      await assert.rejects(() =>
        archiveOwned(otherOwner, "classes", schoolClass._id, action),
      );
    await assert.rejects(() => saveOwned(otherOwner, "reports", input));
    const otherTeacher = await saveOwned(otherOwner, "people", {
      kind: "teacher",
      name: "Integration teacher",
      active: true,
      ownerId,
    });
    const otherSupervisor = await saveOwned(otherOwner, "people", {
      kind: "supervisor",
      name: "Integration supervisor",
      active: true,
    });
    assert.equal(
      (await other.people.findOne({ _id: otherTeacher._id }))?.ownerId,
      otherOwner,
    );
    const originalClass = await c.classes.findOne({ _id: schoolClass._id });
    const otherClass = await saveOwned(otherOwner, "classes", {
      ...originalClass,
      teacherId: otherTeacher._id,
      supervisorId: otherSupervisor._id,
    });
    const otherBook = await saveOwned(otherOwner, "curricula", {
      name: "Renamed book",
      pages: 100,
      topics: [],
    });
    await assert.rejects(() =>
      saveOwned(otherOwner, "reports", { ...input, classId: otherClass._id }),
    );
    await saveOwned(otherOwner, "reports", {
      ...input,
      classId: otherClass._id,
      curriculumId: otherBook._id,
      topicIds: [],
    });
    assert.equal(await other.reports.countDocuments(), 1);
    const raw = await collections();
    const legacyOwner = randomUUID();
    await raw.users.insertOne({
      ...base(),
      _id: legacyOwner,
      username: "legacy-owner",
      passwordHash: "not-used-by-domain-test",
      name: "Legacy owner",
      role: "admin",
      active: true,
    });
    const legacyPersonId = randomUUID();
    await raw.people.insertOne({
      ...base(),
      _id: legacyPersonId,
      name: "Legacy person",
      kind: "teacher",
      active: true,
      phone: "",
      email: "",
    });
    await raw.settings.insertOne({
      ...defaultSettings,
      organization: "Legacy organization",
    });
    assert.equal(await assignLegacyWorkspace(legacyOwner), 1);
    assert.equal(await assignLegacyWorkspace(legacyOwner), 0);
    const legacy = await workspaceCollections(legacyOwner);
    assert.equal(
      (await legacy.people.findOne({ _id: legacyPersonId }))?.name,
      "Legacy person",
    );
    assert.equal(
      (await legacy.settings.findOne({ _id: legacyOwner }))?.organization,
      "Legacy organization",
    );
    assert.equal(await c.people.countDocuments(), 2);
    assert.equal(
      (await c.settings.findOne({ _id: ownerId }))?.organization,
      defaultSettings.organization,
    );
    assert.equal(await c.people.countDocuments(), 2);
    await archiveEntity("classes", schoolClass._id, "archive");
    const extra = await c.reports.findOne({ _id: report._id });
    const extraId = randomUUID();
    await c.reports.insertOne({
      ...extra!,
      _id: extraId,
      weekStart: null,
      reportDate: null,
    });
    await archiveEntity("reports", extraId, "delete");
    assert.equal(await c.reports.findOne({ _id: extraId }), null);
    assert.ok((await c.classes.findOne({ _id: schoolClass._id }))?.archivedAt);
    assert.ok(await c.reports.findOne({ _id: report._id }));
    await archiveEntity("classes", schoolClass._id, "restore");
    assert.equal(
      (await c.classes.findOne({ _id: schoolClass._id }))?.archivedAt,
      null,
    );
    await archiveEntity("classes", schoolClass._id, "archive");
    await archiveEntity("classes", schoolClass._id, "delete");
    assert.equal(await c.reports.countDocuments(), 0);
    assert.equal(await other.reports.countDocuments(), 1);
    console.log(
      "MongoDB integration checks passed: owner isolation, cross-owner references/mutations, independent uniqueness, ownership spoofing, idempotent legacy migration, references, unique weeks, archive, restore and transactional deletion.",
    );
  } finally {
    if (!process.env.MONGODB_DB?.startsWith("report_desk_test_d_"))
      throw new Error("Refusing to clean a non-test database.");
    if (global.mongoConnection) {
      try {
        await (await collections()).db.dropDatabase();
      } finally {
        await (await global.mongoConnection).close();
        global.mongoConnection = undefined;
      }
    }
  }
}

if (process.argv[1]?.endsWith("verify-domain.ts")) {
  verifyDomain().catch((error) => {
    console.error(
      "Integration check failed:",
      error instanceof Error ? error.name : "Unknown error",
    );
    process.exitCode = 1;
  });
}
