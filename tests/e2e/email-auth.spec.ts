import { test, expect } from "@playwright/test";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import {
  capture,
  ADMIN_EMAIL,
  headers,
  invite,
  loginPage,
  mailbox,
  resetCooldown,
  withTestDb,
} from "./email-helpers";

test("email verification, one-use invitations, administrator controls and legacy preservation", async ({
  page,
  browser,
}) => {
  test.setTimeout(300000);
  const admin = page.request;
  const guest = await browser.newContext({ baseURL: "http://localhost:3100" });
  const api = guest.request;
  const send = async (email: string, invitationCode?: string) =>
    api.post("/api/auth/email/send", {
      headers,
      data: {
        email,
        name: "Invited Supervisor",
        invitationCode,
        locale: "en",
        role: "admin",
        ownerId: "spoofed",
      },
    });
  const verify = async (challengeId: string, code: string) =>
    api.post("/api/auth/email/verify", {
      headers,
      data: { challengeId, code, role: "admin" },
    });
  try {
    expect(
      (
        await api.post("/api/auth", {
          headers,
          data: { username: "legacy-account", password: "anything" },
        })
      ).status(),
    ).toBe(405);
    expect(
      (await api.post("/api/auth/register", { headers, data: {} })).status(),
    ).toBe(410);
    expect((await api.get("/api/admin/invitations")).status()).toBe(401);
    expect((await send("uninvited@example.com")).status()).toBe(403);
    expect((await api.get("/api/workspace")).status()).toBe(401);
    await resetCooldown(ADMIN_EMAIL);
    await loginPage(page, ADMIN_EMAIL);
    const adminWorkspace = await (await admin.get("/api/workspace")).json();
    expect(adminWorkspace.user.isSystemAdmin).toBe(true);
    expect(adminWorkspace.classes).toEqual([]);
    expect(adminWorkspace.curricula).toEqual([]);
    await page.getByRole("link", { name: "Invitations", exact: true }).click();
    await page
      .getByLabel("Invitee email", { exact: true })
      .fill("invited@example.com");
    await page
      .getByRole("button", { name: "Create invitation", exact: true })
      .click();
    await expect(
      page.getByText("Invitation code is ready", { exact: true }),
    ).toBeVisible();
    const code = await page
      .getByLabel("Administrator invitation code", { exact: true })
      .inputValue();
    const listed = await (await admin.get("/api/admin/invitations")).json();
    expect(JSON.stringify(listed)).not.toContain(code);
    expect(JSON.stringify(listed)).not.toContain("codeHash");
    await capture(page, "invitations-en-1440");
    expect((await send("different@example.com", code)).status()).toBe(403);
    const sent = await send("invited@example.com", code);
    expect(sent.status(), await sent.text()).toBe(200);
    const challenge = await sent.json();
    const otp = (await mailbox(api, "invited@example.com")).code;
    expect(JSON.stringify(challenge)).not.toContain(otp);
    await withTestDb(async (db) => {
      expect(
        await db
          .collection("users")
          .countDocuments({ email: "invited@example.com" }),
      ).toBe(0);
      const pending = await db
        .collection("email_challenges")
        .findOne({ _id: challenge.challengeId } as never);
      expect(pending?.codeHash).not.toBe(otp);
    });
    expect((await send("invited@example.com", code)).status()).toBe(429);
    expect((await verify(challenge.challengeId, "000000")).status()).toBe(401);
    const attempts = await Promise.all([
      verify(challenge.challengeId, otp),
      verify(challenge.challengeId, otp),
    ]);
    expect(attempts.map((response) => response.status()).sort()).toEqual([
      200, 401,
    ]);
    expect((await verify(challenge.challengeId, otp)).status()).toBe(401);
    // Concurrent responses do not overwrite the session cookie from the successful response.
    const memberWorkspace = await (await api.get("/api/workspace")).json();
    expect(memberWorkspace.user.role).toBe("supervisor");
    expect(memberWorkspace.user.isSystemAdmin).toBe(false);
    expect(memberWorkspace.settings._id).not.toBe(adminWorkspace.settings._id);
    expect([
      memberWorkspace.classes,
      memberWorkspace.people,
      memberWorkspace.curricula,
      memberWorkspace.reports,
    ]).toEqual([[], [], [], []]);
    expect(
      (await guest.cookies()).find(
        (cookie) => cookie.name === "report_desk_session",
      )?.httpOnly,
    ).toBe(true);
    expect((await api.get("/api/admin/invitations")).status()).toBe(403);
    expect(
      (
        await api.post("/api/admin/invitations", {
          headers,
          data: { email: "outsider@example.com" },
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await api.patch("/api/admin/invitations", {
          headers,
          data: { id: listed.invitations[0]._id },
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await admin.post("/api/admin/invitations", {
          headers,
          data: { email: "INVITED@example.com" },
        })
      ).status(),
    ).toBe(409);
    expect(
      (
        await api.post("/api/people", {
          headers,
          data: { kind: "teacher", name: "Private teacher", active: true },
        })
      ).status(),
    ).toBe(201);
    expect((await (await admin.get("/api/workspace")).json()).people).toEqual(
      [],
    );
    await api.delete("/api/auth", { headers });
    await resetCooldown("invited@example.com");
    const again = await send("invited@example.com");
    expect(again.status()).toBe(200);
    expect(
      (
        await verify(
          (await again.json()).challengeId,
          (await mailbox(api, "invited@example.com")).code,
        )
      ).status(),
    ).toBe(200);

    for (const scenario of [
      "revoked",
      "expired",
      "attempts",
      "resend",
      "fail-delivery",
    ]) {
      const email = `${scenario}@example.com`;
      const invitation = await invite(admin, email);
      const response = await send(email, invitation.code);
      if (scenario === "fail-delivery") {
        expect(response.status()).toBe(503);
        expect((await response.json()).error).toBe("EMAIL_SEND_FAILED");
        await withTestDb(async (db) => {
          expect(
            await db.collection("email_challenges").countDocuments({ email }),
          ).toBe(0);
          expect(await db.collection("users").countDocuments({ email })).toBe(
            0,
          );
        });
        continue;
      }
      expect(response.status(), await response.text()).toBe(200);
      const { challengeId } = await response.json();
      const pendingCode = (await mailbox(api, email)).code;
      if (scenario === "revoked") {
        expect(
          (
            await admin.patch("/api/admin/invitations", {
              headers,
              data: { id: invitation.id },
            })
          ).status(),
        ).toBe(200);
        expect((await verify(challengeId, pendingCode)).status()).toBe(403);
        await resetCooldown(email);
        expect((await send(email, invitation.code)).status()).toBe(403);
      } else if (scenario === "expired") {
        await withTestDb((db) =>
          db
            .collection("email_challenges")
            .updateOne({ _id: challengeId } as never, {
              $set: { expiresAt: new Date(0) },
            }),
        );
        expect((await verify(challengeId, pendingCode)).status()).toBe(401);
        await withTestDb((db) =>
          db
            .collection("invitations")
            .updateOne({ _id: invitation.id } as never, {
              $set: { expiresAt: new Date(0) },
            }),
        );
        await resetCooldown(email);
        expect((await send(email, invitation.code)).status()).toBe(403);
      } else if (scenario === "attempts") {
        for (let index = 0; index < 5; index++)
          expect((await verify(challengeId, "000000")).status()).toBe(401);
        expect((await verify(challengeId, pendingCode)).status()).toBe(401);
      } else {
        await resetCooldown(email);
        const resent = await send(email, invitation.code);
        expect(resent.status()).toBe(200);
        expect((await verify(challengeId, pendingCode)).status()).toBe(401);
        const latest = await resent.json();
        expect(
          (
            await verify(latest.challengeId, (await mailbox(api, email)).code)
          ).status(),
        ).toBe(200);
      }
    }
    // Even a previously issued password session cannot admit a legacy account.
    const legacyToken = randomBytes(32).toString("hex");
    await withTestDb(async (db) => {
      const legacy = await db
        .collection("users")
        .findOne({ username: "legacy-account" });
      expect(legacy?.email).toBeUndefined();
      expect(legacy?.passwordHash).toBe("legacy-password-hash-preserved");
      expect(
        await db.collection("curricula").countDocuments({
          ownerId: legacy?._id,
          name: "Legacy private book",
        }),
      ).toBe(1);
      await db.collection("sessions").insertOne({
        _id: createHash("sha256").update(legacyToken).digest("hex"),
        userId: legacy?._id,
        expiresAt: new Date(Date.now() + 60000),
      } as never);
    });
    await guest.addCookies([
      {
        name: "report_desk_session",
        value: legacyToken,
        url: "http://localhost:3100",
        httpOnly: true,
      },
    ]);
    expect((await api.get("/api/workspace")).status()).toBe(401);
    expect((await verify(randomUUID(), "123456")).status()).toBe(401);
    await page.goto("/fa/invitations");
    await expect(
      page.getByRole("heading", { name: "مدیریت دعوت‌ها", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "تم تاریک", exact: true }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    await capture(page, "invitations-fa-390-dark");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  } finally {
    await guest.close();
  }
});
