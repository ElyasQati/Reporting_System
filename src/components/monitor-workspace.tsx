"use client";
import Link from "next/link";
import { useState } from "react";
import { dateKey, monthBounds, shiftDate, weekStart } from "@/lib/dates";
import { displayDate, displayTime, num } from "@/lib/client";
import type { MessageKey } from "@/lib/i18n";
import type {
  Curriculum,
  Person,
  Report,
  SchoolClass,
  Workspace,
} from "@/lib/types";
import { useI18n } from "./providers";
import { Appearance, Shell } from "./shell";
import { Button, Empty, IconButton, Modal } from "./ui";
import { EyeIcon, RefreshIcon, SearchIcon } from "./icons";
import { PeriodPicker } from "./date-controls";
import { Metrics } from "./dashboard";
import {
  AnalyticsView,
  ClassesView,
  CurriculaView,
  PeopleView,
  ReportsView,
} from "./data-views";
import { ReadOnlyContext } from "./read-only";
import type { Editable, Entity } from "./entity-form";

const noEdit = () => {};
const allowed = [
  "dashboard",
  "classes",
  "reports",
  "curricula",
  "teachers",
  "supervisors",
  "analytics",
  "archive",
];
export function MonitorWorkspace({
  data,
  view: requestedView,
  reports,
  period,
  onPeriod,
  refresh,
  refreshing,
  error,
  onLogout,
}: {
  data: Workspace;
  view: string;
  reports: Report[];
  period: string;
  onPeriod: (period: string) => void;
  refresh: () => void;
  refreshing: boolean;
  error: string;
  onLogout: () => void;
}) {
  const { t, locale } = useI18n();
  const view = allowed.includes(requestedView) ? requestedView : "dashboard";
  const bounds = monthBounds(period, locale === "fa" ? "persian" : "gregory");
  const [query, setQuery] = useState("");
  const [archived, setArchived] = useState<Entity>("reports");
  const [detail, setDetail] = useState<{
    entity: Entity;
    record: Editable;
  } | null>(null);
  const props = { data, query, open: noEdit, act: noEdit };
  const current = weekStart(
    dateKey(new Date(), data.settings.timezone),
    data.settings.weekStartsOn,
  );
  const eligible = data.classes.filter(
    (c) =>
      !c.archivedAt &&
      c.startedOn &&
      c.startedOn <= dateKey(new Date(), data.settings.timezone),
  );
  const pending = eligible.filter(
    (c) =>
      !data.reports.some(
        (r) => !r.archivedAt && r.classId === c._id && r.weekStart === current,
      ),
  );
  const isArchived = (r: Report) =>
    Boolean(
      r.archivedAt || data.classes.find((c) => c._id === r.classId)?.archivedAt,
    );
  return (
    <Shell
      monitor
      view={view}
      name={data.user.name}
      organization={data.settings.organization}
      onLogout={onLogout}
    >
      <ReadOnlyContext.Provider
        value={{ details: (entity, record) => setDetail({ entity, record }) }}
      >
        <div className="monitor-identity">
          <div>
            <span>{t("monitorPortal")}</span>
            <strong>
              {t("monitorScope")}: {data.user.name}
            </strong>
          </div>
          <div className="monitor-appearance">
            <Appearance view={view} />
          </div>
        </div>
        <div className="page-heading">
          <div>
            <h1>{t(view as MessageKey)}</h1>
            <p>{t("monitorReadOnly")}</p>
          </div>
          <div className="page-actions">
            {["dashboard", "reports", "analytics", "archive"].includes(
              view,
            ) && <PeriodPicker period={period} onChange={onPeriod} />}
            <IconButton
              label={t("refresh")}
              disabled={refreshing}
              onClick={refresh}
            >
              <RefreshIcon className={refreshing ? "is-spinning" : ""} />
            </IconButton>
          </div>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
            <Button onClick={refresh}>{t("retry")}</Button>
          </p>
        )}
        {view !== "dashboard" && view !== "analytics" && (
          <div className="search-toolbar">
            <div className="search-field">
              <SearchIcon />
              <input
                aria-label={t("search")}
                placeholder={t("search")}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </div>
        )}
        {view === "dashboard" && (
          <>
            <Metrics data={data} reports={reports} />
            <p className="panel-caption">{t("monitorPeriodHint")}</p>
            <div className="monitor-overview-grid">
              <section className="monitor-section">
                <div className="section-heading">
                  <h2>{t("recentReports")}</h2>
                  <Link href={`/${locale}/reports`}>{t("viewAll")} →</Link>
                </div>
                {!reports.length ? (
                  <Empty text={t("monitorNoReports")} />
                ) : (
                  <div className="monitor-report-list">
                    {reports.slice(0, 6).map((report) => (
                      <button
                        key={report._id}
                        onClick={() =>
                          setDetail({ entity: "reports", record: report })
                        }
                      >
                        <span>
                          <strong>{report.className}</strong>
                          <small>
                            {report.teacherName} ·{" "}
                            {displayDate(report.reportDate, locale)}
                          </small>
                        </span>
                        <span className="monitor-report-lesson">
                          {report.lesson}
                        </span>
                        <span className="numeric">
                          {num(report.present, locale)} /{" "}
                          {num(report.totalStudents, locale)}
                          <small>{t("present")}</small>
                        </span>
                        <EyeIcon />
                      </button>
                    ))}
                  </div>
                )}
              </section>
              <section className="monitor-section monitor-week">
                <h2>{t("reportStatus")}</h2>
                <p className="muted small">
                  {displayDate(current, locale)} —{" "}
                  {displayDate(shiftDate(current, 6), locale)}
                </p>
                <div className="monitor-coverage">
                  <strong>
                    {num(eligible.length - pending.length, locale)}
                  </strong>
                  <span>
                    / {num(eligible.length, locale)} {t("classes")}
                  </span>
                </div>
                <p>
                  {t(
                    pending.length
                      ? "monitorPending"
                      : eligible.length
                        ? "noMissing"
                        : "noAssignedClasses",
                  )}
                </p>
                <ul>
                  {pending.slice(0, 5).map((schoolClass) => (
                    <li key={schoolClass._id}>{schoolClass.name}</li>
                  ))}
                </ul>
                <Link href={`/${locale}/classes`}>{t("viewAll")} →</Link>
              </section>
            </div>
            <section className="monitor-section">
              <div className="section-heading">
                <h2>{t("classes")}</h2>
                <Link href={`/${locale}/classes`}>{t("viewAll")} →</Link>
              </div>
              <ClassesView {...props} />
            </section>
          </>
        )}
        {view === "classes" && <ClassesView {...props} />}
        {view === "reports" && (
          <>
            <ReportsView {...props} reports={reports} />
            {data.legacyCount > 0 && (
              <details className="monitor-legacy">
                <summary>{t("legacy")}</summary>
                <ReportsView
                  {...props}
                  reports={data.reports.filter(
                    (r) => !r.reportDate && !isArchived(r),
                  )}
                />
              </details>
            )}
          </>
        )}
        {view === "curricula" && <CurriculaView {...props} />}
        {(view === "teachers" || view === "supervisors") && (
          <PeopleView
            {...props}
            kind={view === "teachers" ? "teacher" : "supervisor"}
          />
        )}
        {view === "analytics" && (
          <AnalyticsView data={data} reports={reports} />
        )}
        {view === "archive" && (
          <>
            <div className="tabs" role="tablist" aria-label={t("archive")}>
              {(["reports", "classes", "curricula", "people"] as const).map(
                (entity) => (
                  <button
                    role="tab"
                    aria-selected={archived === entity}
                    key={entity}
                    onClick={() => setArchived(entity)}
                  >
                    {t(entity === "people" ? "person" : entity)}
                  </button>
                ),
              )}
            </div>
            {archived === "classes" && <ClassesView {...props} archived />}
            {archived === "reports" && (
              <ReportsView
                {...props}
                archived
                reports={data.reports
                  .filter(isArchived)
                  .filter(
                    (r) =>
                      !r.reportDate ||
                      (r.reportDate >= bounds.from && r.reportDate < bounds.to),
                  )}
              />
            )}
            {archived === "curricula" && <CurriculaView {...props} archived />}
            {archived === "people" &&
              (data.people.some(
                (p) =>
                  p.archivedAt &&
                  p.name.toLowerCase().includes(query.toLowerCase()),
              ) ? (
                <ul className="monitor-archived-people">
                  {data.people
                    .filter(
                      (p) =>
                        p.archivedAt &&
                        p.name.toLowerCase().includes(query.toLowerCase()),
                    )
                    .map((person) => (
                      <li key={person._id}>
                        <span>{person.name}</span>
                        <Button
                          onClick={() =>
                            setDetail({ entity: "people", record: person })
                          }
                        >
                          {t("details")}
                        </Button>
                      </li>
                    ))}
                </ul>
              ) : (
                <Empty text={t("noData")} />
              ))}
          </>
        )}
        {detail && (
          <MonitorDetails
            data={data}
            entity={detail.entity}
            record={detail.record}
            onClose={() => setDetail(null)}
          />
        )}
      </ReadOnlyContext.Provider>
    </Shell>
  );
}

