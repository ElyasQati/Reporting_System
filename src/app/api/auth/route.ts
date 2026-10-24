import { NextRequest, NextResponse } from "next/server";
import { compare, hash } from "bcryptjs";
import { createSession, currentUser, destroySession } from "@/lib/auth";
import { collections } from "@/lib/db";
import { ApiError, api, body, errorResponse } from "@/lib/http";
import { loginSchema, passwordSchema } from "@/lib/validation";
export async function GET() {
  try {
    const user = await currentUser();
    return NextResponse.json({
      user: user
        ? { name: user.name, username: user.username, role: user.role }
        : null,
    });
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get("origin");
    if (!origin || new URL(origin).host !== request.headers.get("host"))
      throw new ApiError("INVALID_ORIGIN", 403);
    const data = loginSchema.parse(await body(request));
    const c = await collections();
    const key = data.username.normalize("NFKC").toLowerCase();
    const attempts = c.db.collection<{
      _id: string;
      count: number;
      expiresAt: Date;
    }>("login_attempts");
    const attempt = await attempts.findOne({
      _id: key,
      expiresAt: { $gt: new Date() },
    });
    if (attempt && attempt.count >= 10)
      throw new ApiError("TOO_MANY_ATTEMPTS", 429);
    const user = await c.users.findOne(
      { username: data.username, active: true },
      { collation: { locale: "en", strength: 2 } },
    );
    if (!user || !(await compare(data.password, user.passwordHash))) {
      if (!attempt) await attempts.deleteOne({ _id: key });
      await attempts.updateOne(
        { _id: key },
        {
          $inc: { count: 1 },
          $setOnInsert: { expiresAt: new Date(Date.now() + 15 * 60_000) },
        },
        { upsert: true },
      );
      throw new ApiError("INVALID_CREDENTIALS", 401);
    }
    await attempts.deleteOne({ _id: key });
    await createSession(user._id);
    return NextResponse.json({
      user: { name: user.name, username: user.username, role: user.role },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
export const DELETE = api(
  async () => {
    await destroySession();
    return NextResponse.json({ ok: true });
  },
  true,
  false,
);
export const PATCH = api(
  async (request, user) => {
    const data = passwordSchema.parse(await body(request));
    if (!(await compare(data.currentPassword, user.passwordHash)))
      throw new ApiError("INVALID_CREDENTIALS", 401);
    const c = await collections();
    await c.users.updateOne(
      { _id: user._id },
      {
        $set: {
          passwordHash: await hash(data.password, 12),
          updatedAt: new Date().toISOString(),
        },
      },
    );
    await c.sessions.deleteMany({ userId: user._id });
    await createSession(user._id);
    return NextResponse.json({ ok: true });
  },
  true,
  false,
);
