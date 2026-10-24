import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { collections } from "./db";
import type { User } from "./types";
export const sessionCookie = "report_desk_session";
export function digest(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get(sessionCookie)?.value;
  if (!token) return null;
  const c = await collections();
  const session = await c.sessions.findOne({
    _id: digest(token),
    expiresAt: { $gt: new Date() },
  });
  return session
    ? c.users.findOne({ _id: session.userId, active: true })
    : null;
}
export async function createSession(userId: string) {
  const c = await collections();
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
  await c.sessions.insertOne({
    _id: digest(token),
    userId,
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
