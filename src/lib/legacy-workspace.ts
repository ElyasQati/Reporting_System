import { collections } from "./db";
import { initialSettings } from "./workspace";

// Explicit, idempotent setup migration. No request may claim unowned records.
export async function assignLegacyWorkspace(ownerId: string) {
  const c = await collections();
  if (!(await c.users.findOne({ _id: ownerId })))
    throw new Error("LEGACY_OWNER_NOT_FOUND");
  const client = await global.mongoConnection!;
  return client.withSession((session) =>
    session.withTransaction(async () => {
      let migrated = 0;
      for (const name of [
        "classes",
        "people",
        "curricula",
        "reports",
      ] as const) {
        const result = await c[name].updateMany(
          { ownerId: { $exists: false } },
          { $set: { ownerId } },
          { session },
        );
        migrated += result.modifiedCount;
      }
      const previous = await c.settings.findOne(
        { _id: "general" },
        { session },
      );
      await c.settings.updateOne(
        { _id: ownerId },
        {
          $setOnInsert: {
            ...(previous ?? initialSettings(ownerId)),
            _id: ownerId,
            ownerId,
          },
        },
        { upsert: true, session },
      );
      if (previous) await c.settings.deleteOne({ _id: "general" }, { session });
      return migrated;
    }),
  );
}
