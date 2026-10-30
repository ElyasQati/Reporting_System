import { test, expect } from "@playwright/test";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { ADMIN_EMAIL, RETIRED_ADMIN_EMAIL } from "../../src/lib/access";
import { initialSettings } from "../../src/lib/workspace";
import type { User, Session } from "../../src/lib/types";
import {
  withTestDb,
  headers,
  origin,
  loginPage,
  invite,
  mailbox,
} from "./email-helpers";

test("administrator replacement preserves the workspace and retires every old sign-in path", async ({
  page,
  browser,
}) => {
  test.setTimeout(300000);
  const ownerId = randomUUID();
  const conflictingId = randomUUID();
  const teacherId = randomUUID();
  const supervisorId = randomUUID();
  const classId = randomUUID();
  const bookId = randomUUID();
  const reportId = randomUUID();
  const oldChallengeId = randomUUID();
  const topicId = randomUUID();
  const now = new Date().toISOString();
  const oldToken = randomBytes(32).toString("hex");
  const digest = (value: string) =>
    createHash("sha256").update(value).digest("hex");
  const base = { ownerId, createdAt: now, updatedAt: now, archivedAt: null };
  const account: User = {
    ...base,
    _id: ownerId,
    email: RETIRED_ADMIN_EMAIL,
    username: RETIRED_ADMIN_EMAIL,
    emailVerifiedAt: now,
    role: "admin",
    name: "Existing administrator",
    active: true,
  };
  const businessSnapshot = () =>
    withTestDb(async (db) => {
      const result: Record<string, unknown> = {};
      for (const name of [
        "classes",
        "people",
        "curricula",
        "reports",
        "settings",
      ])
        result[name] = await db
          .collection(name)
          .find({ ownerId })
          .sort({ _id: 1 })
          .toArray();
      return result;
    });
  const stale = await browser.newContext({ baseURL: origin });
  await stale.addCookies([
    { name: "report_desk_session", value: oldToken, url: origin },
  ]);
  try {
    await withTestDb(async (db) => {
      await db.collection<User>("users").insertMany([
        account,
        {
          ...account,
          _id: conflictingId,
          username: ADMIN_EMAIL,
          email: ADMIN_EMAIL,
        },
      ]);
      await db.collection<Session>("sessions").insertOne({
        _id: digest(oldToken),
        userId: ownerId,
        expiresAt: new Date(Date.now() + 86400000),
        createdAt: now,
      });
      await db
        .collection("settings")
        .insertOne(initialSettings(ownerId) as never);
      await db.collection("people").insertMany([
        {
          ...base,
          _id: teacherId,
          kind: "teacher",
          name: "Preserved teacher",
          phone: "0700000000",
          email: "",
          active: true,
        },
        {
          ...base,
          _id: supervisorId,
          kind: "supervisor",
          name: "Preserved supervisor",
          phone: "",
          email: "",
          active: true,
        },
      ] as never);
      await db.collection("classes").insertOne({
        ...base,
        _id: classId,
        number: "T-1",
        name: "Preserved class",
        teacherId,
        supervisorId,
        location: "Kabul",
        startTime: "14:00",
        endTime: "15:00",
        studentCount: 20,
        startedOn: "2026-10-01",
      } as never);
      await db.collection("curricula").insertOne({
        ...base,
        _id: bookId,
        name: "Preserved book",
        pages: 100,
        topics: [
          {
            id: topicId,
            title: "Preserved topic",
            startPage: 1,
            endPage: 10,
          },
        ],
      } as never);
      await db.collection("reports").insertOne({
        ...base,
        _id: reportId,
        classId,
        curriculumId: bookId,
        topicIds: [topicId],
        lesson: "Preserved lesson",
        totalStudents: 20,
        present: 18,
        reportDate: "2026-10-23",
        weekStart: "2026-10-23",
        submittedAt: now,
        teacherId,
        supervisorId,
        className: "Preserved class",
        teacherName: "Preserved teacher",
        supervisorName: "Preserved supervisor",
      } as never);
      await db.collection("email_challenges").insertOne({
        _id: oldChallengeId,
        email: RETIRED_ADMIN_EMAIL,
        codeHash: "old-otp",
        expiresAt: new Date(Date.now() + 300000),
        delivered: true,
        attempts: 0,
      } as never);
      await db.collection("invitations").insertOne({
        _id: randomUUID(),
        email: "preserved-invite@example.test",
        createdBy: ownerId,
        codeHash: digest("preserved-test-invite"),
        createdAt: now,
        usedAt: null,
        usedBy: null,
        revokedAt: null,
        expiresAt: new Date(Date.now() + 86400000),
      } as never);
    });
    const before = await businessSnapshot();
    const conflict = await stale.request.get("/api/workspace");
    expect(conflict.status()).toBe(409);
    expect((await conflict.json()).error).toBe("ADMIN_TRANSFER_CONFLICT");
    expect(await businessSnapshot()).toEqual(before);
    await withTestDb(async (db) => {
      expect(
        (await db.collection<User>("users").findOne({ _id: ownerId }))?.email,
      ).toBe(RETIRED_ADMIN_EMAIL);
      await db.collection<User>("users").deleteOne({ _id: conflictingId });
    });
    expect((await stale.request.get("/api/workspace")).status()).toBe(401);
    expect(await businessSnapshot()).toEqual(before);
    await withTestDb(async (db) => {
      const transferred = await db
        .collection<User>("users")
        .findOne({ _id: ownerId });
      expect(transferred).toMatchObject({
        email: ADMIN_EMAIL,
        username: ADMIN_EMAIL,
        name: account.name,
        role: "admin",
        active: true,
      });
      expect(transferred?.emailVerifiedAt).toBeUndefined();
      expect(transferred?.emailChangedAt).toBeTruthy();
      expect(
        await db.collection("sessions").countDocuments({ userId: ownerId }),
      ).toBe(0);
      expect(
        await db
          .collection("email_challenges")
          .countDocuments({ email: RETIRED_ADMIN_EMAIL }),
      ).toBe(0);
      expect(
        await db
          .collection("users")
          .countDocuments({ email: RETIRED_ADMIN_EMAIL, active: true }),
      ).toBe(0);
      expect(
        (await db.collection("invitations").findOne({ createdBy: ownerId }))
          ?.revokedAt,
      ).toBeNull();
    });
    for (const input of [
      { email: RETIRED_ADMIN_EMAIL },
      {
        email: RETIRED_ADMIN_EMAIL,
        name: "Retired",
        invitationCode: "W-00000000000000000000",
      },
    ])
      expect(
        (
          await stale.request.post("/api/auth/email/send", {
            headers,
            data: { ...input, locale: "en" },
          })
        ).status(),
      ).toBe(403);
    expect(
      (
        await stale.request.post("/api/auth/email/verify", {
          headers,
          data: { challengeId: oldChallengeId, code: "123456" },
        })
      ).status(),
    ).toBe(401);
    expect(await mailbox(stale.request, RETIRED_ADMIN_EMAIL)).toBeNull();
    await loginPage(page, ADMIN_EMAIL);
    const workspace = await (
      await page.request.get("/api/workspace?period=2026-10&calendar=gregory")
    ).json();
    expect(workspace.user).toMatchObject({
      email: ADMIN_EMAIL,
      isSystemAdmin: true,
    });
    expect(workspace.settings._id).toBe(ownerId);
    expect(workspace.classes.map((c: { _id: string }) => c._id)).toEqual([
      classId,
    ]);
    expect(workspace.reports.map((r: { _id: string }) => r._id)).toEqual([
      reportId,
    ]);
    expect(await businessSnapshot()).toEqual(before);
    await invite(page.request, "replacement-admin-invite@example.test");
    expect(
      (
        await page.request.post("/api/admin/invitations", {
          headers,
          data: { email: RETIRED_ADMIN_EMAIL },
        })
      ).status(),
    ).toBe(403);
    // A response from an old instance must not resurrect a session after the transfer.
    await withTestDb(async (db) => {
      await db.collection<Session>("sessions").insertOne({
        _id: digest(oldToken),
        userId: ownerId,
        expiresAt: new Date(Date.now() + 86400000),
        createdAt: new Date().toISOString(),
      });
    });
    expect((await stale.request.get("/api/workspace")).status()).toBe(401);
    expect((await page.request.get("/api/admin/invitations")).status()).toBe(
      200,
    );
    expect(await businessSnapshot()).toEqual(before);
  } finally {
    await stale.close();
    await page.context().clearCookies();
    await withTestDb(async (db) => {
      for (const name of [
        "classes",
        "people",
        "curricula",
        "reports",
        "settings",
      ])
        await db.collection(name).deleteMany({ ownerId });
      await db
        .collection<User>("users")
        .deleteMany({ _id: { $in: [ownerId, conflictingId] } });
      await db.collection("sessions").deleteMany({ userId: ownerId });
      await db.collection("invitations").deleteMany({ createdBy: ownerId });
    });
  }
});
