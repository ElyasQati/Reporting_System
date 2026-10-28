import nextEnv from "@next/env";
import { ensureIndexes } from "../src/lib/db";
nextEnv.loadEnvConfig(process.cwd());
// Email accounts are created only after OTP verification. Legacy accounts and
// their ownership are deliberately preserved; setup never reassigns their data.
ensureIndexes()
  .then(() =>
    console.log(
      "Indexes ready. Sign in with elyasqati527@gmail.com to create the administrator's empty workspace.",
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
