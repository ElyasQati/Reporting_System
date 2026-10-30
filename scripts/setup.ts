import nextEnv from "@next/env";
import { ensureIndexes } from "../src/lib/db";
import { ensureAdministratorMigration } from "../src/lib/administrator";
import { ADMIN_EMAIL } from "../src/lib/access";
nextEnv.loadEnvConfig(process.cwd());
// Email accounts are created only after OTP verification. Legacy accounts and
// their ownership are deliberately preserved; setup never reassigns their data.
ensureIndexes()
  .then(ensureAdministratorMigration)
  .then(() =>
    console.log(
      `Indexes ready. Sign in with ${ADMIN_EMAIL}. Existing administrator workspace ownership is preserved.`,
    ),
  )
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
