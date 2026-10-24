import nextEnv from "@next/env";
import { database } from "../src/lib/db";
nextEnv.loadEnvConfig(process.cwd());
async function check() {
  await (await database()).command({ ping: 1 });
  console.log("MongoDB connection successful.");
}
check()
  .catch((error) => {
    console.error(
      "MongoDB connection failed:",
      error instanceof Error ? error.name : "Unknown error",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    if (global.mongoConnection) await (await global.mongoConnection).close();
  });
