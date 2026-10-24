import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { createHash } from "node:crypto";
import { MongoServerError } from "mongodb";
import { collections } from "@/lib/db";
import { ApiError, body, errorResponse } from "@/lib/http";
import { registrationSchema } from "@/lib/validation";
import { base } from "@/lib/services";
import { initialSettings } from "@/lib/workspace";
import { createSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get("origin");
    if (!origin || new URL(origin).host !== request.headers.get("host"))
      throw new ApiError("INVALID_ORIGIN", 403);
    const input = registrationSchema.parse(await body(request, 10000));
    const c = await collections();
    const address =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "local";
    const bucket = Math.floor(Date.now() / (15 * 60_000));
    const key = `signup:${createHash("sha256").update(address).digest("hex")}:${bucket}`;
    const attempts = await c.db
      .collection<{ _id: string; count: number; expiresAt: Date }>(
        "login_attempts",
      )
      .findOneAndUpdate(
        { _id: key },
        {
          $inc: { count: 1 },
          $setOnInsert: { expiresAt: new Date((bucket + 1) * 15 * 60_000) },
        },
        { upsert: true, returnDocument: "after" },
      );
    if (attempts && attempts.count > 10)
      throw new ApiError("TOO_MANY_ATTEMPTS", 429);
    const user = {
      ...base(),
      name: input.name,
      username: input.username,
      passwordHash: await hash(input.password, 12),
      role: "admin" as const,
      active: true,
    };
    const client = await global.mongoConnection!;
    await client.withSession((session) =>
      session.withTransaction(async () => {
        await c.users.insertOne(user, { session });
        await c.settings.insertOne(initialSettings(user._id), { session });
      }),
    );
    await createSession(user._id);
    return NextResponse.json(
      { user: { name: user.name, username: user.username, role: user.role } },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000)
      return errorResponse(new ApiError("USERNAME_TAKEN", 409));
    return errorResponse(error);
  }
}
