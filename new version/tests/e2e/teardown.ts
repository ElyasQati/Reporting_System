import { database } from "../../src/lib/db";
export default async function teardown() {
  if (!process.env.MONGODB_DB?.startsWith("report_desk_test_"))
    throw new Error("Refusing to clean a non-test database.");
  await (await database()).dropDatabase();
  await (await global.mongoConnection!).close();
  global.mongoConnection = undefined;
}
