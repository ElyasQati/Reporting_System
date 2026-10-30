import { randomBytes, randomUUID } from "node:crypto";
import { MongoServerError } from "mongodb";
import { z } from "zod";
import { collections, ensureMonitorIndexes } from "./db";
import { digest } from "./auth";
import { ApiError } from "./errors";
import { limitAttempts } from "./email-auth";
import type { AuthUser, MonitorAccess } from "./types";

export const monitorCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^M-[A-F0-9]{5}(?:-[A-F0-9]{5}){3}$/),
});
export function monitorStatus(access: MonitorAccess | null) {
  return access
    ? {
        active: access.active,
        createdAt: access.createdAt,
        revokedAt: access.revokedAt,
        lastUsedAt: access.lastUsedAt,
      }
    : null;
}
export async function issueMonitorCode(ownerId: string) {
  await ensureMonitorIndexes();
  await limitAttempts(`monitor-create:${ownerId}`, 30);
  const c = await collections();
  // One atomic owner record; previous hashes stay reserved globally, even after revocation.
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = `M-${randomBytes(10).toString("hex").toUpperCase().match(/.{5}/g)!.join("-")}`;
    const codeHash = digest(code);
    try {
      const access = await c.monitorAccess.findOneAndUpdate(
        { _id: ownerId, ownerId, codeHashes: { $ne: codeHash } },
        {
          $set: {
            generation: randomUUID(),
            codeHash,
            active: true,
            createdAt: new Date().toISOString(),
            revokedAt: null,
            lastUsedAt: null,
          },
          $setOnInsert: { ownerId },
          $push: { codeHashes: codeHash },
        },
        { upsert: true, returnDocument: "after" },
      );
      return { code, access: monitorStatus(access) };
    } catch (error) {
      if (
        !(error instanceof MongoServerError) ||
        error.code !== 11000 ||
        attempt === 2
      )
        throw error;
    }
  }
  throw new ApiError("SERVER_UNAVAILABLE", 503);
}
export async function verifyMonitorCode(
  code: string,
  address: string,
): Promise<AuthUser> {
  await ensureMonitorIndexes();
  await limitAttempts(`monitor-login:${digest(address)}`, 20);
  const c = await collections();
  const access = await c.monitorAccess.findOne({
    codeHash: digest(code),
    active: true,
  });
  if (!access) throw new ApiError("MONITOR_CODE_INVALID", 401);
  const owner = await c.users.findOne({ _id: access.ownerId, active: true });
  if (
    !owner?.emailVerifiedAt ||
    !owner.email ||
    owner.role === "viewer" ||
    owner.role === "monitor"
  )
    throw new ApiError("MONITOR_CODE_INVALID", 401);
  // A generation check makes concurrent rotation/revocation invalidate this login too.
  const used = await c.monitorAccess.updateOne(
    { _id: access._id, generation: access.generation, active: true },
    { $set: { lastUsedAt: new Date().toISOString() } },
  );
  if (!used.matchedCount) throw new ApiError("MONITOR_CODE_INVALID", 401);
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
