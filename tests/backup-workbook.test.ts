import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import {
  buildBackupWorkbook,
  readBackupWorkbook,
  type BackupSnapshot,
} from "../src/lib/backup-workbook";
import { defaultSettings } from "../src/lib/dates";

const base = {
  _id: "test",
  ownerId: "source-owner",
  createdAt: "2026-10-23T10:00:00Z",
  updatedAt: "2026-10-23T10:00:00Z",
  archivedAt: null,
};
const snapshot: BackupSnapshot = {
  version: 2,
  exportedAt: "2026-10-30T10:00:00Z",
  settings: { ...defaultSettings, organization: "مجموعهٔ آموزشی آزمایشی" },
  people: [
    {
      ...base,
      _id: "teacher",
      kind: "teacher",
      name: "استاد آزمایشی",
      phone: "0700000000",
      email: "teacher@example.test",
      active: true,
    },
    {
      ...base,
      _id: "supervisor",
      kind: "supervisor",
      name: "نگران آزمایشی",
      phone: "",
      email: "",
      active: false,
    },
  ],
  classes: [
    {
      ...base,
      _id: "class",
      number: "001",
      name: '=HYPERLINK("https://example.test")',
      teacherId: "teacher",
      supervisorId: "supervisor",
      location: "کابل",
      startTime: "14:30",
      endTime: "15:30",
      studentCount: 45,
      startedOn: "2026-10-23",
      legacySchedule: "بعد از ظهر",
      assignments: [
        {
          teacherId: "teacher",
          supervisorId: "supervisor",
          effectiveOn: "2026-10-23",
        },
      ],
    },
  ],
  curricula: [
    {
      ...base,
      _id: "book",
      name: "اکسیر اندیشه‌ها",
      pages: 120,
      topics: [
        { id: "topic", title: "سنگ بنای یک تغییر", startPage: 1, endPage: 15 },
      ],
    },
  ],
  reports: [
    {
      ...base,
      _id: "report",
      archivedAt: "2026-10-29T11:00:00Z",
      classId: "class",
      curriculumId: "book",
      topicIds: ["topic"],
      lesson: "آموزش\nبحث گروهی",
      totalStudents: 45,
      present: 30,
      reportDate: "2026-10-23",
      weekStart: "2026-10-23",
      submittedAt: "2026-10-29T18:00:00Z",
      teacherId: "teacher",
      supervisorId: "supervisor",
      className: "صنف آموزشی",
      teacherName: "استاد قبلی",
      supervisorName: "نگران قبلی",
      legacy: { id: 1, month: "June", week: 2, monthWeek: 2 },
    },
  ],
};

describe("Excel workspace backups", () => {
  it("round-trips every business field, history, archive and legacy metadata without losing data", async () => {
    const original = structuredClone(snapshot);
    const buffer = await buildBackupWorkbook(snapshot, "fa").xlsx.writeBuffer();
    expect(await readBackupWorkbook(Buffer.from(buffer))).toEqual(original);
    expect(snapshot).toEqual(original);
  });

  it("keeps readable typed tables, literal strings, borders and Persian layout after serialization", async () => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(
      await buildBackupWorkbook(snapshot, "fa").xlsx.writeBuffer(),
    );
    expect(
      workbook.worksheets.filter((s) => s.state === "visible"),
    ).toHaveLength(9);
    const classes = workbook.getWorksheet("صنف‌ها")!;
    expect(classes.views[0]).toMatchObject({
      state: "frozen",
      ySplit: 6,
      rightToLeft: true,
      showGridLines: false,
    });
    expect(classes.getCell("A7").value).toBe("001");
    expect(classes.getCell("B7").type).toBe(ExcelJS.ValueType.String);
    expect(classes.getCell("C7").value).toBe("استاد آزمایشی");
    expect(classes.getCell("F7").value).toBe(45);
    expect(classes.getCell("G7").value).toEqual(
      new Date("2026-10-23T00:00:00Z"),
    );
    expect(classes.getCell("G7").numFmt).toBe("[$-fa-IR,16]yyyy/mm/dd");
    expect(classes.getCell("H7").value).toEqual(
      new Date("1899-12-30T14:30:00Z"),
    );
    expect(classes.getCell("H7").numFmt).toBe("h:mm AM/PM");
    for (const sheet of workbook.worksheets.filter(
      (s) => s.state === "visible",
    )) {
      expect(sheet.getCell("A6").font.color?.argb).toBe("FFFFFFFF");
      expect(sheet.getCell("A7").border.bottom?.style).toBe("thin");
    }
    const reports = workbook.getWorksheet("گزارش‌ها")!;
    expect(reports.getCell("H7").value).toBe(15);
    expect(reports.getCell("J7").value).toBe("سنگ بنای یک تغییر");
    expect(reports.getCell("K7").value).toBe("آموزش\nبحث گروهی");
    expect(reports.getCell("L7").value).toEqual(
      new Date("2026-10-29T22:30:00Z"),
    );
    expect(reports.getCell("M7").value).toBe("آرشیف");
    expect(workbook.getWorksheet("_report_desk_backup")!.state).toBe(
      "veryHidden",
    );
  });

  it("supports English and empty workspaces and restores the original snapshot after display edits", async () => {
    const data = {
      ...snapshot,
      classes: [],
      people: [],
      curricula: [],
      reports: [],
    };
    const workbook = buildBackupWorkbook(data, "en");
    const sheet = workbook.getWorksheet("Classes")!;
    expect(sheet.views[0].rightToLeft).toBe(false);
    expect(sheet.getCell("A7").value).toBe("No records.");
    workbook.getWorksheet("Summary")!.getCell("B7").value = 999;
    expect(
      await readBackupWorkbook(Buffer.from(await workbook.xlsx.writeBuffer())),
    ).toEqual(data);
  });

  it("chunks long Unicode snapshots at safe cell boundaries", async () => {
    const data = structuredClone(snapshot);
    data.reports = Array.from({ length: 30 }, (_, i) => ({
      ...snapshot.reports[0],
      _id: `report-${i}`,
      lesson: "درس 🌱 ".repeat(250),
    }));
    const workbook = buildBackupWorkbook(data, "en");
    expect(
      workbook.getWorksheet("_report_desk_backup")!.rowCount,
    ).toBeGreaterThan(2);
    expect(
      await readBackupWorkbook(Buffer.from(await workbook.xlsx.writeBuffer())),
    ).toEqual(data);
  });

  it("rejects unrelated, truncated and modified restore snapshots", async () => {
    await expect(
      readBackupWorkbook(Buffer.from("not an Excel file")),
    ).rejects.toMatchObject({ code: "INVALID_BACKUP" });
    const plain = new ExcelJS.Workbook();
    plain.addWorksheet("Sheet1");
    await expect(
      readBackupWorkbook(Buffer.from(await plain.xlsx.writeBuffer())),
    ).rejects.toMatchObject({ code: "INVALID_BACKUP" });
    const modified = buildBackupWorkbook(snapshot, "en");
    modified.getWorksheet("_report_desk_backup")!.getCell("A2").value = "{}";
    await expect(
      readBackupWorkbook(Buffer.from(await modified.xlsx.writeBuffer())),
    ).rejects.toMatchObject({ code: "INVALID_BACKUP" });
  });
});
