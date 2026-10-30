import { randomUUID } from "node:crypto";
import { MongoServerError } from "mongodb";
import { collections } from "./db";
import { ADMIN_EMAIL, RETIRED_ADMIN_EMAIL } from "./access";
import { ApiError } from "./errors";

const migrationId = "administrator-email-2026-10-31";
interface AdministratorMigration {
  _id: string;
  status: "transferred" | "not_needed";
  ownerId?: string;
  completedAt: string;
}

/** Change the account's sign-in identity, never its workspace ID or business data. */
export async function migrateAdministrator() {
  const c = await collections();
  const migrations = c.db.collection<AdministratorMigration>("migrations");
  const result = await (
    await global.mongoConnection!
  )
    .withSession((session) =>
      session.withTransaction(async () => {
        const done = await migrations.findOne(
          { _id: migrationId },
          { session },
        );
        if (done) return done;
        const source = await c.users.findOne(
          { email: RETIRED_ADMIN_EMAIL },
          { session },
        );
        const target = await c.users.findOne(
          { email: ADMIN_EMAIL },
          { session },
        );
        if (source && target && source._id !== target._id)
          throw new ApiError("ADMIN_TRANSFER_CONFLICT", 409);
        const now = new Date().toISOString();
        if (source) {
          await c.users.updateOne(
            { _id: source._id },
            {
              $set: {
                email: ADMIN_EMAIL,
                username:
                  source.username === RETIRED_ADMIN_EMAIL
                    ? ADMIN_EMAIL
                    : source.username,
                role: "admin",
                active: true,
                updatedAt: now,
                emailChangedAt: now,
              },
              $unset: { emailVerifiedAt: "", passwordHash: "" },
            },
            { session },
          );
          await c.sessions.deleteMany({ userId: source._id }, { session });
        }
        await c.emailChallenges.deleteMany(
          { email: { $in: [RETIRED_ADMIN_EMAIL, ADMIN_EMAIL] } },
          { session },
        );
        await c.invitations.updateMany(
          {
            email: { $in: [RETIRED_ADMIN_EMAIL, ADMIN_EMAIL] },
            usedAt: null,
            revokedAt: null,
          },
          { $set: { revokedAt: now } },
          { session },
        );
        const record: AdministratorMigration = {
          _id: migrationId,
          status: source ? "transferred" : "not_needed",
          ...(source ? { ownerId: source._id } : {}),
          completedAt: now,
        };
        await migrations.insertOne(record, { session });
        return record;
      }),
    )
    .catch(async (error: unknown) => {
      // Two cold instances can race when recording a migration on a fresh database.
      if (error instanceof MongoServerError && error.code === 11000) {
        const done = await migrations.findOne({ _id: migrationId });
        if (done) return done;
      }
      throw error;
    });
  if (!result) throw new ApiError("SERVER_UNAVAILABLE", 503);
  if (result.status === "transferred") {
    // A disabled, data-free reservation also blocks old deployment instances
    // from recreating this address during release or rollback. Reserve after
    // commit: MongoDB cannot reuse a unique email freed in that transaction.
    const now = new Date().toISOString();
    const id = randomUUID();
    await c.users.updateOne(
      { email: RETIRED_ADMIN_EMAIL },
      {
        $set: { active: false, role: "viewer" },
        $unset: { emailVerifiedAt: "", passwordHash: "" },
        $setOnInsert: {
          _id: id,
          email: RETIRED_ADMIN_EMAIL,
          username: `retired-${id}`,
          name: "Retired administrator",
          createdAt: now,
          updatedAt: now,
          archivedAt: now,
        },
      },
      { upsert: true },
    );
  }
  return result;
}

let migration: Promise<unknown> | undefined;
export async function ensureAdministratorMigration() {
  migration ??= migrateAdministrator().catch((error) => {
    migration = undefined;
    throw error;
  });
  await migration;
}
