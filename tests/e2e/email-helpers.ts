import { expect, type APIRequestContext, type Page } from "@playwright/test";
import { ADMIN_EMAIL } from "../../src/lib/access";
import { MongoClient, type Db } from "mongodb";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
export const origin = "http://localhost:3100";
export const headers = { origin };
export { ADMIN_EMAIL };
export async function capture(page: Page, name: string) {
  const directory = ".taste-skill/email-qa";
  await mkdir(directory, { recursive: true });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: `${directory}/${name}.png`,
    fullPage: true,
    animations: "disabled",
  });
  const html = await page.evaluate(() => {
    const root = document.documentElement.cloneNode(true) as HTMLElement;
    root
      .querySelectorAll("script, link[rel=stylesheet]")
      .forEach((element) => element.remove());
    root
      .querySelectorAll("input")
      .forEach((input, index) =>
        input.setAttribute(
          "value",
          document.querySelectorAll("input")[index].value,
        ),
      );
    root.querySelectorAll("select").forEach((select, index) => {
      const value = document.querySelectorAll("select")[index].value;
      for (const option of select.options) {
        if (option.value === value) option.setAttribute("selected", "");
        else option.removeAttribute("selected");
      }
    });
    const style = document.createElement("style");
    style.textContent = [...document.styleSheets]
      .map((sheet) => {
        try {
          return [...sheet.cssRules].map((rule) => rule.cssText).join("\n");
        } catch {
          return "";
        }
      })
      .join("\n")
      .replaceAll('url("/fonts/', 'url("/public/fonts/')
      .replaceAll("url(/fonts/", "url(/public/fonts/");
    root.querySelector("head")!.append(style);
    return "<!doctype html>" + root.outerHTML;
  });
  await writeFile(`${directory}/${name}.html`, html);
}
export async function withTestDb<T>(task: (db: Db) => Promise<T>): Promise<T> {
  if (!process.env.MONGODB_DB?.startsWith("report_desk_test_"))
    throw new Error("Isolated test database required.");
  const client = await new MongoClient(process.env.MONGODB_URI!).connect();
  try {
    return await task(client.db(process.env.MONGODB_DB));
  } finally {
    await client.close();
  }
}
export async function resetCooldown(email: string) {
  await withTestDb((db) =>
    db.collection("login_attempts").deleteOne({
      _id: `otp-cooldown:${createHash("sha256").update(email).digest("hex")}`,
    } as never),
  );
}
export async function mailbox(api: APIRequestContext, email: string) {
  return (await (
    await api.get(`http://127.0.0.1:3103/?email=${encodeURIComponent(email)}`)
  ).json()) as { code: string; count: number };
}
export async function login(
  api: APIRequestContext,
  email: string,
  invitationCode?: string,
) {
  const sent = await api.post("/api/auth/email/send", {
    headers,
    data: { email, name: email.split("@")[0], invitationCode, locale: "en" },
  });
  expect(sent.status(), await sent.text()).toBe(200);
  const { challengeId } = await sent.json();
  const verified = await api.post("/api/auth/email/verify", {
    headers,
    data: { challengeId, code: (await mailbox(api, email)).code },
  });
  expect(verified.status(), await verified.text()).toBe(200);
  return (await verified.json()).user;
}
export async function invite(api: APIRequestContext, email: string) {
  const result = await api.post("/api/admin/invitations", {
    headers,
    data: { email },
  });
  expect(result.status(), await result.text()).toBe(201);
  return (await result.json()) as { id: string; code: string };
}
export async function loginPage(page: Page, email: string) {
  await page.goto("/en");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page
    .getByRole("button", { name: "Send sign-in code", exact: true })
    .click();
  await expect(page.getByLabel("One-time code", { exact: true })).toBeVisible();
  await page
    .getByLabel("One-time code", { exact: true })
    .fill((await mailbox(page.request, email)).code);
  await page
    .getByRole("button", { name: "Verify and sign in", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Overview", exact: true }),
  ).toBeVisible();
}
