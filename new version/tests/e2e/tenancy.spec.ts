import { test, expect, type APIRequestContext } from "@playwright/test";
import { dateKey, shiftDate } from "../../src/lib/dates";

const origin = "http://localhost:3100";
const headers = { origin };

test("self registration creates isolated workspaces and protects every data path", async ({
  browser,
}) => {
  test.setTimeout(300000);
  const alpha = await browser.newContext({ baseURL: origin });
  const beta = await browser.newContext({ baseURL: origin });
  const gamma = await browser.newContext({ baseURL: origin });
  const post = async (api: APIRequestContext, entity: string, data: object) => {
    const response = await api.post(`/api/${entity}`, { headers, data });
    expect(response.status(), await response.text()).toBe(201);
    return (await response.json())._id as string;
  };
  try {
    const pageA = await alpha.newPage();
    await pageA.goto("/en");
    await pageA
      .getByRole("button", {
        name: "New supervisor? Create an account",
        exact: true,
      })
      .click();
    await pageA
      .getByLabel("Full name", { exact: true })
      .fill("Supervisor Alpha");
    await pageA.getByLabel("Username", { exact: true }).fill("tenant-alpha");
    await pageA
      .getByLabel("Password", { exact: true })
      .fill("Alpha-Test-Password-2026!");
    await pageA
      .getByLabel("Confirm password", { exact: true })
      .fill("Different-Password-2026!");
    await pageA
      .getByRole("button", { name: "Create account", exact: true })
      .click();
    await expect(pageA.locator("form").getByRole("alert")).toHaveText(
      "The passwords do not match.",
    );
    await pageA
      .getByLabel("Confirm password", { exact: true })
      .fill("Alpha-Test-Password-2026!");
    await pageA.screenshot({
      path: "test-results/signup-en-desktop.png",
      fullPage: true,
    });
    await pageA
      .getByRole("button", { name: "Create account", exact: true })
      .click();
    await expect(
      pageA.getByRole("heading", { name: "Overview", exact: true }),
    ).toBeVisible();
    const apiA = alpha.request;
    const emptyA = await (await apiA.get("/api/workspace")).json();
    expect([
      emptyA.classes,
      emptyA.people,
      emptyA.curricula,
      emptyA.reports,
    ]).toEqual([[], [], [], []]);
    const ownerA = emptyA.settings._id;
    expect(
      (await alpha.cookies()).find(
        (cookie) => cookie.name === "report_desk_session",
      )?.httpOnly,
    ).toBe(true);

    const teacherA = await post(apiA, "people", {
      kind: "teacher",
      name: "Alpha teacher",
      active: true,
    });
    const supervisorA = await post(apiA, "people", {
      kind: "supervisor",
      name: "Alpha supervisor",
      active: true,
    });
    const bookA = await post(apiA, "curricula", {
      name: "Shared book name",
      pages: 100,
      topics: [],
    });
    const classInput = {
      number: "101",
      name: "Alpha private class",
      teacherId: teacherA,
      supervisorId: supervisorA,
      location: "Kabul",
      startTime: "14:00",
      endTime: "15:00",
      studentCount: 45,
      startedOn: shiftDate(dateKey(new Date()), -28),
    };
    const classA = await post(apiA, "classes", classInput);
    const reportInput = {
      classId: classA,
      curriculumId: bookA,
      topicIds: [],
      lesson: "Alpha private report",
      totalStudents: 45,
      present: 30,
      reportDate: shiftDate(dateKey(new Date()), -1),
    };
    const reportA = await post(apiA, "reports", reportInput);
    expect(
      (
        await apiA.put("/api/settings", {
          headers,
          data: { ...emptyA.settings, organization: "Alpha organization" },
        })
      ).status(),
    ).toBe(200);

    const pageB = await beta.newPage();
    await pageB.setViewportSize({ width: 390, height: 844 });
    await pageB.goto("/fa");
    await pageB
      .getByRole("button", {
        name: "سرنگران جدید هستید؟ ثبت‌نام کنید",
        exact: true,
      })
      .click();
    await pageB.screenshot({
      path: "test-results/signup-fa-mobile.png",
      fullPage: true,
    });
    expect(
      await pageB.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await pageB.getByLabel("نام کامل", { exact: true }).fill("سرنگران بتا");
    await pageB.getByLabel("نام کاربری", { exact: true }).fill("tenant-beta");
    await pageB
      .getByLabel("رمز عبور", { exact: true })
      .fill("Beta-Test-Password-2026!");
    await pageB
      .getByLabel("تکرار رمز عبور", { exact: true })
      .fill("Beta-Test-Password-2026!");
    await pageB
      .getByRole("button", { name: "ثبت‌نام سرنگران", exact: true })
      .click();
    await expect(
      pageB.getByRole("heading", { name: "نمای کلی", exact: true }),
    ).toBeVisible();
    const apiB = beta.request;
    const emptyB = await (await apiB.get("/api/workspace")).json();
    expect([
      emptyB.classes,
      emptyB.people,
      emptyB.curricula,
      emptyB.reports,
    ]).toEqual([[], [], [], []]);
    expect(emptyB.settings.organization).toBe("Report Desk");
    const ownerB = emptyB.settings._id;
    expect(ownerB).not.toBe(ownerA);
    const emptyBackup = await (await apiB.get("/api/backup")).json();
    expect([
      emptyBackup.classes,
      emptyBackup.people,
      emptyBackup.curricula,
      emptyBackup.reports,
    ]).toEqual([[], [], [], []]);

    for (const [entity, id] of [
      ["classes", classA],
      ["people", teacherA],
      ["curricula", bookA],
      ["reports", reportA],
    ]) {
      const list = await (
        await apiB.get(`/api/${entity}?ownerId=${ownerA}`)
      ).json();
      expect(list.total).toBe(0);
      expect(
        (
          await apiB.put(`/api/${entity}/${id}`, { headers, data: {} })
        ).status(),
      ).toBe(404);
      for (const action of ["archive", "restore", "delete"])
        expect(
          (
            await apiB.patch(`/api/${entity}/${id}`, {
              headers,
              data: { action },
            })
          ).status(),
        ).toBe(404);
    }
    expect(
      (
        await (
          await apiB.get(`/api/reports?classId=${classA}&archived=true`)
        ).json()
      ).total,
    ).toBe(0);
    expect(
      (await apiB.post("/api/classes", { headers, data: classInput })).status(),
    ).toBe(400);
    expect(
      (
        await apiB.post("/api/reports", { headers, data: reportInput })
      ).status(),
    ).toBe(400);
    expect(
      (
        await apiB.put("/api/settings", {
          headers,
          data: {
            ...emptyB.settings,
            _id: ownerA,
            ownerId: ownerA,
            organization: "Beta organization",
            timezone: "UTC",
          },
        })
      ).status(),
    ).toBe(200);
    expect(
      (await (await apiA.get("/api/workspace")).json()).settings.organization,
    ).toBe("Alpha organization");
    expect(
      (await (await apiA.get("/api/workspace")).json()).settings.timezone,
    ).toBe("Asia/Kabul");

    const teacherB = await post(apiB, "people", {
      kind: "teacher",
      name: "Beta teacher",
      active: true,
      ownerId: ownerA,
    });
    const supervisorB = await post(apiB, "people", {
      kind: "supervisor",
      name: "Beta supervisor",
      active: true,
    });
    const bookB = await post(apiB, "curricula", {
      name: "Shared book name",
      pages: 100,
      topics: [],
    });
    const classB = await post(apiB, "classes", {
      ...classInput,
      name: "Beta private class",
      teacherId: teacherB,
      supervisorId: supervisorB,
      ownerId: ownerA,
    });
    const workspaceB = await (await apiB.get("/api/workspace")).json();
    expect(workspaceB.classes.map((row: { _id: string }) => row._id)).toEqual([
      classB,
    ]);
    expect(
      workspaceB.people.find((row: { _id: string }) => row._id === teacherB)
        .ownerId,
    ).toBe(ownerB);
    expect(workspaceB.curricula.map((row: { _id: string }) => row._id)).toEqual(
      [bookB],
    );
    expect(
      (
        await apiB.post("/api/reports", {
          headers,
          data: { ...reportInput, classId: classB },
        })
      ).status(),
    ).toBe(400);
    expect(
      (
        await apiB.post("/api/auth/register", {
          headers,
          data: {
            name: "Duplicate",
            username: "TENANT-ALPHA",
            password: "Another-Test-Password-2026!",
          },
        })
      ).status(),
    ).toBe(409);
    expect(
      (
        await gamma.request.post("/api/auth/register", {
          data: {
            name: "No origin",
            username: "csrf-user",
            password: "Another-Test-Password-2026!",
          },
        })
      ).status(),
    ).toBe(403);

    const signupC = await gamma.request.post("/api/auth/register", {
      headers,
      data: {
        name: "Supervisor Gamma",
        username: "tenant-gamma",
        password: "Gamma-Test-Password-2026!",
        ownerId: ownerA,
        role: "viewer",
      },
    });
    expect(signupC.status()).toBe(201);
    const workspaceC = await (await gamma.request.get("/api/workspace")).json();
    expect(workspaceC.classes).toEqual([]);
    expect(workspaceC.settings._id).not.toBe(ownerA);
    const backupA = await (await apiA.get("/api/backup")).json();
    expect(backupA.classes.length).toBe(1);
    expect(backupA.people.length).toBe(2);
    expect(backupA.reports.length).toBe(1);
    expect(
      (
        await gamma.request.post("/api/backup/restore", {
          headers,
          data: backupA,
        })
      ).status(),
    ).toBe(200);
    const restored = await (await gamma.request.get("/api/workspace")).json();
    expect(restored.classes.length).toBe(1);
    expect(restored.classes[0]._id).not.toBe(classA);
    expect(restored.classes[0].ownerId).toBe(workspaceC.settings._id);
    expect(restored.reports[0].classId).toBe(restored.classes[0]._id);
    expect(
      (await (await apiA.get("/api/workspace")).json()).classes[0]._id,
    ).toBe(classA);
    expect(
      (
        await gamma.request.post("/api/backup/restore", {
          headers,
          data: backupA,
        })
      ).status(),
    ).toBe(409);

    await pageB.setViewportSize({ width: 1440, height: 1000 });
    await pageB.goto("/en/classes");
    await expect(
      pageB.getByText("Beta private class", { exact: true }),
    ).toBeVisible();
    const mirror = await beta.newPage();
    await mirror.goto("/en/classes");
    await expect(
      mirror.getByText("Beta private class", { exact: true }),
    ).toBeVisible();
    await mirror.getByRole("button", { name: "Sign out", exact: true }).click();
    await expect(
      pageB.getByRole("heading", { name: "Sign in", exact: true }),
    ).toBeVisible();
    await pageB.getByLabel("Username", { exact: true }).fill("TENANT-ALPHA");
    await pageB
      .getByLabel("Password", { exact: true })
      .fill("Alpha-Test-Password-2026!");
    await pageB.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(
      pageB.getByText("Alpha private class", { exact: true }),
    ).toBeVisible();
    await expect(
      mirror.getByText("Alpha private class", { exact: true }),
    ).toBeVisible();
    await expect(
      mirror.getByText("Beta private class", { exact: true }),
    ).toHaveCount(0);
  } finally {
    await alpha.close();
    await beta.close();
    await gamma.close();
  }
});
