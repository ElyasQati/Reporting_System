import { NextRequest, NextResponse } from "next/server";
import { ApiError, body, errorResponse } from "@/lib/http";
import { emailVerifySchema } from "@/lib/email-validation";
import { verifyEmailCode } from "@/lib/email-auth";
import { createSession } from "@/lib/auth";
import { publicUser } from "@/lib/access";

export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get("origin");
    if (!origin || new URL(origin).host !== request.headers.get("host"))
      throw new ApiError("INVALID_ORIGIN", 403);
    const address =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "local";
    const input = emailVerifySchema.parse(await body(request, 10000));
    const user = await verifyEmailCode(input.challengeId, input.code, address);
    await createSession(user._id, undefined, user.email);
    return NextResponse.json(
      { user: publicUser(user) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
