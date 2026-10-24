import { describe, expect, it } from "vitest";
import { registrationSchema } from "../src/lib/validation";

describe("self-service registration", () => {
  const valid = {
    name: "سرنگران آزمایشی",
    username: "supervisor.one",
    password: "Long-Password-2026!",
  };
  it("accepts independent account credentials and discards requested ownership and roles", () => {
    const result = registrationSchema.parse({
      ...valid,
      ownerId: "someone-else",
      role: "viewer",
      active: false,
    });
    expect(result).toEqual(valid);
  });
  it("normalizes usernames and rejects invalid or too-short usernames", () => {
    expect(
      registrationSchema.parse({ ...valid, username: " Ａlpha.one " }).username,
    ).toBe("Alpha.one");
    expect(
      registrationSchema.safeParse({ ...valid, username: "a" }).success,
    ).toBe(false);
    expect(
      registrationSchema.safeParse({ ...valid, username: "two users" }).success,
    ).toBe(false);
  });
  it("requires a password that bcrypt can hash without truncation", () => {
    expect(
      registrationSchema.safeParse({ ...valid, password: "short" }).success,
    ).toBe(false);
    expect(
      registrationSchema.safeParse({ ...valid, password: "س".repeat(37) })
        .success,
    ).toBe(false);
    expect(
      registrationSchema.safeParse({ ...valid, password: "x".repeat(72) })
        .success,
    ).toBe(true);
  });
});
