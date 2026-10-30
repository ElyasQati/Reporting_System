import ExcelJS from "exceljs";
import { createHash } from "node:crypto";
import { en, fa } from "./i18n";
import { defaultSettings } from "./dates";
import { ApiError } from "./errors";
import type { Locale, Settings, Workspace } from "./types";

export const XLSX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
export const BACKUP_MAX_BYTES = 50_000_000;
const snapshotSheet = "_report_desk_backup";
const signature = "report-desk-backup-v2";

export type BackupSnapshot = Pick<
  Workspace,
  "classes" | "people" | "curricula" | "reports"
> & { version: 2; exportedAt: string; settings: Settings };

const palette = {
  ink: "FF203A39",
  header: "FF234C49",
  border: "FFD0DDDA",
  stripe: "FFF2F7F5",
  muted: "FF647773",
  white: "FFFFFFFF",
};
type Column = { title: string; width?: number; format?: string };
type Value = string | number | Date | null;

/** Human-readable sheets and a lossless snapshot travel together in one file. */
export function buildBackupWorkbook(data: BackupSnapshot, locale: Locale) {
  const t = locale === "fa" ? fa : en;
  const rtl = locale === "fa";
  const label = (persian: string, english: string) => (rtl ? persian : english);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = t.brand;
  workbook.title = t.backup;
  workbook.subject = data.settings.organization;
  workbook.created = new Date(data.exportedAt);
  const font = { name: "Arial", size: 11, color: { argb: palette.ink } };
  const alignment: Partial<ExcelJS.Alignment> = {
    vertical: "middle",
    horizontal: rtl ? "right" : "left",
    readingOrder: rtl ? "rtl" : "ltr",
    wrapText: true,
  };
  const border: Partial<ExcelJS.Borders> = Object.fromEntries(
    ["top", "bottom", "left", "right"].map((side) => [
      side,
      { style: "thin", color: { argb: palette.border } },
    ]),
  );
  const dateFormat = rtl ? "[$-fa-IR,16]yyyy/mm/dd" : "yyyy-mm-dd";
  const date = (value: string | null | undefined): Value =>
    value ? new Date(`${value.slice(0, 10)}T00:00:00Z`) : null;
  const time = (value: string | null): Value => {
    if (!value) return null;
    const [hour, minute] = value.split(":").map(Number);
    return (hour * 60 + minute) / 1440;
  };
  const stamp = (value: string | null | undefined): Value => {
    if (!value) return null;
    // Excel dates have no timezone. Display the workspace's wall clock, including DST.
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: data.settings.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(value));
    const part = (key: string) => parts.find((p) => p.type === key)!.value;
    return new Date(
      `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}:${part("second")}Z`,
    );
  };
  const table = (name: string, columns: Column[], values: Value[][]) => {
    const sheet = workbook.addWorksheet(name, {
      properties: { defaultRowHeight: 28, tabColor: { argb: palette.header } },
      views: [
        { state: "frozen", ySplit: 6, rightToLeft: rtl, showGridLines: false },
      ],
      pageSetup: {
        paperSize: 9,
        orientation: "landscape",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        printTitlesRow: "1:6",
      },
    });
    sheet.columns = columns.map((col) => ({ width: col.width ?? 24 }));
    sheet.getRow(1).height = 10;
    const heading = (row: number, text: string) => {
      sheet.mergeCells(row, 1, row, columns.length);
      const cell = sheet.getCell(row, 1);
      cell.value = text;
      cell.font = font;
      cell.alignment = alignment;
      return cell;
    };
    const title = heading(2, name);
    title.font = { ...font, size: 17, bold: true };
    title.border = {
      bottom: { style: "medium", color: { argb: palette.header } },
    };
    sheet.getRow(2).height = 36;
    heading(3, data.settings.organization);
    heading(
      4,
      `${t.backup} · ${new Intl.DateTimeFormat(
        rtl ? "fa-AF-u-ca-persian" : "en-US",
        {
          timeZone: data.settings.timezone,
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        },
      ).format(new Date(data.exportedAt))} (${data.settings.timezone})`,
    );
    sheet.getRow(4).height = 30;
    sheet.getRow(5).height = 10;
    const header = sheet.getRow(6);
    header.values = columns.map((column) => column.title);
    header.height = 34;
    header.eachCell((cell) => {
      cell.font = { ...font, bold: true, color: { argb: palette.white } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: palette.header },
      };
      cell.border = {
        ...border,
        left: { style: "thin", color: { argb: palette.white } },
      };
      cell.alignment = { ...alignment, horizontal: "center" };
    });
    for (const [index, valuesRow] of values.entries()) {
      const row = sheet.getRow(index + 7);
      row.values = valuesRow;
      const lines = valuesRow.reduce<number>(
        (max, value, column) =>
          typeof value === "string"
            ? Math.max(
                max,
                ...value
                  .split(/\r?\n/)
                  .map((line) =>
                    Math.ceil(
                      line.length / ((columns[column].width ?? 24) - 3),
                    ),
                  ),
              )
            : max,
        1,
      );
      row.height = Math.min(409, Math.max(30, lines * 17 + 10));
      columns.forEach((column, offset) => {
        const cell = row.getCell(offset + 1);
        cell.font = font;
        cell.border = border;
        cell.alignment = {
          ...alignment,
          horizontal:
            cell.type === ExcelJS.ValueType.Number
              ? "center"
              : alignment.horizontal,
        };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: index % 2 ? palette.stripe : palette.white },
        };
        if (column.format) cell.numFmt = column.format;
      });
    }
    if (values.length) {
      sheet.autoFilter = {
        from: { row: 6, column: 1 },
        to: { row: values.length + 6, column: columns.length },
      };
    } else {
      const empty = heading(7, label("اطلاعاتی ثبت نشده است.", "No records."));
      empty.font = { ...font, color: { argb: palette.muted } };
      empty.border = border;
    }
    sheet.pageSetup.printArea = `A1:${sheet.getColumn(columns.length).letter}${Math.max(7, values.length + 6)}`;
    sheet.headerFooter.oddFooter = "&C&P / &N";
    return sheet;
  };
  const col = (title: string, width = 24, format?: string): Column => ({
    title,
    width,
    format,
  });
  const status = (archivedAt: string | null) =>
    archivedAt ? t.archive : t.active;
  const people = new Map(data.people.map((p) => [p._id, p.name]));
  const books = new Map(data.curricula.map((b) => [b._id, b]));
  const summary = table(
    label("خلاصه", "Summary"),
    [
      col(label("بخش", "Section"), 38),
      col(t.total, 22, "#,##0"),
      col(label("توضیحات", "Description"), 90),
    ],
    [
      [
        t.classes,
        data.classes.length,
        label(
          "شامل صنف‌های موجود و آرشیف‌شده",
          "Includes current and archived classes",
        ),
      ],
      [
        t.teachers,
        data.people.filter((p) => p.kind === "teacher").length,
        null,
      ],
      [
        t.supervisors,
        data.people.filter((p) => p.kind === "supervisor").length,
        null,
      ],
      [t.curricula, data.curricula.length, null],
      [
        t.topics,
        data.curricula.reduce((sum, b) => sum + b.topics.length, 0),
        null,
      ],
      [
        t.reports,
        data.reports.length,
        label(
          "تمام ماه‌ها و سال‌ها، شامل آرشیف",
          "All months and years, including archived records",
        ),
      ],
      [t.settings, 1, null],
    ],
  );
  const note = summary.getCell("A16");
  summary.mergeCells("A16:C17");
  note.value = label(
    "برای بازیابی، همین فایل اصلی را نگه دارید. تغییر جدول‌های نمایشی، اطلاعات بازیابی را تغییر نمی‌دهد. بازیابی فقط در فضای کاری خالی انجام می‌شود.",
    "Keep this original file for restoration. Edits to the display tables do not change the restore snapshot. Restore is available only in an empty workspace.",
  );
  note.font = { ...font, color: { argb: palette.muted } };
  note.alignment = alignment;
  summary.pageSetup.printArea = "A1:C17";
  const metadata = [
    col(t.createdAt, 19, dateFormat),
    col(label("آخرین تغییر", "Updated"), 19, dateFormat),
    col(label("تاریخ آرشیف", "Archived on"), 19, dateFormat),
  ];
  const meta = (row: {
    createdAt: string;
    updatedAt: string;
    archivedAt: string | null;
  }): Value[] => [
    date(row.createdAt),
    date(row.updatedAt),
    date(row.archivedAt),
  ];
  table(
    t.classes,
    [
      col(t.number, 14),
      col(t.name, 28),
      col(t.teacher),
      col(t.supervisor),
      col(t.location, 28),
      col(t.totalStudents, 16, "#,##0"),
      col(label("تاریخ شروع", "Start date"), 19, dateFormat),
      col(t.startTime, 18, "h:mm AM/PM"),
      col(t.endTime, 18, "h:mm AM/PM"),
      col(t.status, 18),
      col(label("زمان‌بندی سابق", "Legacy schedule"), 30),
      ...metadata,
    ],
    data.classes.map((c) => [
      c.number,
      c.name,
      people.get(c.teacherId) ?? c.teacherId,
      people.get(c.supervisorId) ?? c.supervisorId,
      c.location,
      c.studentCount,
      date(c.startedOn),
      time(c.startTime),
      time(c.endTime),
      status(c.archivedAt),
      c.legacySchedule ?? null,
      ...meta(c),
    ]),
  );
  for (const kind of ["teacher", "supervisor"] as const) {
    table(
      kind === "teacher" ? t.teachers : t.supervisors,
      [
        col(t.name, 30),
        col(t.phone, 23),
        col(t.email, 36),
        col(t.status, 20),
        col(t.archive, 18),
        ...metadata,
      ],
      data.people
        .filter((p) => p.kind === kind)
        .map((p) => [
          p.name,
          p.phone,
          p.email,
          p.active ? t.active : t.inactive,
          status(p.archivedAt),
          ...meta(p),
        ]),
    );
  }
  table(
    t.curricula,
    [
      col(t.name, 38),
      col(t.pages, 18, "#,##0"),
      col(t.topics, 18, "#,##0"),
      col(t.status, 20),
      ...metadata,
    ],
    data.curricula.map((b) => [
      b.name,
      b.pages,
      b.topics.length,
      status(b.archivedAt),
      ...meta(b),
    ]),
  );
  table(
    t.topics,
    [
      col(t.curriculum, 38),
      col(label("عنوان درس", "Lesson title"), 55),
      col(t.startPage, 18, "#,##0"),
      col(t.endPage, 18, "#,##0"),
    ],
    data.curricula.flatMap((b) =>
      b.topics.map((topic) => [
        b.name,
        topic.title,
        topic.startPage,
        topic.endPage,
      ]),
    ),
  );
  table(
    t.reports,
    [
      col(t.class, 28),
      col(t.teacher),
      col(t.supervisor),
      col(t.reportDate, 20, dateFormat),
      col(label("شروع هفته", "Week starts"), 20, dateFormat),
      col(t.totalStudents, 17, "#,##0"),
      col(t.present, 16, "#,##0"),
      col(t.absent, 16, "#,##0"),
      col(t.curriculum, 32),
      col(t.topics, 42),
      col(t.lesson, 65),
      col(label("زمان ثبت", "Submitted at"), 28, `${dateFormat} h:mm AM/PM`),
      col(t.status, 18),
      col(label("ماه سابق", "Legacy month")),
      ...metadata,
    ],
    data.reports.map((r) => {
      const book = books.get(r.curriculumId);
      return [
        r.className,
        r.teacherName,
        r.supervisorName,
        date(r.reportDate),
        date(r.weekStart),
        r.totalStudents,
        r.present,
        r.totalStudents - r.present,
        book?.name ?? r.curriculumId,
        r.topicIds
          .map(
            (id) => book?.topics.find((topic) => topic.id === id)?.title ?? id,
          )
          .join("\n"),
        r.lesson,
        stamp(r.submittedAt),
        status(r.archivedAt),
        r.legacy?.month ?? null,
        ...meta(r),
      ];
    }),
  );
  table(
    label("تاریخچهٔ مسئولان صنف", "Assignment history"),
    [
      col(t.class, 30),
      col(t.teacher, 30),
      col(t.supervisor, 30),
      col(label("از تاریخ", "Effective date"), 22, dateFormat),
    ],
    data.classes.flatMap((c) =>
      (c.assignments ?? []).map((a) => [
        c.name,
        people.get(a.teacherId) ?? a.teacherId,
        people.get(a.supervisorId) ?? a.supervisorId,
        date(a.effectiveOn),
      ]),
    ),
  );
  const days = [
    t.sunday,
    t.monday,
    t.tuesday,
    t.wednesday,
    t.thursday,
    t.friday,
    t.saturday,
  ];
  table(
    t.settings,
    [col(label("تنظیم", "Setting"), 40), col(label("مقدار", "Value"), 45)],
    [
      [t.organization, data.settings.organization],
      [t.timezone, data.settings.timezone],
      [t.weekStartsOn, days[data.settings.weekStartsOn]],
      [t.deadlineDay, days[data.settings.deadlineDay]],
      [
        t.deadlineHour,
        time(`${String(data.settings.deadlineHour).padStart(2, "0")}:59`),
      ],
      [t.rankingWeeks, data.settings.rankingWeeks],
      [t.timelinessWeight, data.settings.weights.timeliness],
      [t.attendanceWeight, data.settings.weights.attendance],
      [t.stabilityWeight, data.settings.weights.stability],
    ],
  ).getCell("B11").numFmt = "h:mm AM/PM";

  // Excel cells are limited to 32,767 characters. Chunk without splitting surrogate pairs.
  const raw = JSON.stringify(data);
  if (Buffer.byteLength(raw) > BACKUP_MAX_BYTES)
    throw new ApiError("PAYLOAD_TOO_LARGE", 413);
  const internal = workbook.addWorksheet(snapshotSheet, {
    state: "veryHidden",
  });
  internal.getCell("A1").value = signature;
  internal.getCell("B1").value = createHash("sha256").update(raw).digest("hex");
  let row = 2;
  for (let start = 0; start < raw.length;) {
    let end = Math.min(start + 20000, raw.length);
    if (end < raw.length && /[\uD800-\uDBFF]/.test(raw[end - 1])) end--;
    internal.getCell(row++, 1).value = raw.slice(start, end);
    start = end;
  }
  return workbook;
}

export async function readBackupWorkbook(buffer: Buffer): Promise<unknown> {
  try {
    if (buffer.length > BACKUP_MAX_BYTES) throw new Error("size");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    const sheet = workbook.getWorksheet(snapshotSheet);
    if (!sheet || sheet.getCell("A1").value !== signature)
      throw new Error("format");
    let raw = "";
    let bytes = 0;
    for (let row = 2; row <= sheet.rowCount; row++) {
      const value = sheet.getCell(row, 1).value;
      if (typeof value !== "string") throw new Error("chunk");
      bytes += Buffer.byteLength(value);
      if (bytes > BACKUP_MAX_BYTES) throw new Error("size");
      raw += value;
    }
    if (
      createHash("sha256").update(raw).digest("hex") !==
      sheet.getCell("B1").value
    )
      throw new Error("checksum");
    return JSON.parse(raw);
  } catch {
    throw new ApiError("INVALID_BACKUP");
  }
}

export function backupSettings(settings: Settings | null): Settings {
  return settings ?? defaultSettings;
}
