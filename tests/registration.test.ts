import { describe, expect, it } from "vitest";
import {
  emailLoginSchema,
  emailVerifySchema,
  invitationSchema,
} from "../src/lib/email-validation";
import { isSystemAdmin, ADMIN_EMAIL } from "../src/lib/access";

describe("invitation-only email sign-in", () => {
  it("normalizes emails and invitation codes without accepting client roles or ownership", () => {
    expect(
      emailLoginSchema.parse({
        email: " Person@Example.com ",
        name: " Supervisor ",
        invitationCode: " w-0123456789abcdefabcd ",
        role: "admin",
        ownerId: "other",
      }),
    ).toEqual({
      email: "person@example.com",
      name: "Supervisor",
      invitationCode: "W-0123456789ABCDEFABCD",
      locale: "fa",
    });
    expect(emailLoginSchema.safeParse({ email: "not-an-email" }).success).toBe(
      false,
    );
    expect(
      emailLoginSchema.safeParse({
        email: "a@example.com",
        invitationCode: "W042",
      }).success,
    ).toBe(false);
  });
  it("accepts six digits including Persian and Arabic digits without allowing malformed codes", () => {
    const challengeId = "9f7386ef-a5dd-4e86-88b5-c12cbef16501";
    expect(emailVerifySchema.parse({ challengeId, code: "۱۲۳۴۵۶" }).code).toBe(
      "123456",
    );
    expect(emailVerifySchema.parse({ challengeId, code: "١٢٣٤٥٦" }).code).toBe(
      "123456",
    );
    expect(
      emailVerifySchema.safeParse({ challengeId, code: "12345" }).success,
    ).toBe(false);
    expect(
      emailVerifySchema.safeParse({ challengeId, code: "12e456" }).success,
    ).toBe(false);
    expect(
      emailVerifySchema.safeParse({ challengeId: "bad", code: "123456" })
        .success,
    ).toBe(false);
  });
  it("restricts expiry choices and derives global administration from the verified email", () => {
    expect(invitationSchema.parse({ email: "a@example.com" }).days).toBe(7);
    expect(
      invitationSchema.safeParse({ email: "a@example.com", days: -1 }).success,
    ).toBe(false);
    expect(isSystemAdmin({ email: ADMIN_EMAIL })).toBe(false);
    expect(
      isSystemAdmin({ email: ADMIN_EMAIL, emailVerifiedAt: "2026-10-28" }),
    ).toBe(true);
    expect(
      isSystemAdmin({
        email: "other@example.com",
        emailVerifiedAt: "2026-10-28",
      }),
    ).toBe(false);
  });
});
