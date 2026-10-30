import { randomBytes, randomInt, randomUUID } from "node:crypto";
import { compare, hash } from "bcryptjs";
import { MongoServerError } from "mongodb";
import { collections, ensureAuthIndexes } from "./db";
import { digest } from "./auth";
import { ADMIN_EMAIL, RETIRED_ADMIN_EMAIL } from "./access";
import { ensureAdministratorMigration } from "./administrator";
import { ApiError } from "./errors";
import { sendLoginCode } from "./mail";
import { initialSettings } from "./workspace";
import { base } from "./services";
import type { Locale, User } from "./types";

export async function limitAttempts(
  key: string,
  max: number,
  windowMs = 15 * 60000,
) {
  const c = await collections();
  const bucket = Math.floor(Date.now() / windowMs);
  const result = await c.db
    .collection<{ _id: string; count: number; expiresAt: Date }>(
      "login_attempts",
    )
    .findOneAndUpdate(
      { _id: `${key}:${bucket}` },
      {
        $inc: { count: 1 },
        $setOnInsert: { expiresAt: new Date((bucket + 1) * windowMs) },
      },
      { upsert: true, returnDocument: "after" },
    );
  if (result && result.count > max)
    throw new ApiError("TOO_MANY_ATTEMPTS", 429);
}

export async function issueInvitation(
  email: string,
  days: number,
  createdBy: string,
) {
  await ensureAuthIndexes();
  await ensureAdministratorMigration();
  if (email === RETIRED_ADMIN_EMAIL)
    throw new ApiError("ACCOUNT_DISABLED", 403);
  const c = await collections();
  if (email === ADMIN_EMAIL || (await c.users.findOne({ email })))
    throw new ApiError("EMAIL_ALREADY_REGISTERED", 409);
  // A separate code for each email; 80 random bits, shown only on creation.
  const code = `W-${randomBytes(10).toString("hex").toUpperCase()}`;
  const invitation = {
    _id: randomUUID(),
    email,
    codeHash: digest(code),
    createdBy,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + days * 86400000),
    usedAt: null,
    usedBy: null,
    revokedAt: null,
  };
  await c.invitations.insertOne(invitation);
  return { id: invitation._id, code, email, expiresAt: invitation.expiresAt };
}

export async function requestEmailCode(
  input: {
    email: string;
    name?: string;
    invitationCode?: string;
    locale: Locale;
  },
  address: string,
) {
  await ensureAuthIndexes();
  await ensureAdministratorMigration();
  if (input.email === RETIRED_ADMIN_EMAIL)
    throw new ApiError("ACCOUNT_DISABLED", 403);
  await limitAttempts(`otp-ip:${digest(address)}`, 30);
  await limitAttempts(`otp-email:${digest(input.email)}`, 10);
  const c = await collections();
  const user = await c.users.findOne({ email: input.email });
  if (user && !user.active) throw new ApiError("ACCOUNT_DISABLED", 403);
  let invitationId: string | null = null;
  if (!user && input.email !== ADMIN_EMAIL) {
    if (!input.invitationCode || !input.name)
      throw new ApiError("INVITATION_REQUIRED", 403);
    const invitation = await c.invitations.findOne({
      email: input.email,
      codeHash: digest(input.invitationCode),
      expiresAt: { $gt: new Date() },
      usedAt: null,
      revokedAt: null,
    });
    if (!invitation) throw new ApiError("INVITATION_INVALID", 403);
    invitationId = invitation._id;
  }
  const cooldown = c.db.collection<{ _id: string; expiresAt: Date }>(
    "login_attempts",
  );
  const cooldownId = `otp-cooldown:${digest(input.email)}`;
  try {
    await cooldown.findOneAndUpdate(
      { _id: cooldownId, expiresAt: { $lte: new Date() } },
      { $set: { expiresAt: new Date(Date.now() + 60000) } },
      { upsert: true },
    );
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000)
      throw new ApiError("OTP_RESEND_WAIT", 429);
    throw error;
  }
  const code = String(randomInt(100000, 1000000));
  const challenge = {
    _id: randomUUID(),
    email: input.email,
    name: input.name || user?.name || input.email.split("@")[0],
    invitationId,
    codeHash: await hash(code, 10),
    expiresAt: new Date(Date.now() + 5 * 60000),
    attempts: 0,
    delivered: false,
  };
  await c.emailChallenges.deleteMany({ email: input.email });
  await c.emailChallenges.insertOne(challenge);
  try {
    await sendLoginCode(input.email, code, input.locale);
    await c.emailChallenges.updateOne(
      { _id: challenge._id },
      { $set: { delivered: true } },
    );
  } catch (error) {
    await c.emailChallenges.deleteOne({ _id: challenge._id });
    await cooldown.deleteOne({ _id: cooldownId });
    throw error;
  }
  return {
    challengeId: challenge._id,
    expiresAt: challenge.expiresAt,
    retryAfter: 60,
  };
}

export async function verifyEmailCode(
  challengeId: string,
  code: string,
  address: string,
) {
  await ensureAdministratorMigration();
  await limitAttempts(`verify-ip:${digest(address)}`, 60);
  const c = await collections();
  const challenge = await c.emailChallenges.findOneAndUpdate(
    {
      _id: challengeId,
      expiresAt: { $gt: new Date() },
      attempts: { $lt: 5 },
      delivered: true,
    },
    { $inc: { attempts: 1 } },
    { returnDocument: "after" },
  );
  if (
    !challenge ||
    challenge.email === RETIRED_ADMIN_EMAIL ||
    !(await compare(code, challenge.codeHash))
  )
    throw new ApiError("OTP_INVALID", 401);
  const client = await global.mongoConnection!;
  const user = await client.withSession((session) =>
    session.withTransaction(async () => {
      const consumed = await c.emailChallenges.deleteOne(
        {
          _id: challengeId,
          codeHash: challenge.codeHash,
          delivered: true,
          attempts: { $lte: 5 },
          expiresAt: { $gt: new Date() },
        },
        { session },
      );
      if (!consumed.deletedCount) throw new ApiError("OTP_INVALID", 401);
      let account = await c.users.findOne(
        { email: challenge.email },
        { session },
      );
      if (account && !account.active)
        throw new ApiError("ACCOUNT_DISABLED", 403);
      const now = new Date().toISOString();
      const role =
        challenge.email === ADMIN_EMAIL
          ? ("admin" as const)
          : ("supervisor" as const);
      if (!account) {
        account = {
          ...base(),
          username: challenge.email,
          email: challenge.email,
          emailVerifiedAt: now,
          name: challenge.name,
          role,
          active: true,
        };
        if (challenge.email !== ADMIN_EMAIL) {
          const accepted = await c.invitations.updateOne(
            {
              _id: challenge.invitationId || "",
              email: challenge.email,
              expiresAt: { $gt: new Date() },
              usedAt: null,
              revokedAt: null,
            },
            { $set: { usedAt: now, usedBy: account._id } },
            { session },
          );
          if (!accepted.modifiedCount)
            throw new ApiError("INVITATION_INVALID", 403);
        }
        await c.users.insertOne(account, { session });
        await c.settings.insertOne(initialSettings(account._id), { session });
      } else {
        await c.users.updateOne(
          { _id: account._id },
          { $set: { emailVerifiedAt: now, updatedAt: now, role } },
          { session },
        );
        account = { ...account, emailVerifiedAt: now, role };
      }
      return account as User;
    }),
  );
  if (!user) throw new ApiError("OTP_INVALID", 401);
  return user;
}
