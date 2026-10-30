import nextEnv from "@next/env";
import { collections, ensureAuthIndexes } from "../src/lib/db";
import { ADMIN_EMAIL, RETIRED_ADMIN_EMAIL } from "../src/lib/access";
import { migrateAdministrator } from "../src/lib/administrator";
import { ApiError } from "../src/lib/errors";
nextEnv.loadEnvConfig(process.cwd());
try {
  if (process.argv.includes("--apply")) {
    await ensureAuthIndexes();
    const result = await migrateAdministrator();
    console.log(JSON.stringify({ ...result, administrator: ADMIN_EMAIL }));
  } else {
    const c = await collections();
    const source = await c.users.findOne({
      email: RETIRED_ADMIN_EMAIL,
      active: true,
    });
    const target = await c.users.findOne({ email: ADMIN_EMAIL });
    console.log(
      JSON.stringify({
        preview: true,
        administrator: ADMIN_EMAIL,
        sourceFound: Boolean(source),
        targetFound: Boolean(target),
        conflict: Boolean(source && target && source._id !== target._id),
        workspaceIdPreserved: true,
      }),
    );
    console.log(
      "Use --apply to transfer the existing account. Business records and settings are not modified.",
    );
  }
} catch (error) {
  console.error(
    "Administrator transfer failed:",
    error instanceof ApiError
      ? error.code
      : error instanceof Error
        ? error.name
        : "Unknown error",
  );
  process.exitCode = 1;
} finally {
  if (global.mongoConnection) await (await global.mongoConnection).close();
}
