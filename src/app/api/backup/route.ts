import { NextResponse } from "next/server";
import { api } from "@/lib/http";
import { workspaceCollections } from "@/lib/workspace";
import { isReadOnly } from "@/lib/access";
import {
  buildBackupWorkbook,
  backupSettings,
  XLSX_CONTENT_TYPE,
} from "@/lib/backup-workbook";
export const runtime = "nodejs";
export const GET = api(async (request, user) => {
  if (isReadOnly(user))
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
  const locale =
    request.nextUrl.searchParams.get("locale") === "en" ? "en" : "fa";
  const workbook = buildBackupWorkbook(
    {
      version: 2,
      exportedAt: new Date().toISOString(),
      classes: data[0],
      people: data[1],
      curricula: data[2],
      reports: data[3],
      settings: backupSettings(data[4]),
    },
    locale,
  );
  return new Response(new Uint8Array(await workbook.xlsx.writeBuffer()), {
    headers: {
      "Content-Type": XLSX_CONTENT_TYPE,
      "Content-Disposition": `attachment; filename="report-desk-backup-${new Date().toISOString().slice(0, 10)}-${locale}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
});
