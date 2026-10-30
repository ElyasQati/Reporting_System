"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { calendarParts, dateKey, monthBounds } from "@/lib/dates";
import { errorText, type MessageKey } from "@/lib/i18n";
import { request, RequestError } from "@/lib/client";
import type { Workspace } from "@/lib/types";
import { useI18n } from "./providers";
import { Shell } from "./shell";
import { Login } from "./login";
import { Button, Confirm, Empty, IconButton } from "./ui";
import { PlusIcon, RefreshIcon, SearchIcon } from "./icons";
import { EntityForm, type Editor, type Entity } from "./entity-form";
import { PeriodPicker } from "./date-controls";
import { Dashboard } from "./dashboard";
import {
  AnalyticsView,
  ClassesView,
  CurriculaView,
  PeopleView,
  ReportsView,
  type Action,
} from "./data-views";
import { SettingsView } from "./settings-view";
import { InvitationsView } from "./invitations-view";
import { MonitorAccessView } from "./monitor-access-view";
import { MonitorWorkspace } from "./monitor-workspace";
const descriptions: Record<string, MessageKey> = {
  dashboard: "overviewDescription",
  classes: "classDescription",
  reports: "reportDescription",
  curricula: "curriculumDescription",
  teachers: "teacherDescription",
  supervisors: "supervisorDescription",
  analytics: "attendanceHint",
  archive: "archiveDescription",
  settings: "preferences",
  invitations: "invitationsDescription",
  "monitor-access": "monitorAccessDescription",
};
export function WorkspaceApp({ view }: { view: string }) {
  const { locale, t } = useI18n();
  const calendar = locale === "fa" ? "persian" : "gregory";
  const [period, setPeriod] = useState(() => {
    const p = calendarParts(dateKey(new Date()), calendar);
    return `${p.year}-${String(p.month).padStart(2, "0")}`;
  });
  const [data, setData] = useState<Workspace | null>(null);
  const [status, setStatus] = useState<"loading" | "login" | "ready" | "error">(
    "loading",
  );
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState<Editor | null>(null);
  const [archiveTab, setArchiveTab] = useState<Entity>("classes");
  const [legacy, setLegacy] = useState(false);
  const [confirmation, setConfirmation] = useState<{
    entity: Entity;
    id: string;
    action: "archive" | "restore" | "delete";
  } | null>(null);
  const [mutating, setMutating] = useState(false);
  const pendingRequest = useRef<AbortController | null>(null);
  const load = useCallback(() => {
    pendingRequest.current?.abort();
    const controller = new AbortController();
    pendingRequest.current = controller;
    return request<Workspace>(
      `/api/workspace?calendar=${calendar}&period=${period}`,
      { signal: controller.signal },
    )
      .then((result) => {
        if (!controller.signal.aborted) {
          setData(result);
          setStatus("ready");
          setError("");
        }
      })
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        if (e instanceof RequestError && e.status === 401) {
          setData(null);
          setStatus("login");
        } else {
          setError(
            errorText(
              e instanceof RequestError ? e.code : "SERVER_UNAVAILABLE",
              locale,
            ),
          );
          setStatus("error");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setRefreshing(false);
      });
  }, [calendar, period, locale]);
  useEffect(() => {
    void load();
    const controller = pendingRequest.current;
    const expire = () => {
      pendingRequest.current?.abort();
      setData(null);
      setStatus("login");
      setEditor(null);
      setConfirmation(null);
      setQuery("");
      setLegacy(false);
      setArchiveTab("classes");
      setConfirmation(null);
    };
    window.addEventListener("session-expired", expire);
    const reloadAccount = () => {
      pendingRequest.current?.abort();
      setData(null);
      setStatus("loading");
      setEditor(null);
      setConfirmation(null);
      setQuery("");
      setLegacy(false);
      setArchiveTab("classes");
      void load();
    };
    const accountChanged = (event: StorageEvent) => {
      if (event.key === "report-desk-auth-change") reloadAccount();
    };
    const restoredPage = (event: PageTransitionEvent) => {
      if (event.persisted) reloadAccount();
    };
    window.addEventListener("storage", accountChanged);
    window.addEventListener("pageshow", restoredPage);
    return () => {
      controller?.abort();
      window.removeEventListener("session-expired", expire);
      window.removeEventListener("storage", accountChanged);
      window.removeEventListener("pageshow", restoredPage);
    };
  }, [load]);
  useEffect(() => {
    if (data?.user.role !== "monitor") return;
    const refreshVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    const timer = window.setInterval(refreshVisible, 15000);
    window.addEventListener("focus", refreshVisible);
    document.addEventListener("visibilitychange", refreshVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshVisible);
      document.removeEventListener("visibilitychange", refreshVisible);
    };
  }, [data?.user.role, load]);
  const logout = async () => {
    try {
      await request("/api/auth", { method: "DELETE" });
      setData(null);
      setStatus("login");
      setEditor(null);
      setConfirmation(null);
      setQuery("");
      setLegacy(false);
      setArchiveTab("classes");
    } catch (e) {
      toast.error(
        errorText(
          e instanceof RequestError ? e.code : "SERVER_UNAVAILABLE",
          locale,
        ),
      );
    }
  };
  const act: Action = (entity, record, action) =>
    setConfirmation({ entity, id: record._id, action });
  const confirm = async () => {
    if (!confirmation || mutating) return;
    setMutating(true);
    try {
      await request(`/api/${confirmation.entity}/${confirmation.id}`, {
        method: "PATCH",
        body: JSON.stringify({ action: confirmation.action }),
      });
      toast.success(t("saved"));
      setConfirmation(null);
      await load();
    } catch (e) {
      toast.error(
        errorText(
          e instanceof RequestError ? e.code : "SERVER_UNAVAILABLE",
          locale,
        ),
      );
    } finally {
      setMutating(false);
    }
  };
  if (status === "login")
    return (
      <Login
        onLogin={() => {
          setStatus("loading");
          void load();
        }}
      />
    );
  if (status === "loading" || !data)
    return (
      <div className="loading-screen" aria-busy={status === "loading"}>
        <div className="loading-mark" />
        <h1>{t(status === "error" ? "errorTitle" : "loading")}</h1>
        {error && <p role="alert">{error}</p>}
        {status === "error" && (
          <Button onClick={() => void load()}>{t("retry")}</Button>
        )}
      </div>
    );
  const range = monthBounds(period, calendar);
  const isArchived = (r: Workspace["reports"][number]) =>
    Boolean(
      r.archivedAt || data.classes.find((c) => c._id === r.classId)?.archivedAt,
    );
  const periodReports = data.reports.filter(
    (r) =>
      r.reportDate &&
      r.reportDate >= range.from &&
      r.reportDate < range.to &&
      !isArchived(r),
  );
  const reports = legacy
    ? data.reports.filter((r) => !r.reportDate && !isArchived(r))
    : periodReports;
  if (data.user.role === "monitor")
    return (
      <MonitorWorkspace
        data={data}
        view={view}
        reports={periodReports}
        period={period}
        onPeriod={(value) => {
          setRefreshing(true);
          setPeriod(value);
        }}
        refresh={() => {
          setRefreshing(true);
          void load();
        }}
        refreshing={refreshing}
        error={error}
        onLogout={() => void logout()}
      />
    );
  const creation: Record<string, Editor> = {
    classes: { entity: "classes" },
    reports: { entity: "reports" },
    curricula: { entity: "curricula" },
    teachers: { entity: "people", kind: "teacher" },
    supervisors: { entity: "people", kind: "supervisor" },
    dashboard: { entity: "reports" },
  };
  const createLabel: Record<string, MessageKey> = {
    classes: "addClass",
    reports: "addReport",
    curricula: "addCurriculum",
    teachers: "addTeacher",
    supervisors: "addSupervisor",
    dashboard: "addReport",
  };
  const periodVisible = [
    "dashboard",
    "reports",
    "analytics",
    "archive",
  ].includes(view);
  const open = (value: Editor) => setEditor(value);
  return (
    <Shell
      view={view}
      name={data.user.name}
      organization={data.settings.organization}
      isSystemAdmin={data.user.isSystemAdmin}
      onLogout={() => void logout()}
    >
      <div className="page-heading">
        <div>
          <h1>
            {t(
              view === "monitor-access"
                ? "monitorAccess"
                : (view as MessageKey),
            )}
          </h1>
          <p>{t(descriptions[view])}</p>
        </div>
        <div className="page-actions">
          {periodVisible && (
            <PeriodPicker
              period={period}
              onChange={(value) => {
                setRefreshing(true);
                setPeriod(value);
              }}
            />
          )}
          <IconButton
            label={t("refresh")}
            disabled={refreshing}
            onClick={() => {
              setRefreshing(true);
              void load();
            }}
          >
            <RefreshIcon className={refreshing ? "is-spinning" : ""} />
          </IconButton>
          {creation[view] && (
            <Button variant="primary" onClick={() => setEditor(creation[view])}>
              <PlusIcon />
              {t(createLabel[view])}
            </Button>
          )}
        </div>
      </div>
      {error && (
        <div className="inline-notice" role="alert">
          {error}
          <Button onClick={() => void load()}>{t("retry")}</Button>
        </div>
      )}
      {view === "invitations" &&
        (data.user.isSystemAdmin ? (
          <InvitationsView />
        ) : (
          <p className="form-error" role="alert">
            {errorText("FORBIDDEN", locale)}
          </p>
        ))}
      {view === "monitor-access" && <MonitorAccessView />}
      {data.legacyCount > 0 && view === "reports" && (
        <div className="inline-notice">
          {t("legacyHint")}
          <Button onClick={() => setLegacy((v) => !v)}>
            {t(legacy ? "reports" : "legacy")}
          </Button>
        </div>
      )}
      {[
        "classes",
        "reports",
        "curricula",
        "teachers",
        "supervisors",
        "archive",
      ].includes(view) && (
        <div className="search-toolbar">
          <div className="search-field">
            <SearchIcon />
            <input
              aria-label={t("search")}
              placeholder={t(
                view === "teachers" || view === "supervisors"
                  ? "searchPeople"
                  : "search",
              )}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <span className="freshness">{t("refreshed")}</span>
        </div>
      )}
      {view === "dashboard" && (
        <Dashboard data={data} reports={periodReports} open={open} />
      )}
      {view === "classes" && (
        <ClassesView data={data} query={query} open={open} act={act} />
      )}
      {view === "reports" && (
        <ReportsView
          data={data}
          reports={reports}
          query={query}
          open={open}
          act={act}
        />
      )}
      {view === "curricula" && (
        <CurriculaView data={data} query={query} open={open} act={act} />
      )}
      {(view === "teachers" || view === "supervisors") && (
        <PeopleView
          data={data}
          kind={view === "teachers" ? "teacher" : "supervisor"}
          query={query}
          open={open}
          act={act}
        />
      )}
      {view === "analytics" && (
        <AnalyticsView data={data} reports={periodReports} />
      )}
      {view === "settings" && <SettingsView data={data} onSaved={load} />}
      {view === "archive" && (
        <>
          <div className="tabs" role="tablist" aria-label={t("archive")}>
            {(["classes", "reports", "curricula", "people"] as const).map(
              (entity) => (
                <button
                  role="tab"
                  aria-selected={archiveTab === entity}
                  key={entity}
                  onClick={() => setArchiveTab(entity)}
                >
                  {t(entity === "people" ? "person" : entity)}
                </button>
              ),
            )}
          </div>
          <p className="panel-caption">{t("classArchiveHint")}</p>
          {archiveTab === "classes" && (
            <ClassesView
              data={data}
              query={query}
              open={open}
              act={act}
              archived
            />
          )}
          {archiveTab === "reports" && (
            <ReportsView
              data={data}
              reports={data.reports.filter(
                (r) =>
                  isArchived(r) &&
                  (!r.reportDate ||
                    (r.reportDate >= range.from && r.reportDate < range.to)),
              )}
              query={query}
              open={open}
              act={act}
              archived
            />
          )}
          {archiveTab === "curricula" && (
            <CurriculaView
              data={data}
              query={query}
              open={open}
              act={act}
              archived
            />
          )}
          {archiveTab === "people" &&
            (!data.people.some((p) => p.archivedAt) ? (
              <Empty text={t("noData")} />
            ) : (
              <div className="archived-people">
                {data.people
                  .filter(
                    (p) =>
                      p.archivedAt &&
                      p.name.toLowerCase().includes(query.toLowerCase()),
                  )
                  .map((p) => (
                    <div key={p._id}>
                      <span>{p.name}</span>
                      <Button onClick={() => act("people", p, "restore")}>
                        {t("restore")}
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => act("people", p, "delete")}
                      >
                        {t("delete")}
                      </Button>
                    </div>
                  ))}
              </div>
            ))}
        </>
      )}
      {editor && (
        <EntityForm
          editor={editor}
          data={data}
          onClose={() => setEditor(null)}
          onSaved={load}
        />
      )}
      {confirmation && (
        <Confirm
          title={t(
            confirmation.action === "archive"
              ? "archiveAction"
              : confirmation.action === "restore"
                ? "restore"
                : "delete",
          )}
          description={t(
            confirmation.action === "delete"
              ? "deleteConfirm"
              : confirmation.action === "restore"
                ? "restore"
                : "archiveConfirm",
          )}
          onConfirm={() => void confirm()}
          onClose={() => !mutating && setConfirmation(null)}
          busy={mutating}
        />
      )}
    </Shell>
  );
}