function MonitorDetails({
  data,
  entity,
  record,
  onClose,
}: {
  data: Workspace;
  entity: Entity;
  record: Editable;
  onClose: () => void;
}) {
  const { t, locale } = useI18n();
  const person = (id: string) =>
    data.people.find((p) => p._id === id)?.name ?? "—";
  let title = t("details"),
    facts: [string, string][] = [];
  if (entity === "classes") {
    const c = record as SchoolClass;
    title = c.name;
    facts = [
      [t("number"), c.number],
      [t("teacher"), person(c.teacherId)],
      [t("supervisor"), person(c.supervisorId)],
      [t("location"), c.location],
      [t("students"), num(c.studentCount, locale)],
      [
        t("schedule"),
        `${displayTime(c.startTime, locale)} — ${displayTime(c.endTime, locale)}`,
      ],
      [t("startedOn"), displayDate(c.startedOn, locale)],
    ];
  } else if (entity === "reports") {
    const r = record as Report;
    title = r.className;
    const book = data.curricula.find((c) => c._id === r.curriculumId);
    const submitted = r.submittedAt
      ? new Intl.DateTimeFormat(
          locale === "fa" ? "fa-AF-u-ca-persian" : "en-US",
          {
            dateStyle: "medium",
            timeStyle: "short",
            hour12: true,
            timeZone: data.settings.timezone,
          },
        ).format(new Date(r.submittedAt))
      : "—";
    facts = [
      [t("reportDate"), displayDate(r.reportDate, locale)],
      [t("week"), displayDate(r.weekStart, locale)],
      [t("submittedAt"), submitted],
      [t("teacher"), r.teacherName],
      [t("supervisor"), r.supervisorName],
      [t("totalStudents"), num(r.totalStudents, locale)],
      [t("present"), num(r.present, locale)],
      [t("absent"), num(r.totalStudents - r.present, locale)],
      [t("curriculum"), book?.name ?? "—"],
      [
        t("topics"),
        (r.topicIds ?? [])
          .map((id) => book?.topics.find((topic) => topic.id === id)?.title)
          .filter(Boolean)
          .join("، ") || "—",
      ],
      [t("lesson"), r.lesson],
    ];
  } else if (entity === "people") {
    const p = record as Person;
    title = p.name;
    facts = [
      [t("person"), t(p.kind === "teacher" ? "teacher" : "supervisor")],
      [t("phone"), p.phone],
      [t("email"), p.email],
      [t("status"), t(p.active ? "active" : "inactive")],
    ];
  } else {
    const c = record as Curriculum;
    title = c.name;
    facts = [
      [t("pages"), num(c.pages, locale)],
      ...c.topics.map((topic): [string, string] => [
        topic.title,
        `${num(topic.startPage, locale)}–${num(topic.endPage, locale)}`,
      ]),
    ];
  }
  return (
    <Modal title={title} description={t("monitorRole")} onClose={onClose}>
      <div className="detail-content">
        <dl className="monitor-facts">
          {facts.map(([label, value], index) => (
            <div key={`${label}-${index}`}>
              <dt>{label}</dt>
              <dd dir="auto">{value || "—"}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Modal>
  );
}
