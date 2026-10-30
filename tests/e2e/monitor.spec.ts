import { test, expect, type APIRequestContext } from "@playwright/test";
import { randomUUID } from "node:crypto";
import {
  capture,
  headers,
  invite,
  login,
  origin,
  resetCooldown,
  withTestDb,
  ADMIN_EMAIL,
} from "./email-helpers";
import { calendarParts, dateKey, shiftDate } from "../../src/lib/dates";

test("monitor codes share only the issuing supervisor's workspace and never allow mutations", async ({
  browser,
}) => {
  test.setTimeout(300000);
  const admin = await browser.newContext({ baseURL: origin });
  const alpha = await browser.newContext({ baseURL: origin });
  const beta = await browser.newContext({ baseURL: origin });
  const monitor = await browser.newContext({ baseURL: origin });
  const secondMonitor = await browser.newContext({ baseURL: origin });
  const anonymous = await browser.newContext({ baseURL: origin });
  const errors: string[] = [];
  const post = async (api: APIRequestContext, entity: string, data: object) => {
    const response = await api.post(`/api/${entity}`, { headers, data });
    expect(response.status(), await response.text()).toBe(201);
    return { ...data, ...(await response.json()) };
  };
  try {
    await resetCooldown(ADMIN_EMAIL);
    await login(admin.request, ADMIN_EMAIL);
    for (const [context, email] of [
      [alpha, "monitor-supervisor-a@example.com"],
      [beta, "monitor-supervisor-b@example.com"],
    ] as const) {
      await login(
        context.request,
        email,
        (await invite(admin.request, email)).code,
      );
    }
    const initial = await (await alpha.request.get("/api/workspace")).json();
    expect(initial.user.role).toBe("supervisor");
    expect((await anonymous.request.get("/api/monitor-access")).status()).toBe(
      401,
    );
    expect(
      (
        await anonymous.request.post("/api/monitor-access", {
          headers,
          data: {},
        })
      ).status(),
    ).toBe(401);
    expect(
      (
        await anonymous.request.post("/api/auth/monitor", {
          data: { code: "M-00000-00000-00000-00000" },
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await anonymous.request.post("/api/auth/monitor", {
          headers,
          data: { code: "W042" },
        })
      ).status(),
    ).toBe(422);
    expect(
      (
        await anonymous.request.post("/api/auth/monitor", {
          headers,
          data: { code: "M-00000-00000-00000-00000" },
        })
      ).status(),
    ).toBe(401);

    const teacher = await post(alpha.request, "people", {
      name: "استاد احمد",
      kind: "teacher",
      phone: "0700000000",
      active: true,
    });
    const supervisor = await post(alpha.request, "people", {
      name: "نگران مریم",
      kind: "supervisor",
      active: true,
    });
    const topicId = randomUUID();
    const book = await post(alpha.request, "curricula", {
      name: "کتاب آموزش فارسی",
      pages: 120,
      topics: [{ id: topicId, title: "شناخت حروف", startPage: 1, endPage: 12 }],
    });
    const schoolClass = await post(alpha.request, "classes", {
      number: "801",
      name: "صنف آموزش کابل",
      teacherId: teacher._id,
      supervisorId: supervisor._id,
      location: "کابل",
      startTime: "14:00",
      endTime: "15:00",
      studentCount: 32,
      startedOn: shiftDate(dateKey(new Date()), -28),
    });
    const report = await post(alpha.request, "reports", {
      classId: schoolClass._id,
      curriculumId: book._id,
      topicIds: [topicId],
      lesson: "تمرین خواندن و شناخت حروف",
      totalStudents: 32,
      present: 29,
      reportDate: dateKey(new Date()),
    });
    await post(beta.request, "curricula", {
      name: "Beta private curriculum",
      pages: 50,
      topics: [],
    });
    const archivedBook = await post(alpha.request, "curricula", {
      name: "Archived reading book",
      pages: 40,
      topics: [],
    });
    expect(
      (
        await alpha.request.patch(`/api/curricula/${archivedBook._id}`, {
          headers,
          data: { action: "archive" },
        })
      ).status(),
    ).toBe(200);

    const ownerPage = await alpha.newPage();
    await ownerPage.goto("/en/monitor-access");
    await expect(
      ownerPage
        .getByRole("heading", { name: "Monitor access", exact: true })
        .first(),
    ).toBeVisible();
    await ownerPage
      .getByRole("button", { name: "Create monitor code", exact: true })
      .click();
    const code = await ownerPage
      .getByRole("textbox", { name: "Monitor access code", exact: true })
      .inputValue();
    expect(code).toMatch(/^M-[A-F0-9]{5}(?:-[A-F0-9]{5}){3}$/);
    const betaCode = (
      await post(beta.request, "monitor-access", {
        ownerId: initial.settings._id,
      })
    ).code;
    expect(betaCode).not.toBe(code);
    const usersBefore = await withTestDb((db) =>
      db.collection("users").countDocuments(),
    );
    const page = await monitor.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/en");
    await page
      .getByRole("button", { name: "I am a monitor", exact: true })
      .click();
    await expect(page.getByLabel("Email", { exact: true })).toHaveCount(0);
    await capture(page, "monitor-login-en-1440");
    await page
      .getByLabel("Monitor access code", { exact: true })
      .fill(code.toLowerCase());
    await page
      .getByRole("button", { name: "Open monitor workspace", exact: true })
      .click();
    await expect(page.locator(".monitor-shell")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Overview", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Add report", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Settings", exact: true }),
    ).toHaveCount(0);
    await capture(page, "monitor-overview-en-1440");
    const parts = calendarParts(dateKey(new Date()), "gregory");
    const snapshot = await (
      await monitor.request.get(
        `/api/workspace?period=${parts.year}-${String(parts.month).padStart(2, "0")}`,
      )
    ).json();
    expect(snapshot.settings._id).toBe(initial.settings._id);
    expect(snapshot.user).toMatchObject({
      role: "monitor",
      isSystemAdmin: false,
    });
    expect(snapshot.user.email).toBeUndefined();
    expect(snapshot.classes.map((c: { _id: string }) => c._id)).toEqual([
      schoolClass._id,
    ]);
    expect(
      snapshot.reports.some((r: { _id: string }) => r._id === report._id),
    ).toBe(true);
    expect(JSON.stringify(snapshot)).not.toContain("Beta private curriculum");
    const stolenScope = await (
      await monitor.request.get(`/api/curricula?ownerId=other&userId=other`)
    ).json();
    expect(
      stolenScope.items.map((item: { name: string }) => item.name),
    ).toEqual([book.name]);
    const status = await (
      await alpha.request.get("/api/monitor-access")
    ).json();
    expect(status.access.active).toBe(true);
    expect(status.access.lastUsedAt).toBeTruthy();
    expect(JSON.stringify(status)).not.toMatch(/codeHash|generation|M-/);
    expect(
      await withTestDb((db) => db.collection("users").countDocuments()),
    ).toBe(usersBefore);

    for (const entity of ["classes", "people", "curricula", "reports"]) {
      expect(
        (
          await monitor.request.post(`/api/${entity}`, { headers, data: {} })
        ).status(),
      ).toBe(403);
      expect(
        (
          await monitor.request.put(`/api/${entity}/${schoolClass._id}`, {
            headers,
            data: { role: "admin", ownerId: initial.settings._id },
          })
        ).status(),
      ).toBe(403);
      for (const action of ["archive", "restore", "delete"])
        expect(
          (
            await monitor.request.patch(`/api/${entity}/${schoolClass._id}`, {
              headers,
              data: { action },
            })
          ).status(),
        ).toBe(403);
    }
    expect(
      (
        await monitor.request.put("/api/settings", {
          headers,
          data: initial.settings,
        })
      ).status(),
    ).toBe(403);
    expect((await monitor.request.get("/api/backup")).status()).toBe(403);
    expect(
      (
        await monitor.request.post("/api/backup/restore", { headers, data: {} })
      ).status(),
    ).toBe(403);
    for (const endpoint of ["/api/monitor-access", "/api/admin/invitations"]) {
      expect((await monitor.request.get(endpoint)).status()).toBe(403);
      expect(
        (await monitor.request.post(endpoint, { headers, data: {} })).status(),
      ).toBe(403);
    }
    expect(
      (
        await monitor.request.delete("/api/monitor-access", { headers })
      ).status(),
    ).toBe(403);
    expect(
      (
        await monitor.request.patch("/api/admin/invitations", {
          headers,
          data: { id: randomUUID() },
        })
      ).status(),
    ).toBe(403);

    await page.goto("/en/reports");
    await page
      .getByLabel("Year", { exact: true })
      .selectOption(String(parts.year - 1));
    await expect(
      page.getByText("No reports have been recorded for this period.", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Add report", exact: true }),
    ).toHaveCount(0);
    await page
      .getByLabel("Year", { exact: true })
      .selectOption(String(parts.year));
    await expect(page.getByText(report.lesson, { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Details", exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText("شناخت حروف");
    await expect(page.getByRole("dialog")).toContainText("29");
    await capture(page, "monitor-report-detail-en-1440");
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Edit", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Archive", exact: true }),
    ).toHaveCount(0);
    const downloadPromise = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Export Excel", exact: true })
      .click();
    expect((await downloadPromise).suggestedFilename()).toMatch(/\.xlsx$/);
    for (const view of [
      "classes",
      "curricula",
      "teachers",
      "supervisors",
      "analytics",
    ]) {
      await page.goto(`/en/${view}`);
      await expect(page.locator(".monitor-shell")).toBeVisible();
      await expect(
        page.getByRole("button", { name: /^(Edit|Add|Delete|Restore)/ }),
      ).toHaveCount(0);
    }
    await page.goto("/en/archive");
    await page
      .getByRole("tab", { name: "Curriculum library", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: archivedBook.name, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Restore", exact: true }),
    ).toHaveCount(0);
    await page.goto("/en/settings");
    await expect(page.locator(".monitor-shell")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Settings", exact: true }),
    ).toHaveCount(0);

    expect(
      (
        await alpha.request.patch(`/api/classes/${schoolClass._id}`, {
          headers,
          data: { action: "archive" },
        })
      ).status(),
    ).toBe(200);
    await page.goto("/en/archive");
    await expect(page.getByText(report.lesson, { exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Delete", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Restore", exact: true }),
    ).toHaveCount(0);
    expect(
      (
        await alpha.request.patch(`/api/classes/${schoolClass._id}`, {
          headers,
          data: { action: "restore" },
        })
      ).status(),
    ).toBe(200);

    for (const [width, height] of [
      [768, 1000],
      [375, 812],
      [812, 375],
    ]) {
      await page.setViewportSize({ width, height });
      await page.goto("/fa");
      await expect(page.locator(".monitor-shell")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await capture(page, `monitor-overview-fa-${width}`);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.getByRole("button", { name: "تم تاریک", exact: true }).click();
    await capture(page, "monitor-overview-fa-390-dark");
    expect(await page.locator("html").getAttribute("dir")).toBe("rtl");
    await page.goto("/fa/reports");
    await expect(page.getByText(report.lesson, { exact: true })).toBeVisible();
    await capture(page, "monitor-reports-fa-390-dark");

    const secondLogin = await secondMonitor.request.post("/api/auth/monitor", {
      headers,
      data: { code, ownerId: "other", role: "admin" },
    });
    expect(secondLogin.status()).toBe(200);
    expect((await secondLogin.json()).user.role).toBe("monitor");
    await ownerPage.reload();
    await expect(
      ownerPage.getByRole("textbox", {
        name: "Monitor access code",
        exact: true,
      }),
    ).toHaveCount(0);
    await ownerPage
      .getByRole("button", { name: "Replace access code", exact: true })
      .click();
    await ownerPage
      .getByRole("button", { name: "Confirm", exact: true })
      .click();
    const rotated = await ownerPage
      .getByRole("textbox", { name: "Monitor access code", exact: true })
      .inputValue();
    expect(rotated).not.toBe(code);
    expect((await monitor.request.get("/api/workspace")).status()).toBe(401);
    expect((await secondMonitor.request.get("/api/workspace")).status()).toBe(
      401,
    );
    expect(
      (
        await anonymous.request.post("/api/auth/monitor", {
          headers,
          data: { code },
        })
      ).status(),
    ).toBe(401);
    expect(
      (
        await anonymous.request.post("/api/auth/monitor", {
          headers,
          data: { code: rotated },
        })
      ).status(),
    ).toBe(200);
    await page.getByRole("button", { name: "تازه‌سازی", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "مانیتور هستم", exact: true }),
    ).toBeVisible();
    await ownerPage
      .getByRole("button", { name: "Revoke monitor access", exact: true })
      .click();
    await ownerPage
      .getByRole("button", { name: "Confirm", exact: true })
      .click();
    await expect(
      ownerPage.getByText("Monitor access is inactive", { exact: true }),
    ).toBeVisible();
    expect((await anonymous.request.get("/api/workspace")).status()).toBe(401);
    expect(
      (
        await secondMonitor.request.post("/api/auth/monitor", {
          headers,
          data: { code: rotated },
        })
      ).status(),
    ).toBe(401);
    expect(
      (
        await secondMonitor.request.post("/api/auth/monitor", {
          headers,
          data: { code: betaCode },
        })
      ).status(),
    ).toBe(200);
    expect(
      (
        await (await secondMonitor.request.get("/api/workspace")).json()
      ).curricula.map((b: { name: string }) => b.name),
    ).toEqual(["Beta private curriculum"]);
    expect(
      (await secondMonitor.request.delete("/api/auth", { headers })).status(),
    ).toBe(200);
    expect((await secondMonitor.request.get("/api/workspace")).status()).toBe(
      401,
    );
    expect((await alpha.request.get("/api/workspace")).status()).toBe(200);
    const races = await Promise.all([
      post(alpha.request, "monitor-access", {}),
      post(alpha.request, "monitor-access", {}),
    ]);
    expect(races[0].code).not.toBe(races[1].code);
    const raceResults = [];
    for (const issued of races)
      raceResults.push(
        (
          await anonymous.request.post("/api/auth/monitor", {
            headers,
            data: { code: issued.code },
          })
        ).status(),
      );
    expect(raceResults.sort()).toEqual([200, 401]);
    const adminCode = (await post(admin.request, "monitor-access", {})).code;
    expect(
      (
        await secondMonitor.request.post("/api/auth/monitor", {
          headers,
          data: { code: adminCode },
        })
      ).status(),
    ).toBe(200);
    expect(
      (await (await secondMonitor.request.get("/api/workspace")).json()).user
        .isSystemAdmin,
    ).toBe(false);
    expect(
      (await secondMonitor.request.get("/api/admin/invitations")).status(),
    ).toBe(403);
    await withTestDb((db) =>
      db
        .collection("users")
        .updateOne({ email: ADMIN_EMAIL }, { $set: { active: false } }),
    );
    expect((await secondMonitor.request.get("/api/workspace")).status()).toBe(
      401,
    );
    await withTestDb((db) =>
      db
        .collection("users")
        .updateOne({ email: ADMIN_EMAIL }, { $set: { active: true } }),
    );
    expect(errors).toEqual([]);
  } finally {
    for (const context of [
      admin,
      alpha,
      beta,
      monitor,
      secondMonitor,
      anonymous,
    ])
      await context.close();
  }
});
