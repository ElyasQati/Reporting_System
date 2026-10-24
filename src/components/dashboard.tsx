"use client";
import Link from "next/link";
import { attendance, rankPeople, summarize } from "@/lib/analytics";
import {
  dateKey,
  deadline,
  monthBounds,
  shiftDate,
  weekStart,
} from "@/lib/dates";
import { displayDate, num } from "@/lib/client";
import type { Report, Workspace } from "@/lib/types";
import { useI18n } from "./providers";
import { AttendanceChart } from "./charts";
import { Button, Empty, Pill } from "./ui";
import type { Editor } from "./entity-form";
export function Metrics({
  data,
  reports,
}: {
  data: Workspace;
  reports: Report[];
}) {
  const { locale, t } = useI18n();
  const s = summarize(
    reports,
    data.classes.filter((c) => !c.archivedAt),
  );
  return (
    <div className="metrics-strip">
      <div>
        <span>{t("activeClasses")}</span>
        <strong>{num(s.classes, locale)}</strong>
        <small>{t("classes")}</small>
      </div>
      <div>
        <span>{t("enrolled")}</span>
        <strong>{num(s.enrolled, locale)}</strong>
        <small>{t("studentCount")}</small>
      </div>
      <div>
        <span>{t("attendance")}</span>
        <strong>
          {num(s.attendance, locale, 1)}
          <em>{s.attendance === null ? "" : "%"}</em>
        </strong>
        <small>{t("period")}</small>
      </div>
      <div>
        <span>{t("reportCount")}</span>
        <strong>{num(s.reports, locale)}</strong>
        <small>{t("received")}</small>
      </div>
    </div>
  );
}
export function Dashboard({
  data,
  reports,
  open,
}: {
  data: Workspace;
  reports: Report[];
  open: (editor: Editor) => void;
}) {
  const { t, locale } = useI18n();
  const activeClasses = data.classes.filter((c) => !c.archivedAt);
  const now = new Date();
  const current = weekStart(
    dateKey(now, data.settings.timezone),
    data.settings.weekStartsOn,
  );
  const eligible = activeClasses.filter(
    (c) => c.startedOn && c.startedOn <= dateKey(now, data.settings.timezone),
  );
  const currentReports = data.reports.filter(
    (r) =>
      !r.archivedAt &&
      r.weekStart === current &&
      eligible.some((c) => c._id === r.classId),
  );
  const received = new Set(currentReports.map((r) => r.classId)).size;
  const pending = eligible.filter(
    (c) => !currentReports.some((r) => r.classId === c._id),
  );
  const bounds = monthBounds(
    data.period,
    locale === "fa" ? "persian" : "gregory",
  );
  const points: { week: string; attendance: number | null }[] = [];
  for (
    let week = weekStart(bounds.from, data.settings.weekStartsOn);
    week < bounds.to;
    week = shiftDate(week, 7)
  ) {
    if (deadline(week, data.settings) < now)
      points.push({
        week,
        attendance: attendance(reports.filter((r) => r.weekStart === week)),
      });
  }
  const ranking = rankPeople(
    data.people.filter((p) => p.kind === "supervisor" && !p.archivedAt),
    data.classes,
    data.reports,
    data.settings,
  );
  const due = deadline(current, data.settings);
  return (
    <>
      <Metrics data={data} reports={reports} />
      <div className="overview-grid">
        <section className="panel trend-panel">
          <div className="section-heading">
            <div>
              <h2>{t("attendanceTrend")}</h2>
              <p>{t("attendanceTrendHint")}</p>
            </div>
            <span className="metric-inline">
              {num(attendance(reports), locale, 1)}
              {attendance(reports) === null ? "" : "%"}
            </span>
          </div>
          <AttendanceChart points={points} />
        </section>
        <section className="panel coverage-panel">
          <div className="section-heading">
            <h2>{t("reportStatus")}</h2>
            <Pill
              tone={
                !eligible.length
                  ? "neutral"
                  : pending.length
                    ? "warning"
                    : "positive"
              }
            >
              {t(
                !eligible.length
                  ? "noClassesStatus"
                  : pending.length
                    ? "pending"
                    : "received",
              )}
            </Pill>
          </div>
          <div className="coverage-value">
            {num(received, locale)}
            <span> / {num(eligible.length, locale)}</span>
          </div>
          <p className="coverage-period">
            {displayDate(current, locale)} —{" "}
            {displayDate(shiftDate(current, 6), locale)}
          </p>
          <div className="progress-track">
            <span
              style={{
                width: `${eligible.length ? (received / eligible.length) * 100 : 0}%`,
              }}
            />
          </div>
          <div className="key-value">
            <span>{t("due")}</span>
            <strong>
              {new Intl.DateTimeFormat(
                locale === "fa" ? "fa-AF-u-ca-persian" : "en-US",
                {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                  timeZone: data.settings.timezone,
                },
              ).format(due)}
            </strong>
          </div>
          <p className="coverage-note">
            {t(
              !eligible.length
                ? "noAssignedClasses"
                : pending.length
                  ? "insight"
                  : "noMissing",
            )}
          </p>
          {pending.slice(0, 2).map((c) => (
            <button
              className="missing-class"
              key={c._id}
              onClick={() => open({ entity: "reports", classId: c._id })}
            >
              <span>{c.name}</span>
              <span>{t("addReport")} →</span>
            </button>
          ))}
        </section>
        <section className="panel recent-panel">
          <div className="section-heading">
            <h2>{t("recentReports")}</h2>
            <Link href={`/${locale}/reports`}>{t("viewAll")} →</Link>
          </div>
          {!reports.length ? (
            <Empty
              text={t("noReports")}
              action={
                <Button onClick={() => open({ entity: "reports" })}>
                  {t("addReport")}
                </Button>
              }
            />
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>{t("class")}</th>
                    <th>{t("reportDate")}</th>
                    <th className="numeric">{t("attendance")}</th>
                    <th>{t("status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.slice(0, 5).map((r) => (
                    <tr key={r._id}>
                      <td>
                        <strong>{r.className}</strong>
                        <small>{r.supervisorName}</small>
                      </td>
                      <td>{displayDate(r.reportDate, locale)}</td>
                      <td className="numeric">
                        {num(
                          r.totalStudents
                            ? (r.present / r.totalStudents) * 100
                            : null,
                          locale,
                          1,
                        )}
                        %
                      </td>
                      <td>
                        <Pill
                          tone={
                            r.weekStart &&
                            new Date(r.submittedAt) <=
                              deadline(r.weekStart, data.settings)
                              ? "positive"
                              : "warning"
                          }
                        >
                          {t(
                            r.weekStart &&
                              new Date(r.submittedAt) <=
                                deadline(r.weekStart, data.settings)
                              ? "onTimeStatus"
                              : "late",
                          )}
                        </Pill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <section className="panel ranking-panel">
          <div className="section-heading">
            <h2>{t("topSupervisors")}</h2>
            <Link href={`/${locale}/supervisors`}>{t("viewAll")} →</Link>
          </div>
          <p className="panel-caption">{t("supervisorDescription")}</p>
          {!ranking.length ? (
            <Empty text={t("noData")} />
          ) : (
            <div className="ranking-list">
              {ranking.slice(0, 5).map((row, i) => (
                <div key={row.person._id} className="ranking-row">
                  <span className="ranking-position">{num(i + 1, locale)}</span>
                  <span className="avatar person-avatar">
                    {row.person.name.slice(0, 1)}
                  </span>
                  <div>
                    <strong>{row.person.name}</strong>
                    <small>
                      {num(row.classes, locale)} {t("classes")} ·{" "}
                      {num(row.students, locale)} {t("students")}
                    </small>
                  </div>
                  <strong className="ranking-score">
                    {num(row.score, locale, 1)}
                    <small>
                      {row.score === null ? "" : ` / ${num(100, locale)}`}
                    </small>
                  </strong>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
      <p className="statistics-note">
        {t("enrollmentsHint")} {t("attendanceHint")}
      </p>
    </>
  );
}
