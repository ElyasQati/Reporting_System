import { hash } from "bcryptjs";
import { ensureIndexes, collections } from "../../src/lib/db";
import { initialSettings } from "../../src/lib/workspace";
import { randomUUID } from "node:crypto";
export default async function setup() {
  if (!process.env.MONGODB_DB?.startsWith("report_desk_test_"))
    throw new Error("Tests require an isolated database.");
  await ensureIndexes();
  const c = await collections();
  const now = new Date().toISOString();
  const userId = randomUUID();
  await c.users.insertOne({
    _id: userId,
    username: "test-admin",
    passwordHash: await hash("Test-Only-Password-2026!", 10),
    name: "Test Administrator",
    role: "admin",
    active: true,
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
  });
  await c.settings.insertOne(initialSettings(userId));
  await (await global.mongoConnection!).close();
  global.mongoConnection = undefined;
}
