import { publicUser, workspaceOwner } from "@/lib/access";
import { NextResponse } from "next/server";
import { api, ApiError } from "@/lib/http";
import { workspaceCollections, initialSettings } from "@/lib/workspace";
import { calendarParts, closedWeeks, dateKey, monthBounds } from "@/lib/dates";
export const GET = api(async (request, user) => {
  const ownerId = workspaceOwner(user);
  const c = await workspaceCollections(ownerId);
  const settings =
    (await c.settings.findOne({ _id: ownerId })) ?? initialSettings(ownerId);
  const calendar =
    request.nextUrl.searchParams.get("calendar") === "persian"
      ? "persian"
      : "gregory";
  const today = calendarParts(dateKey(new Date(), settings.timezone), calendar);
  const period =
    request.nextUrl.searchParams.get("period") ||
    `${today.year}-${String(today.month).padStart(2, "0")}`;
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period))
    throw new ApiError("INVALID_PERIOD");
  const { from, to } = monthBounds(period, calendar);
  const [classes, people, curricula, reports, legacyCount] = await Promise.all([
    c.classes.find().sort({ number: 1 }).toArray(),
    c.people.find().sort({ name: 1 }).toArray(),
    c.curricula.find().sort({ name: 1 }).toArray(),
    c.reports
      .find({
        $or: [
          { reportDate: { $gte: from, $lt: to } },
          { weekStart: { $gte: closedWeeks(settings)[0] } },
          { reportDate: null },
        ],
      })
      .sort({ reportDate: -1 })
      .limit(25001)
      .toArray(),
    c.reports.countDocuments({ reportDate: null }),
  ]);
  if (reports.length > 25000)
    throw new ApiError("REPORT_WINDOW_TOO_LARGE", 422);
  return NextResponse.json(
    {
      classes,
      people,
      curricula,
      reports,
      settings,
      period,
      legacyCount,
      user: publicUser(user),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
});
