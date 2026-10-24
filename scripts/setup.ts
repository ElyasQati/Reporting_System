import nextEnv from "@next/env";
import { hash } from "bcryptjs";
import { collections, ensureIndexes } from "../src/lib/db";
import { base } from "../src/lib/services";
import { assignLegacyWorkspace } from "../src/lib/legacy-workspace";
nextEnv.loadEnvConfig(process.cwd());
async function setup() {
  await ensureIndexes();
  const c = await collections();
  const username = process.env.ADMIN_USERNAME || "admin";
  let administrator = await c.users.findOne(
    { username },
    { collation: { locale: "en", strength: 2 } },
  );
  if (!administrator) {
    const passwordHash =
      process.env.ADMIN_PASSWORD_HASH ||
      (process.env.ADMIN_PASSWORD
        ? await hash(process.env.ADMIN_PASSWORD, 12)
        : "");
    if (!passwordHash)
      throw new Error(
        "Set ADMIN_PASSWORD or ADMIN_PASSWORD_HASH in .env before setup.",
      );
    administrator = {
      ...base(),
      username,
      passwordHash,
      name: username,
      role: "admin" as const,
      active: true,
    };
    await c.users.insertOne(administrator);
    console.log(
      "Administrator created. Existing passwords are never overwritten.",
    );
  } else console.log("Administrator already exists.");
  const migrated = await assignLegacyWorkspace(administrator._id);
  console.log(
    `Assigned ${migrated} legacy business records to the existing administrator.`,
  );
  console.log(
    "Database indexes and Friday-to-Thursday reporting calendar are ready.",
  );
}
setup()
  .catch((error) => {
    console.error(
      "Setup failed:",
      error instanceof Error ? error.name : "Unknown error",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    if (global.mongoConnection) await (await global.mongoConnection).close();
  });
