import { NextResponse } from "next/server";
import { api } from "@/lib/http";
import { collections } from "@/lib/db";
import { isReadOnly } from "@/lib/access";
import { ApiError } from "@/lib/errors";
import { issueMonitorCode, monitorStatus } from "@/lib/monitor";

export const GET = api(async (_request, user) => {
  if (isReadOnly(user)) throw new ApiError("FORBIDDEN", 403);
  const c = await collections();
  const access = await c.monitorAccess.findOne({ _id: user._id });
  return NextResponse.json(
    { access: monitorStatus(access) },
    { headers: { "Cache-Control": "no-store" } },
  );
});
export const POST = api(async (_request, user) => {
  return NextResponse.json(await issueMonitorCode(user._id), {
    status: 201,
    headers: { "Cache-Control": "no-store" },
  });
}, true);
export const DELETE = api(async (_request, user) => {
  const c = await collections();
  await c.monitorAccess.updateOne(
    { _id: user._id, active: true },
    { $set: { active: false, revokedAt: new Date().toISOString() } },
  );
  return NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}, true);
