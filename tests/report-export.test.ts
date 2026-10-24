import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { buildReportWorkbook } from "../src/lib/report-export";
import { defaultSettings } from "../src/lib/dates";
import type { Report, Workspace } from "../src/lib/types";

const base = {
  _id: "test-report",
  createdAt: "2026-10-23T10:00:00Z",
  updatedAt: "2026-10-23T10:00:00Z",
  archivedAt: null,
};
const data: Pick<Workspace, "curricula" | "settings" | "period"> = {
  period: "1405-08",
  settings: { ...defaultSettings, organization: "مجموعهٔ آزمایشی" },
  curricula: [
    { ...base, _id: "book", name: "اکسیر اندیشه‌ها", pages: 100, topics: [] },
  ],
};
const report: Report = {
  ...base,
  classId: "class",
  curriculumId: "book",
  topicIds: [],
  lesson: "سنگ بنای یک تغییر\nاندیشه و شناخت",
  totalStudents: 45,
  present: 30,
  reportDate: "2026-10-23",
  weekStart: "2026-10-23",
  submittedAt: "2026-10-23T10:00:00Z",
  teacherId: "teacher",
  supervisorId: "supervisor",
  teacherName: "استاد آزمایشی",
  supervisorName: "نگران آزمایشی",
  className: "صنف آزمایشی",
};

describe("formatted report exports", () => {
  it("preserves typed data, literal text, Persian layout and recalculable totals after XLSX serialization", async () => {
    const workbook = buildReportWorkbook({
      data,
      reports: [
        report,
        {
          ...report,
          _id: "second",
          className: '=HYPERLINK("https://example.com")',
          totalStudents: 10,
          present: 4,
          reportDate: null,
        },
      ],
      locale: "fa",
      filters: ["صنف: همه"],
    });
    const saved = new ExcelJS.Workbook();
    await saved.xlsx.load(await workbook.xlsx.writeBuffer());
    const sheet = saved.worksheets[0];
    expect(sheet.views[0]).toMatchObject({
      rightToLeft: true,
      state: "frozen",
      ySplit: 7,
    });
    expect(sheet.getCell("C8").value).toBe(45);
    expect(sheet.getCell("E8").value).toEqual({ formula: "C8-D8", result: 15 });
    expect(sheet.getCell("B8").value).toEqual(new Date("2026-10-23T00:00:00Z"));
    expect(sheet.getCell("B8").numFmt).toBe("[$-fa-IR,16]yyyy/mm/dd");
    expect(sheet.getCell("B9").value).toBe("—");
    expect(sheet.getCell("A9").type).toBe(ExcelJS.ValueType.String);
    expect(sheet.getCell("G8").value).toBe(report.lesson);
    expect(sheet.getCell("F8").value).toBe("اکسیر اندیشه‌ها");
    expect(sheet.getCell("C10").value).toEqual({
      formula: "SUM(C8:C9)",
      result: 55,
    });
    expect(sheet.getCell("D10").value).toEqual({
      formula: "SUM(D8:D9)",
      result: 34,
    });
    expect(sheet.getCell("E10").value).toEqual({
      formula: "SUM(E8:E9)",
      result: 21,
    });
    expect(sheet.getCell("A7").font.color?.argb).toBe("FFFFFFFF");
    expect(sheet.getCell("G8").border.bottom?.style).toBe("thin");
    expect(sheet.getCell("G8").alignment.wrapText).toBe(true);
    expect(sheet.pageSetup).toMatchObject({
      orientation: "landscape",
      fitToWidth: 1,
      printTitlesRow: "1:7",
    });
  });

  it("exports every supplied row with English dates, including rows beyond the screen page", () => {
    const reports = Array.from({ length: 14 }, (_, index) => ({
      ...report,
      _id: String(index),
    }));
    const workbook = buildReportWorkbook({
      data: { ...data, period: "2026-10" },
      reports,
      locale: "en",
    });
    const sheet = workbook.worksheets[0];
    expect(sheet.views[0].rightToLeft).toBe(false);
    expect(sheet.getCell("B8").numFmt).toBe("yyyy-mm-dd");
    expect(sheet.getCell("A21").value).toBe(report.className);
    expect(sheet.getCell("D22").value).toEqual({
      formula: "SUM(D8:D21)",
      result: 420,
    });
  });

  it("keeps an empty export valid without fabricating attendance", () => {
    const sheet = buildReportWorkbook({ data, reports: [], locale: "fa" })
      .worksheets[0];
    expect(sheet.getCell("A8").value).toBe(
      "برای این دوره گزارشی ثبت نشده؛ اولین گزارش هفتگی را اضافه کنید.",
    );
    expect(sheet.getCell("C9").value).toBe(0);
    expect(sheet.getCell("D9").value).toBe(0);
    expect(sheet.getCell("E9").value).toBe(0);
  });
});
