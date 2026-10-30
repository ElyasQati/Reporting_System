import type { AuthUser, User } from "./types";

export const ADMIN_EMAIL = "elyasqati527@gmail.com";
export function isSystemAdmin(
  user: Pick<User, "email" | "emailVerifiedAt"> & Partial<Pick<User, "role">>,
) {
  return (
    user.role !== "monitor" &&
    user.email === ADMIN_EMAIL &&
    Boolean(user.emailVerifiedAt)
  );
}
export function workspaceOwner(user: AuthUser) {
  return user.workspaceOwnerId ?? user._id;
}
export function isReadOnly(user: Pick<User, "role">) {
  return user.role === "monitor" || user.role === "viewer";
}
export function publicUser(user: AuthUser) {
  return {
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role === "member" ? "supervisor" : user.role,
    isSystemAdmin: isSystemAdmin(user),
  };
}
