import { describe, expect, it } from "vitest";
import {
  ADMIN_EMAIL,
  isReadOnly,
  isSystemAdmin,
  publicUser,
  workspaceOwner,
} from "../src/lib/access";
import type { AuthUser } from "../src/lib/types";

describe("monitor principals", () => {
  const monitor: AuthUser = {
    _id: "session-generation",
    workspaceOwnerId: "supervisor-a",
    monitorAccessId: "session-generation",
    role: "monitor",
    email: ADMIN_EMAIL,
    emailVerifiedAt: "2026-10-30",
    name: "Supervisor A",
    username: "",
    active: true,
    createdAt: "",
    updatedAt: "",
    archivedAt: null,
  };
  it("resolves the linked workspace without inheriting administrator privileges", () => {
    expect(workspaceOwner(monitor)).toBe("supervisor-a");
    expect(isReadOnly(monitor)).toBe(true);
    expect(isSystemAdmin(monitor)).toBe(false);
    expect(publicUser(monitor).isSystemAdmin).toBe(false);
  });
  it("preserves legacy members' workspace and exposes the supervisor role", () => {
    const member = {
      ...monitor,
      _id: "legacy-owner",
      workspaceOwnerId: undefined,
      role: "member" as const,
    };
    expect(workspaceOwner(member)).toBe("legacy-owner");
    expect(publicUser(member).role).toBe("supervisor");
    expect(isReadOnly(member)).toBe(false);
  });
});
