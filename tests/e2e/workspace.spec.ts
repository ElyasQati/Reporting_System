import { loginPage, resetCooldown, ADMIN_EMAIL } from "./email-helpers";
import { test, expect } from "@playwright/test";
import { dateKey, shiftDate, weekStart } from "../../src/lib/dates";
const origin = "http://localhost:3100";
test("Authentication, bilingual forms, weekly uniqueness, archive and theme", async ({
  page,
  request,
}) => {
  expect((await request.get("/api/workspace")).status()).toBe(401);
  await resetCooldown(ADMIN_EMAIL);
  await loginPage(page, ADMIN_EMAIL);
  const api = page.request;
  const post = async (entity: string, data: object) => {
    const response = await api.post(`/api/${entity}`, {
      headers: { origin },
      data,
    });
    expect(response.status(), await response.text()).toBe(201);
    return (await response.json())._id as string;
  };
  const teacher = await post("people", {
    kind: "teacher",
    name: "استاد احمدی",
    phone: "0700000001",
    email: "",
    active: true,
  });
  const supervisor = await post("people", {
    kind: "supervisor",
    name: "نگران کریمی",
    phone: "0700000002",
    email: "",
    active: true,
  });
  const topicId = crypto.randomUUID();
  const book = await post("curricula", {
    name: "اکسیر اندیشه‌ها",
    pages: 100,
    topics: [
      { id: topicId, title: "اندیشه و شناخت", startPage: 1, endPage: 20 },
    ],
  });
  const today = dateKey(new Date());
  const c = await post("classes", {
    number: "101",
    name: "صنف معرفت",
    teacherId: teacher,
    supervisorId: supervisor,
    location: "کابل",
    startTime: "14:00",
    endTime: "15:00",
    studentCount: 30,
    startedOn: shiftDate(today, -70),
  });
  const r = await post("reports", {
    classId: c,
    curriculumId: book,
    topicIds: [topicId],
    lesson: "اندیشه و شناخت",
    totalStudents: 30,
    present: 27,
    reportDate: today,
  });
  const duplicate = await api.post("/api/reports", {
    headers: { origin },
    data: {
      classId: c,
      curriculumId: book,
      topicIds: [],
      lesson: "Duplicate",
      totalStudents: 30,
      present: 27,
      reportDate: today,
    },
  });
  expect(duplicate.status()).toBe(409);
  const invalid = await api.post("/api/reports", {
    headers: { origin },
    data: {
      classId: c,
      curriculumId: book,
      topicIds: [],
      lesson: "Invalid",
      totalStudents: 30,
      present: 31,
      reportDate: shiftDate(today, -7),
    },
  });
  expect(invalid.status()).toBe(422);
  expect(
    (
      await api.post("/api/reports", {
        headers: { origin: "https://another-site.example" },
        data: {},
      })
    ).status(),
  ).toBe(403);
  for (let i = 1; i <= 8; i++)
    await post("reports", {
      classId: c,
      curriculumId: book,
      topicIds: [topicId],
      lesson: "اندیشه و شناخت",
      totalStudents: 30,
      present: 26 + (i % 4),
      reportDate: shiftDate(today, -i * 7),
    });
  await page.getByRole("link", { name: "Classes", exact: true }).click();
  await expect(page.getByText("صنف معرفت", { exact: true })).toBeVisible();
  await expect(page.getByText("2:00 PM", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByLabel("Current enrollment", { exact: true }).fill("32");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("link", { name: "Curriculum library", exact: true })
    .click();
  await page.getByRole("button", { name: "Details", exact: true }).click();
  await expect(
    page.getByRole("dialog").getByText("اندیشه و شناخت", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("link", { name: "Supervisors", exact: true }).click();
  await expect(page.getByText("نگران کریمی", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Language", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("html")).toHaveAttribute("lang", "fa");
  await expect(
    page.getByRole("heading", { name: "نگران‌های صنف", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "تم تاریک", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("link", { name: "نمای کلی", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "نمای کلی", exact: true }),
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: "test-results/dashboard-fa-dark.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "تم روشن", exact: true }).click();
  await page.screenshot({
    path: "test-results/dashboard-fa-light.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "ثبت گزارش", exact: true })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByLabel("تاریخ گزارش — ماه", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "بستن", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/dashboard-fa-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("link", { name: "زبان", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(
    page.getByRole("heading", { name: "Overview", exact: true }),
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: "test-results/dashboard-en-light.png",
    fullPage: true,
  });
  const archive = await api.patch(`/api/classes/${c}`, {
    headers: { origin },
    data: { action: "archive" },
  });
  expect(archive.status()).toBe(200);
  expect(
    (await (await api.get("/api/reports?archived=true")).json()).items.some(
      (row: { _id: string }) => row._id === r,
    ),
  ).toBe(true);
  let workspace = await (await api.get("/api/workspace")).json();
  expect(
    workspace.classes.find((row: { _id: string }) => row._id === c).archivedAt,
  ).not.toBeNull();
  expect(workspace.reports.some((row: { _id: string }) => row._id === r)).toBe(
    true,
  );
  expect(
    (
      await api.patch(`/api/classes/${c}`, {
        headers: { origin },
        data: { action: "restore" },
      })
    ).status(),
  ).toBe(200);
  const backup = await api.get("/api/backup");
  expect(backup.ok()).toBe(true);
  expect((await backup.json()).version).toBe(2);
  expect(
    (
      await api.post("/api/backup/restore", {
        headers: { origin },
        data: await backup.json(),
      })
    ).status(),
  ).toBe(409);
  workspace = await (await api.get("/api/workspace")).json();
  const saved = workspace.reports.find((row: { _id: string }) => row._id === r);
  expect(saved.weekStart).toBe(weekStart(today, 5));
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Sign in", exact: true }),
  ).toBeVisible();
});
