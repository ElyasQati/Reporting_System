import { NextRequest, NextResponse } from "next/server";
import { ApiError, body, errorResponse } from "@/lib/http";
import { emailLoginSchema } from "@/lib/email-validation";
import { requestEmailCode } from "@/lib/email-auth";

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
    const input = emailLoginSchema.parse(await body(request, 10000));
    return NextResponse.json(await requestEmailCode(input, address), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
