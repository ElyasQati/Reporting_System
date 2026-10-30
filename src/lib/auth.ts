import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { collections } from "./db";
import type { AuthUser } from "./types";
import { RETIRED_ADMIN_EMAIL } from "./access";
import { ensureAdministratorMigration } from "./administrator";
export const sessionCookie = "report_desk_session";
export function digest(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
export async function currentUser(): Promise<AuthUser | null> {
  const token = (await cookies()).get(sessionCookie)?.value;
  if (!token) return null;
  await ensureAdministratorMigration();
  const c = await collections();
  const session = await c.sessions.findOne({
    _id: digest(token),
    expiresAt: { $gt: new Date() },
  });
  if (!session) return null;
  if (session.monitorAccessId) {
    const access = await c.monitorAccess.findOne({
      generation: session.monitorAccessId,
      active: true,
    });
    if (!access || access.ownerId !== session.userId) return null;
    const owner = await c.users.findOne({ _id: access.ownerId, active: true });
    if (
      !owner?.email ||
      owner.email === RETIRED_ADMIN_EMAIL ||
      !owner.emailVerifiedAt ||
      owner.role === "viewer" ||
      owner.role === "monitor"
    )
      return null;
    return {
      _id: access.generation,
      workspaceOwnerId: owner._id,
      monitorAccessId: access.generation,
      name: owner.name,
      username: "",
      role: "monitor",
      active: true,
      createdAt: access.createdAt,
      updatedAt: access.createdAt,
      archivedAt: null,
    };
  }
  const user = await c.users.findOne({ _id: session.userId, active: true });
  // Legacy password sessions cannot bypass email verification or invitations.
  return user?.email &&
    user.email !== RETIRED_ADMIN_EMAIL &&
    user.emailVerifiedAt &&
    user.role !== "monitor" &&
    (!user.emailChangedAt || session.authenticatedEmail === user.email)
    ? user
    : null;
}
export async function createSession(
  userId: string,
  monitorAccessId?: string,
  authenticatedEmail?: string,
) {
  const c = await collections();
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
  await c.sessions.insertOne({
    _id: digest(token),
    userId,
    ...(authenticatedEmail ? { authenticatedEmail } : {}),
    ...(monitorAccessId ? { monitorAccessId } : {}),
    expiresAt,
    createdAt: new Date().toISOString(),
  });
  (await cookies()).set(sessionCookie, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}
export async function destroySession() {
  const token = (await cookies()).get(sessionCookie)?.value;
  if (token) {
    const c = await collections();
    await c.sessions.deleteOne({ _id: digest(token) });
  }
  (await cookies()).delete(sessionCookie);
}
