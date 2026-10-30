import { MongoClient } from "mongodb";
import type {
  Curriculum,
  Person,
  Report,
  SchoolClass,
  Session,
  Settings,
  User,
  Invitation,
  EmailChallenge,
  MonitorAccess,
} from "./types";
declare global {
  var mongoConnection: Promise<MongoClient> | undefined;
}
export async function database() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("DATABASE_NOT_CONFIGURED");
  if (!global.mongoConnection) {
    global.mongoConnection = new MongoClient(uri, {
      serverSelectionTimeoutMS: 20000,
      connectTimeoutMS: 30000,
      maxPoolSize: 5,
      maxConnecting: 1,
    })
      .connect()
      .catch((error) => {
        global.mongoConnection = undefined;
        throw error;
      });
  }
  return (await global.mongoConnection).db(
    process.env.MONGODB_DB || "report_desk",
  );
}
export async function collections() {
  const db = await database();
  return {
    db,
    classes: db.collection<SchoolClass>("classes"),
    people: db.collection<Person>("people"),
    curricula: db.collection<Curriculum>("curricula"),
    reports: db.collection<Report>("reports"),
    settings: db.collection<Settings>("settings"),
    users: db.collection<User>("users"),
    sessions: db.collection<Session>("sessions"),
    invitations: db.collection<Invitation>("invitations"),
    emailChallenges: db.collection<EmailChallenge>("email_challenges"),
    monitorAccess: db.collection<MonitorAccess>("monitor_access"),
  };
}
export async function ensureIndexes() {
  const c = await collections();
  await Promise.all([
    c.classes.createIndex({ ownerId: 1, number: 1 }, { unique: true }),
    c.people.createIndex({ ownerId: 1, kind: 1, name: 1 }),
    c.curricula.createIndex({ ownerId: 1, name: 1 }, { unique: true }),
    c.users.createIndex(
      { username: 1 },
      {
        unique: true,
        name: "username_case_insensitive",
        collation: { locale: "en", strength: 2 },
      },
    ),
    c.sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    ...emailIndexes(c),
    ...monitorIndexes(c),
    c.reports.createIndex(
      { ownerId: 1, classId: 1, weekStart: 1 },
      {
        unique: true,
        partialFilterExpression: {
          weekStart: { $type: "string" },
          archivedAt: null,
        },
      },
    ),
    c.reports.createIndex({ ownerId: 1, reportDate: 1 }),
    c.reports.createIndex({ ownerId: 1, supervisorId: 1, weekStart: 1 }),
    c.settings.createIndex(
      { ownerId: 1 },
      {
        unique: true,
        partialFilterExpression: { ownerId: { $type: "string" } },
      },
    ),
    c.db
      .collection("login_attempts")
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
  ]);
  // Replace the previous global uniqueness rules only after scoped indexes exist.
  for (const [collection, names] of [
    [c.classes, ["number_1"]],
    [c.curricula, ["name_1"]],
    [c.users, ["username_1"]],
    [c.reports, ["classId_1_weekStart_1"]],
  ] as const) {
    const existing = await collection.listIndexes().toArray();
    for (const name of names)
      if (existing.some((index) => index.name === name))
        await collection.dropIndex(name);
  }
}

function monitorIndexes(c: Awaited<ReturnType<typeof collections>>) {
  return [
    c.monitorAccess.createIndex({ codeHashes: 1 }, { unique: true }),
    c.monitorAccess.createIndex({ generation: 1 }, { unique: true }),
    c.monitorAccess.createIndex({ ownerId: 1 }, { unique: true }),
    c.sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
  ];
}
let monitorIndexPromise: Promise<unknown> | undefined;
export async function ensureMonitorIndexes() {
  const c = await collections();
  monitorIndexPromise ??= Promise.all(monitorIndexes(c)).catch((error) => {
    monitorIndexPromise = undefined;
    throw error;
  });
  await monitorIndexPromise;
}

function emailIndexes(c: Awaited<ReturnType<typeof collections>>) {
  return [
    c.users.createIndex(
      { email: 1 },
      { unique: true, partialFilterExpression: { email: { $type: "string" } } },
    ),
    c.invitations.createIndex({ codeHash: 1 }, { unique: true }),
    c.invitations.createIndex({ createdAt: -1 }),
    c.emailChallenges.createIndex({ email: 1 }, { unique: true }),
    c.emailChallenges.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    c.db
      .collection("login_attempts")
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
  ];
}

let authIndexes: Promise<unknown> | undefined;
export async function ensureAuthIndexes() {
  const c = await collections();
  authIndexes ??= Promise.all(emailIndexes(c)).catch((error) => {
    authIndexes = undefined;
    throw error;
  });
  await authIndexes;
}
