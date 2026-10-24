import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { MongoServerError } from "mongodb";
import { currentUser } from "./auth";
import type { User } from "./types";
import { ApiError } from "./errors";
export { ApiError } from "./errors";
type Handler = (request: NextRequest, user: User) => Promise<Response>;
export function api(handler: Handler, mutation = false, adminOnly = mutation) {
  return async (request: NextRequest) => {
    try {
      if (mutation) {
        const origin = request.headers.get("origin");
        if (!origin || new URL(origin).host !== request.headers.get("host"))
          throw new ApiError("INVALID_ORIGIN", 403);
      }
      const user = await currentUser();
      if (!user) throw new ApiError("UNAUTHORIZED", 401);
      if (adminOnly && user.role !== "admin")
        throw new ApiError("FORBIDDEN", 403);
      return await handler(request, user);
    } catch (error) {
      return errorResponse(error);
    }
  };
}
export function errorResponse(error: unknown) {
  if (error instanceof ApiError)
    return NextResponse.json({ error: error.code }, { status: error.status });
  if (error instanceof ZodError)
    return NextResponse.json(
      { error: "VALIDATION_ERROR", fields: error.flatten() },
      { status: 422 },
    );
  if (error instanceof MongoServerError && error.code === 11000)
    return NextResponse.json({ error: "DUPLICATE_RECORD" }, { status: 409 });
  // Do not expose connection strings, database errors or credentials in browser responses.
  console.error(
    "[report-desk]",
    error instanceof Error ? error.name : "UnknownError",
  );
  return NextResponse.json({ error: "SERVER_UNAVAILABLE" }, { status: 503 });
}
export async function body(request: NextRequest, maxLength = 1_000_000) {
  const raw = await request.text();
  if (raw.length > maxLength) throw new ApiError("PAYLOAD_TOO_LARGE", 413);
  try {
    return JSON.parse(raw);
  } catch {
    throw new ApiError("INVALID_JSON");
  }
}
