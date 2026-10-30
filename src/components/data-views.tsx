"use client";
import { useContext, useState } from "react";
import { ReadOnlyContext } from "./read-only";
import { toast } from "sonner";
import { displayDate, displayTime, num } from "@/lib/client";
import { attendance, rankPeople } from "@/lib/analytics";
import { deadline } from "@/lib/dates";
import type { Curriculum, PersonStats, Report, Workspace } from "@/lib/types";
import { useI18n } from "./providers";
import { Button, Empty, IconButton, Modal, Pill } from "./ui";
import {
  DownloadIcon,
  EditIcon,
  EyeIcon,
  FolderIcon,
  TrashIcon,
} from "./icons";
import type { Editable, Editor, Entity } from "./entity-form";
import { Metrics } from "./dashboard";
export type Action = (
  entity: Entity,
  record: Editable,
  action: "archive" | "restore" | "delete",
) => void;
export function RowActions({
  entity,
  record,
  open,
  act,
  archived = false,
}: {
  entity: Entity;
  record: Editable;
  open: (editor: Editor) => void;
  act: Action;
  archived?: boolean;
}) {
  const { t } = useI18n();
  const readOnly = useContext(ReadOnlyContext);
  if (readOnly)
    return (
      <IconButton
        label={t("details")}
        onClick={() => readOnly.details(entity, record)}
      >
        <EyeIcon />
      </IconButton>
    );
  return (
    <div className="row-actions">
      {archived ? (
        <>
          <Button
            variant="ghost"
            onClick={() => act(entity, record, "restore")}
          >
            {t("restore")}
          </Button>
          <IconButton
            label={t("delete")}
            onClick={() => act(entity, record, "delete")}
          >
            <TrashIcon />
          </IconButton>
        </>
      ) : (
        <>
          <IconButton
            label={t("edit")}
            onClick={() => open({ entity, record })}
          >
            <EditIcon />
          </IconButton>
          <IconButton
            label={t("archiveAction")}
            onClick={() => act(entity, record, "archive")}
          >
            <FolderIcon />
          </IconButton>
        </>
      )}
    </div>
  );
}
export function Pager({
  page,
  total,
  onChange,
}: {
  page: number;
  total: number;
  onChange: (p: number) => void;
}) {
  const { locale, t } = useI18n();
  if (total <= 12) return null;
  return (
    <div className="pagination">
      <span>
        {num(page * 12 + 1, locale)}–
        {num(Math.min(total, (page + 1) * 12), locale)} {t("of")}{" "}
        {num(total, locale)}
      </span>
      <div>
        <Button disabled={!page} onClick={() => onChange(page - 1)}>
          {t("previous")}
        </Button>
        <Button
          disabled={(page + 1) * 12 >= total}
          onClick={() => onChange(page + 1)}
        >
          {t("next")}
        </Button>
      </div>
    </div>
  );
}
export function ClassesView({
  data,
  query,
  open,
  act,
  archived = false,
}: {
  data: Workspace;
  query: string;
  open: (editor: Editor) => void;
  act: Action;
  archived?: boolean;
}) {
  const { t, locale } = useI18n();
  const readOnly = useContext(ReadOnlyContext);
  const [teacher, setTeacher] = useState("");
  const [supervisor, setSupervisor] = useState("");
  const [page, setPage] = useState(0);
  const rows = data.classes.filter(
    (c) =>
      Boolean(c.archivedAt) === archived &&
      (!teacher || c.teacherId === teacher) &&
      (!supervisor || c.supervisorId === supervisor) &&
      [c.name, c.number, c.location].some((v) =>
        v.toLowerCase().includes(query.toLowerCase()),
      ),
  );
  const pageIndex = Math.min(
    page,
    Math.max(0, Math.ceil(rows.length / 12) - 1),
  );
  const person = (id: string) =>
    data.people.find((p) => p._id === id)?.name ?? "—";
  return (
    <>
      <div className="filter-row">
        <select
          aria-label={t("teacher")}
          value={teacher}
          onChange={(e) => {
            setTeacher(e.target.value);
            setPage(0);
          }}
        >
          <option value="">
            {t("teacher")}: {t("all")}
          </option>
          {data.people
            .filter((p) => p.kind === "teacher")
            .map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
        </select>
        <select
          aria-label={t("supervisor")}
          value={supervisor}
          onChange={(e) => {
            setSupervisor(e.target.value);
            setPage(0);
          }}
        >
          <option value="">
            {t("supervisor")}: {t("all")}
          </option>
          {data.people
            .filter((p) => p.kind === "supervisor")
            .map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
        </select>
        <span className="filter-count">
          {num(rows.length, locale)} {t("classes")}
        </span>
      </div>
      {!rows.length ? (
        <Empty text={t(readOnly ? "monitorNoClasses" : "noClasses")} />
      ) : (
        <div className="table-scroll">
          <table className="classes-table">
            <thead>
              <tr>
                <th>{t("class")}</th>
                <th>{t("teacher")}</th>
                <th>{t("supervisor")}</th>
                <th>{t("location")}</th>
                <th className="numeric">{t("students")}</th>
                <th>{t("schedule")}</th>
                <th>{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(pageIndex * 12, (pageIndex + 1) * 12).map((c) => (
                <tr key={c._id}>
                  <td>
                    <strong>{c.name}</strong>
                    <small>
                      {t("number")} {c.number}
                    </small>
                  </td>
                  <td>{person(c.teacherId)}</td>
                  <td>{person(c.supervisorId)}</td>
                  <td>{c.location}</td>
                  <td className="numeric">{num(c.studentCount, locale)}</td>
                  <td className="schedule-cell">
                    <span>{displayTime(c.startTime, locale)}</span>
                    <small>{displayTime(c.endTime, locale)}</small>
                  </td>
                  <td>
                    <RowActions
                      entity="classes"
                      record={c}
                      open={open}
                      act={act}
                      archived={archived}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager page={pageIndex} total={rows.length} onChange={setPage} />
    </>
  );
}
export function CurriculaView({
  data,
  query,
  open,
  act,
  archived = false,
}: {
  data: Workspace;
  query: string;
  open: (editor: Editor) => void;
  act: Action;
  archived?: boolean;
}) {
  const { t, locale } = useI18n();
  const [detail, setDetail] = useState<Curriculum | null>(null);
  const rows = data.curricula.filter(
    (c) =>
      Boolean(c.archivedAt) === archived &&
      c.name.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      {!rows.length ? (
        <Empty text={t("noData")} />
      ) : (
        <div className="curriculum-grid">
          {rows.map((c) => (
            <article className="curriculum-card" key={c._id}>
              <div className="book-spine" aria-hidden="true">
                <span>{c.name}</span>
              </div>
              <div className="curriculum-content">
                <h2>{c.name}</h2>
                <p>
                  {num(c.pages, locale)} {t("pages")} <span>·</span>{" "}
                  {num(c.topics.length, locale)} {t("topics")}
                </p>
                <ul>
                  {c.topics.slice(0, 3).map((topic) => (
                    <li key={topic.id}>
                      {topic.title}
                      <span>
                        {num(topic.startPage, locale)}–
                        {num(topic.endPage, locale)}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="curriculum-actions">
                  <Button variant="ghost" onClick={() => setDetail(c)}>
                    {t("details")}
                  </Button>
                  <RowActions
                    entity="curricula"
                    record={c}
                    open={open}
                    act={act}
                    archived={archived}
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      {detail && (
        <Modal title={detail.name} onClose={() => setDetail(null)}>
          <div className="detail-content">
            <p className="muted">
              {num(detail.pages, locale)} {t("pages")}
            </p>
            <table>
              <thead>
                <tr>
                  <th>{t("topic")}</th>
                  <th className="numeric">{t("pages")}</th>
                </tr>
              </thead>
              <tbody>
                {detail.topics.map((topic) => (
                  <tr key={topic.id}>
                    <td>{topic.title}</td>
                    <td className="numeric">
                      {num(topic.startPage, locale)}–
                      {num(topic.endPage, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!detail.topics.length && <Empty text={t("noTopics")} />}
          </div>
        </Modal>
      )}
    </>
  );
}
export function ReportsView({
  data,
  reports,
  query,
  open,
  act,
  archived = false,
}: {
  data: Workspace;
  reports: Report[];
  query: string;
  open: (editor: Editor) => void;
  act: Action;
  archived?: boolean;
}) {
  const { t, locale } = useI18n();
  const readOnly = useContext(ReadOnlyContext);
  const [classId, setClassId] = useState("");
  const [curriculumId, setCurriculumId] = useState("");
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(0);
  const rows = reports.filter(
    (r) =>
      (!classId || r.classId === classId) &&
      (!curriculumId || r.curriculumId === curriculumId) &&
      [r.className, r.lesson, r.teacherName, r.supervisorName].some((v) =>
        v.toLowerCase().includes(query.toLowerCase()),
      ),
  );
  const pageIndex = Math.min(
    page,
    Math.max(0, Math.ceil(rows.length / 12) - 1),
  );
  const exportRows = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const { downloadReportWorkbook } = await import("@/lib/report-export");
      await downloadReportWorkbook({
        data,
        reports: rows,
        locale,
        archived,
        filters: [
          `${t("class")}: ${data.classes.find((c) => c._id === classId)?.name ?? t("all")}`,
          `${t("curriculum")}: ${data.curricula.find((c) => c._id === curriculumId)?.name ?? t("all")}`,
          ...(query.trim() ? [`${t("searchLabel")}: ${query.trim()}`] : []),
        ],
      });
    } catch {
      toast.error(t("exportError"));
    } finally {
      setExporting(false);
    }
  };
  return (
    <>
      <div className="filter-row">
        <select
          value={classId}
          aria-label={t("class")}
          onChange={(e) => {
            setClassId(e.target.value);
            setPage(0);
          }}
        >
          <option value="">
            {t("class")}: {t("all")}
          </option>
          {data.classes.map((c) => (
            <option key={c._id} value={c._id}>
              {c.number} · {c.name}
            </option>
          ))}
        </select>
        <select
          aria-label={t("curriculum")}
          value={curriculumId}
          onChange={(e) => {
            setCurriculumId(e.target.value);
            setPage(0);
          }}
        >
          <option value="">
            {t("curriculum")}: {t("all")}
          </option>
          {data.curricula.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>
        <Button
          variant="ghost"
          onClick={exportRows}
          disabled={exporting}
          aria-busy={exporting}
        >
          <DownloadIcon />
          {t(exporting ? "exporting" : "export")}
        </Button>
      </div>
      <div className="report-summary">
        <span>
          {num(rows.length, locale)} {t("reports")}
        </span>
        <span>
          {t("presentAttendance")}:{" "}
          <strong>
            {num(
              rows.reduce((s, r) => s + r.present, 0),
              locale,
            )}
          </strong>
        </span>
        <span>
          {t("absentAttendance")}:{" "}
          <strong>
            {num(
              rows.reduce((s, r) => s + r.totalStudents - r.present, 0),
              locale,
            )}
          </strong>
        </span>
      </div>
      {!rows.length ? (
        <Empty text={t(readOnly ? "monitorNoReports" : "noReports")} />
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>{t("class")}</th>
                <th>{t("reportDate")}</th>
                <th className="numeric">{t("totalStudents")}</th>
                <th className="numeric">{t("present")}</th>
                <th className="numeric">{t("absent")}</th>
                <th>{t("lesson")}</th>
                <th>{t("status")}</th>
                <th>{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(pageIndex * 12, (pageIndex + 1) * 12).map((r) => {
                const inherited = Boolean(
                  data.classes.find((c) => c._id === r.classId)?.archivedAt,
                );
                const late =
                  r.weekStart &&
                  new Date(r.submittedAt) >
                    deadline(r.weekStart, data.settings);
                return (
                  <tr key={r._id}>
                    <td>
                      <strong>{r.className}</strong>
                      <small>{r.teacherName}</small>
                    </td>
                    <td>
                      {displayDate(r.reportDate, locale)}
                      <small>
                        {r.weekStart
                          ? `${t("week")}: ${displayDate(r.weekStart, locale)}`
                          : t("legacy")}
                      </small>
                    </td>
                    <td className="numeric">{num(r.totalStudents, locale)}</td>
                    <td className="numeric">{num(r.present, locale)}</td>
                    <td className="numeric">
                      {num(r.totalStudents - r.present, locale)}
                    </td>
                    <td className="lesson-cell">
                      <span>{r.lesson}</span>
                      <small>
                        {data.curricula.find((c) => c._id === r.curriculumId)
                          ?.name ?? "—"}
                      </small>
                    </td>
                    <td>
                      <Pill
                        tone={
                          !r.reportDate || !r.submittedAt
                            ? "neutral"
                            : late
                              ? "warning"
                              : "positive"
                        }
                      >
                        {t(
                          !r.reportDate
                            ? "legacy"
                            : !r.submittedAt
                              ? "submissionUnknown"
                              : late
                                ? "late"
                                : "onTimeStatus",
                        )}
                      </Pill>
                    </td>
                    <td>
                      {inherited && !readOnly ? (
                        <div className="row-actions">
                          <span className="muted small">
                            {t("restoreHint")}
                          </span>
                          <IconButton
                            label={t("delete")}
                            onClick={() => act("reports", r, "delete")}
                          >
                            <TrashIcon />
                          </IconButton>
                        </div>
                      ) : (
                        <RowActions
                          entity="reports"
                          record={r}
                          open={open}
                          act={act}
                          archived={archived}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Pager page={pageIndex} total={rows.length} onChange={setPage} />
    </>
  );
}
export function PeopleView({
  data,
  kind,
  query,
  open,
  act,
}: {
  data: Workspace;
  kind: "teacher" | "supervisor";
  query: string;
  open: (editor: Editor) => void;
  act: Action;
}) {
  const { t, locale } = useI18n();
  const [detail, setDetail] = useState<PersonStats | null>(null);
  const rows = rankPeople(
    data.people.filter(
      (p) =>
        p.kind === kind &&
        !p.archivedAt &&
        p.name.toLowerCase().includes(query.toLowerCase()),
    ),
    data.classes,
    data.reports,
    data.settings,
  );
  return (
    <>
      <div className="directory-summary">
        <span>
          {num(rows.length, locale)}{" "}
          {t(kind === "teacher" ? "teachers" : "supervisors")}
        </span>
        <span>
          {num(data.settings.rankingWeeks, locale)} {t("completedWeeks")}
        </span>
        {kind === "supervisor" && (
          <small>
            {num(data.settings.weights.timeliness, locale)}% {t("onTime")} ·{" "}
            {num(data.settings.weights.attendance, locale)}% {t("attendance")} ·{" "}
            {num(data.settings.weights.stability, locale)}% {t("stability")}
          </small>
        )}
      </div>
      {!rows.length ? (
        <Empty text={t("noData")} />
      ) : (
        <div className="table-scroll">
          <table className="people-table">
            <thead>
              <tr>
                {kind === "supervisor" && (
                  <th className="numeric">{t("rank")}</th>
                )}
                <th>{t("person")}</th>
                <th className="numeric">{t("classCount")}</th>
                <th className="numeric">{t("students")}</th>
                <th className="numeric">{t("onTime")}</th>
                <th className="numeric">{t("attendance")}</th>
                {kind === "supervisor" && (
                  <th className="numeric">{t("score")}</th>
                )}
                <th>{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.person._id}>
                  {kind === "supervisor" && (
                    <td className="numeric ranking-position">
                      {num(i + 1, locale)}
                    </td>
                  )}
                  <td>
                    <div className="person-cell">
                      <span className="avatar person-avatar">
                        {r.person.name.slice(0, 1)}
                      </span>
                      <div>
                        <strong>{r.person.name}</strong>
                        <small>
                          {r.person.phone ||
                            r.person.email ||
                            t(r.person.active ? "active" : "inactive")}
                        </small>
                      </div>
                      {!r.person.active && <Pill>{t("inactive")}</Pill>}
                    </div>
                  </td>
                  <td className="numeric">{num(r.classes, locale)}</td>
                  <td className="numeric">{num(r.students, locale)}</td>
                  <td className="numeric">
                    {num(r.onTime, locale)}{" "}
                    <span className="muted">/ {num(r.expected, locale)}</span>
                  </td>
                  <td className="numeric">
                    {num(r.attendance, locale, 1)}
                    {r.attendance === null ? "" : "%"}
                  </td>
                  {kind === "supervisor" && (
                    <td className="numeric score-cell">
                      <strong>{num(r.score, locale, 1)}</strong>
                      {r.score !== null && (
                        <div className="score-track">
                          <span style={{ width: `${r.score}%` }} />
                        </div>
                      )}
                    </td>
                  )}
                  <td>
                    <div className="row-actions">
                      <IconButton
                        label={t("details")}
                        onClick={() => setDetail(r)}
                      >
                        <EyeIcon />
                      </IconButton>
                      <RowActions
                        entity="people"
                        record={r.person}
                        open={open}
                        act={act}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {detail && (
        <Modal
          title={detail.person.name}
          description={t("supervisorDescription")}
          onClose={() => setDetail(null)}
          wide
        >
          <div className="detail-content">
            <div className="person-detail-metrics">
              <div>
                {t("classCount")}
                <strong>{num(detail.classes, locale)}</strong>
              </div>
              <div>
                {t("students")}
                <strong>{num(detail.students, locale)}</strong>
              </div>
              <div>
                {t("score")}
                <strong>{num(detail.score, locale, 1)}</strong>
              </div>
            </div>
            <h3>{t("classes")}</h3>
            <ul className="assignment-list">
              {data.classes
                .filter(
                  (c) =>
                    !c.archivedAt &&
                    c[kind === "teacher" ? "teacherId" : "supervisorId"] ===
                      detail.person._id,
                )
                .map((c) => (
                  <li key={c._id}>
                    <span>
                      {c.name}
                      <small>{c.location}</small>
                    </span>
                    <strong>
                      {num(c.studentCount, locale)} {t("students")}
                    </strong>
                  </li>
                ))}
            </ul>
            <h3>{t("completedWeeks")}</h3>
            <table>
              <thead>
                <tr>
                  <th>{t("week")}</th>
                  <th className="numeric">{t("coverage")}</th>
                  <th className="numeric">{t("attendance")}</th>
                </tr>
              </thead>
              <tbody>
                {detail.weekly.map((w) => (
                  <tr key={w.week}>
                    <td>{displayDate(w.week, locale)}</td>
                    <td className="numeric">
                      {num(w.submitted, locale)} / {num(w.expected, locale)}
                    </td>
                    <td className="numeric">
                      {num(w.attendance, locale, 1)}
                      {w.attendance === null ? "" : "%"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </>
  );
}
export function AnalyticsView({
  data,
  reports,
}: {
  data: Workspace;
  reports: Report[];
}) {
  const { t, locale } = useI18n();
  const [groupBy, setGroupBy] = useState<
    "teacherId" | "supervisorId" | "classId"
  >("supervisorId");
  const groups = new Map<string, Report[]>();
  reports.forEach((r) => {
    const key = r[groupBy];
    groups.set(key, [...(groups.get(key) ?? []), r]);
  });
  const rows = [...groups.entries()]
    .map(([id, reports]) => ({
      id,
      reports,
      rate: attendance(reports),
      name:
        groupBy === "classId"
          ? reports[0].className
          : groupBy === "teacherId"
            ? reports[0].teacherName
            : reports[0].supervisorName,
    }))
    .sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0));
  const seats = reports.reduce((s, r) => s + r.totalStudents, 0),
    present = reports.reduce((s, r) => s + r.present, 0);
  return (
    <>
      <Metrics data={data} reports={reports} />
      <div className="analytics-layout">
        <section className="panel">
          <div className="section-heading">
            <h2>{t("attendanceBreakdown")}</h2>
          </div>
          <div className="attendance-bars">
            {[
              [t("presentAttendance"), present, "present"],
              [t("absentAttendance"), seats - present, "absent"],
            ].map(([label, count, type]) => (
              <div key={String(type)}>
                <div>
                  <span>{label}</span>
                  <strong>{num(Number(count), locale)}</strong>
                </div>
                <div className="progress-track">
                  <span
                    className={String(type)}
                    style={{
                      width: `${seats ? (Number(count) / seats) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="muted small">{t("attendanceHint")}</p>
        </section>
        <section className="panel">
          <div className="section-heading">
            <h2>{t("groupBy")}</h2>
            <select
              aria-label={t("groupBy")}
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as typeof groupBy)}
            >
              <option value="supervisorId">{t("supervisor")}</option>
              <option value="teacherId">{t("teacher")}</option>
              <option value="classId">{t("class")}</option>
            </select>
          </div>
          {!rows.length ? (
            <Empty text={t("noData")} />
          ) : (
            <table>
              <thead>
                <tr>
                  <th>{t("name")}</th>
                  <th className="numeric">{t("reportCount")}</th>
                  <th className="numeric">{t("attendance")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td className="numeric">{num(r.reports.length, locale)}</td>
                    <td className="numeric">{num(r.rate, locale, 1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
      <p className="statistics-note">{t("enrollmentsHint")}</p>
    </>
  );
}
