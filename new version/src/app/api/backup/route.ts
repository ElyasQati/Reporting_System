import { NextResponse } from "next/server";
import { api } from "@/lib/http";
import { workspaceCollections } from "@/lib/workspace";
export const GET = api(async (_request, user) => {
  if (user.role !== "admin")
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const c = await workspaceCollections(user._id);
  const client = await global.mongoConnection!;
  const data = await client.withSession((session) =>
    session.withTransaction(
      async () => {
        // MongoDB transactions do not support parallel operations on the same session.
        const classes = await c.classes.find({}, { session }).toArray();
        const people = await c.people.find({}, { session }).toArray();
        const curricula = await c.curricula.find({}, { session }).toArray();
        const reports = await c.reports.find({}, { session }).toArray();
        const settings = await c.settings.findOne(
          { _id: user._id },
          { session },
        );
        return [classes, people, curricula, reports, settings] as const;
      },
      { readConcern: { level: "snapshot" } },
    ),
  );
  return new Response(
    JSON.stringify(
      {
        version: 2,
        exportedAt: new Date().toISOString(),
        classes: data[0],
        people: data[1],
        curricula: data[2],
        reports: data[3],
        settings: data[4],
      },
      null,
      2,
    ),
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="report-desk-${new Date().toISOString().slice(0, 10)}.json"`,
        "Cache-Control": "no-store",
      },
    },
  );
});
