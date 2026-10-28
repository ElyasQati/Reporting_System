import type { User } from "./types";

export const ADMIN_EMAIL = "elyasqati527@gmail.com";
export function isSystemAdmin(user: Pick<User, "email" | "emailVerifiedAt">) {
  return user.email === ADMIN_EMAIL && Boolean(user.emailVerifiedAt);
}
export function publicUser(user: User) {
  return {
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
    isSystemAdmin: isSystemAdmin(user),
  };
}
