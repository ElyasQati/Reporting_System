import { NextRequest, NextResponse } from "next/server";
import { ApiError, body, errorResponse } from "@/lib/http";
import { createSession } from "@/lib/auth";
import { publicUser, workspaceOwner } from "@/lib/access";
import { monitorCodeSchema, verifyMonitorCode } from "@/lib/monitor";

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
    const { code } = monitorCodeSchema.parse(await body(request, 10000));
    const user = await verifyMonitorCode(code, address);
    await createSession(workspaceOwner(user), user.monitorAccessId);
    return NextResponse.json(
      { user: publicUser(user) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
