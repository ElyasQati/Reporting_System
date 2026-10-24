import { NextResponse } from "next/server";
import { api, ApiError, body } from "@/lib/http";
import { workspaceCollections, initialSettings } from "@/lib/workspace";
import { settingsSchema } from "@/lib/validation";
export const PUT = api(async (request, user) => {
  const data = settingsSchema.parse(await body(request));
  const c = await workspaceCollections(user._id);
  const current =
    (await c.settings.findOne({ _id: user._id })) ?? initialSettings(user._id);
  if (
    (data.weekStartsOn !== current.weekStartsOn ||
      data.timezone !== current.timezone ||
      data.deadlineDay !== current.deadlineDay ||
      data.deadlineHour !== current.deadlineHour) &&
    (await c.reports.countDocuments({ weekStart: { $ne: null } }))
  )
    throw new ApiError("CALENDAR_HAS_REPORTS", 409);
  await c.settings.updateOne(
    { _id: user._id },
    { $set: data },
    { upsert: true },
  );
  return NextResponse.json({ ok: true });
}, true);
