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
    username: "legacy-account",
    passwordHash: "legacy-password-hash-preserved",
    name: "Test Administrator",
    role: "admin",
    active: true,
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
  });
  await c.settings.insertOne(initialSettings(userId));
  await c.curricula.insertOne({
    _id: randomUUID(),
    ownerId: userId,
    name: "Legacy private book",
    pages: 25,
    topics: [],
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
  });
  await (await global.mongoConnection!).close();
  global.mongoConnection = undefined;
}
