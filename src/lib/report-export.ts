import ExcelJS from "exceljs";
import { displayDate, num } from "./client";
import { monthBounds } from "./dates";
import { en, fa } from "./i18n";
import type { Locale, Report, Workspace } from "./types";

interface ReportExportOptions {
  data: Pick<Workspace, "curricula" | "settings" | "period">;
  reports: Report[];
  locale: Locale;
  archived?: boolean;
  filters?: string[];
}

const colors = {
  ink: "FF203A39",
  header: "FF234C49",
  border: "FFD0DDDA",
  stripe: "FFF2F7F5",
  total: "FFE2EEEA",
  muted: "FF647773",
  white: "FFFFFFFF",
};

export function buildReportWorkbook({
  data,
  reports,
  locale,
  archived = false,
  filters = [],
}: ReportExportOptions) {
  const text = locale === "fa" ? fa : en;
  const rtl = locale === "fa";
  const workbook = new ExcelJS.Workbook();
  workbook.creator = text.brand;
  workbook.title = text.reports;
  workbook.subject = data.settings.organization;
  workbook.calcProperties.fullCalcOnLoad = true;
  const sheet = workbook.addWorksheet(text.reports, {
    properties: { tabColor: { argb: colors.header }, defaultRowHeight: 25 },
    views: [
      {
        state: "frozen",
        ySplit: 7,
        topLeftCell: "A8",
        activeCell: "A8",
        rightToLeft: rtl,
        showGridLines: false,
      },
    ],
    pageSetup: {
      paperSize: 9,
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      horizontalCentered: true,
      margins: {
        left: 0.3,
        right: 0.3,
        top: 0.4,
        bottom: 0.4,
        header: 0.15,
        footer: 0.15,
      },
    },
  });
  const widths = [25, 20, 18, 18, 18, 30, 55];
  sheet.columns = widths.map((width) => ({ width }));
  const font = { name: "Arial", size: 11, color: { argb: colors.ink } };
  const alignment: Partial<ExcelJS.Alignment> = {
    horizontal: rtl ? "right" : "left",
    vertical: "middle",
    readingOrder: rtl ? "rtl" : "ltr",
    wrapText: true,
  };
  const border: Partial<ExcelJS.Borders> = {
    top: { style: "thin", color: { argb: colors.border } },
    bottom: { style: "thin", color: { argb: colors.border } },
    left: { style: "thin", color: { argb: colors.border } },
    right: { style: "thin", color: { argb: colors.border } },
  };
  const heading = (row: number, value: string, height: number) => {
    sheet.mergeCells(row, 1, row, 7);
    const cell = sheet.getCell(row, 1);
    cell.value = value;
    cell.font = font;
    cell.alignment = alignment;
    sheet.getRow(row).height = height;
    return cell;
  };
  sheet.getRow(1).height = 12;
  const title = heading(
    2,
    `${text.reports}${archived ? ` · ${text.archive}` : ""}`,
    34,
  );
  title.font = { ...font, size: 17, bold: true };
  title.border = {
    bottom: { style: "medium", color: { argb: colors.header } },
  };
  heading(3, data.settings.organization, 26);
  const undated =
    reports.length > 0 && reports.every((report) => !report.reportDate);
  const period = displayDate(
    monthBounds(data.period, rtl ? "persian" : "gregory").from,
    locale,
    { year: "numeric", month: "long", day: undefined },
  );
  heading(
    4,
    `${archived ? text.archive : undated ? text.legacy : `${text.period}: ${period}`} · ${text.reportCount}: ${num(reports.length, locale)}`,
    26,
  );
  const filterText = filters.join(" · ");
  const filterLine = heading(
    5,
    filterText,
    Math.max(24, Math.ceil(filterText.length / 110) * 17 + 8),
  );
  filterLine.font = { ...font, color: { argb: colors.muted } };
  sheet.getRow(6).height = 10;
  const header = sheet.getRow(7);
  header.values = [
    text.class,
    text.reportDate,
    text.totalStudents,
    text.present,
    text.absent,
    text.curriculum,
    text.lesson,
  ];
  header.height = 34;
  header.eachCell((cell) => {
    cell.font = { ...font, bold: true, color: { argb: colors.white } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: colors.header },
    };
    cell.alignment = { ...alignment, horizontal: "center" };
    cell.border = {
      ...border,
      left: { style: "thin", color: { argb: colors.white } },
      right: { style: "thin", color: { argb: colors.white } },
    };
  });

  const curricula = new Map(
    data.curricula.map((book) => [book._id, book.name]),
  );
  reports.forEach((report, index) => {
    const values = [
      report.className,
      report.reportDate ? new Date(`${report.reportDate}T00:00:00Z`) : "—",
      report.totalStudents,
      report.present,
      report.totalStudents - report.present,
      curricula.get(report.curriculumId) ?? "—",
      report.lesson,
    ];
    const row = sheet.getRow(index + 8);
    row.values = values;
    const lines = values.reduce<number>(
      (max, value, column) =>
        typeof value === "string"
          ? Math.max(
              max,
              ...value
                .split(/\r?\n/)
                .map((line) =>
                  Math.max(1, Math.ceil(line.length / (widths[column] - 3))),
                ),
            )
          : max,
      1,
    );
    row.height = Math.min(409, Math.max(30, lines * 17 + 10));
    row.eachCell((cell, column) => {
      cell.font = font;
      cell.border = border;
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: index % 2 ? colors.stripe : colors.white },
      };
      cell.alignment = {
        ...alignment,
        horizontal:
          column >= 2 && column <= 5 ? "center" : alignment.horizontal,
      };
      if (column >= 3 && column <= 5) cell.numFmt = "#,##0";
    });
    row.getCell(2).numFmt = rtl ? "[$-fa-IR,16]yyyy/mm/dd" : "yyyy-mm-dd";
    row.getCell(5).value = {
      formula: `C${row.number}-D${row.number}`,
      result: report.totalStudents - report.present,
    };
  });
  if (reports.length) {
    sheet.autoFilter = { from: "A7", to: `G${reports.length + 7}` };
  } else {
    const empty = heading(8, text.noReports, 36);
    empty.font = { ...font, color: { argb: colors.muted } };
    empty.border = border;
  }
  const lastDataRow = reports.length + 7;
  const totalRow = Math.max(8, lastDataRow) + 1;
  const total = sheet.getRow(totalRow);
  total.getCell(1).value = text.summary;
  for (let column = 1; column <= 7; column++) {
    const cell = total.getCell(column);
    cell.font = { ...font, bold: true };
    cell.alignment = {
      ...alignment,
      horizontal: column >= 3 && column <= 5 ? "center" : alignment.horizontal,
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: colors.total },
    };
    cell.border = {
      ...border,
      top: { style: "medium", color: { argb: colors.header } },
    };
    if (column >= 3 && column <= 5) {
      const letter = String.fromCharCode(64 + column);
      const result = reports.reduce(
        (sum, report) =>
          sum +
          (column === 3
            ? report.totalStudents
            : column === 4
              ? report.present
              : report.totalStudents - report.present),
        0,
      );
      cell.value = reports.length
        ? { formula: `SUM(${letter}8:${letter}${lastDataRow})`, result }
        : 0;
      cell.numFmt = "#,##0";
    }
  }
  total.height = 32;
  sheet.pageSetup.printArea = `A1:G${totalRow}`;
  sheet.pageSetup.printTitlesRow = "1:7";
  sheet.headerFooter.oddFooter = "&C&P / &N";
  return workbook;
}

export async function downloadReportWorkbook(options: ReportExportOptions) {
  const workbook = buildReportWorkbook(options);
  const buffer = await workbook.xlsx.writeBuffer();
  const url = URL.createObjectURL(
    new Blob([new Uint8Array(buffer)], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `reports-${options.archived ? "archive-" : ""}${options.data.period}-${options.locale}.xlsx`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
