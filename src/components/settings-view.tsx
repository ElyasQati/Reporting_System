"use client";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { errorText, type MessageKey } from "@/lib/i18n";
import { num, request, RequestError } from "@/lib/client";
import type { Workspace } from "@/lib/types";
import { settingsSchema } from "@/lib/validation";
import { useI18n } from "./providers";
import { Button, Field } from "./ui";
import { TimeField } from "./date-controls";
import { DownloadIcon } from "./icons";
const days: MessageKey[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];
export function SettingsView({
  data,
  onSaved,
}: {
  data: Workspace;
  onSaved: () => Promise<void>;
}) {
  const { t, locale } = useI18n();
  const [form, setForm] = useState(data.settings);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const run = async (key: string, task: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    setError("");
    try {
      await task();
      toast.success(t("saved"));
    } catch (e) {
      setError(
        errorText(
          e instanceof RequestError ? e.code : "VALIDATION_ERROR",
          locale,
        ),
      );
    } finally {
      setBusy("");
    }
  };
  const save = (e: FormEvent) => {
    e.preventDefault();
    void run("settings", async () => {
      const parsed = settingsSchema.parse(form);
      await request("/api/settings", {
        method: "PUT",
        body: JSON.stringify(parsed),
      });
      await onSaved();
    });
  };
  return (
    <div className="settings-layout">
      <form onSubmit={save}>
        <section className="settings-section">
          <div>
            <h2>{t("organization")}</h2>
            <p>{t("workspace")}</p>
          </div>
          <div className="settings-panel">
            <Field label={t("organization")}>
              <input
                required
                value={form.organization}
                onChange={(e) =>
                  setForm({ ...form, organization: e.target.value })
                }
              />
            </Field>
          </div>
        </section>
        <section className="settings-section">
          <div>
            <h2>{t("calendar")}</h2>
            <p>
              {t("friday")} — {t("thursday")}
              <br />
              {t("due")}: {locale === "fa" ? "۱۱:۵۹ شب" : "11:59 PM"}
            </p>
          </div>
          <div className="settings-panel">
            <div className="form-grid">
              <Field label={t("timezone")}>
                <select
                  value={form.timezone}
                  onChange={(e) =>
                    setForm({ ...form, timezone: e.target.value })
                  }
                >
                  {["Asia/Kabul", "Asia/Tehran", "UTC"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </Field>
              <Field label={t("weekStartsOn")}>
                <select
                  value={form.weekStartsOn}
                  onChange={(e) =>
                    setForm({ ...form, weekStartsOn: Number(e.target.value) })
                  }
                >
                  {days.map((d, i) => (
                    <option key={d} value={i}>
                      {t(d)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t("deadlineDay")}>
                <select
                  value={form.deadlineDay}
                  onChange={(e) =>
                    setForm({ ...form, deadlineDay: Number(e.target.value) })
                  }
                >
                  {days.map((d, i) => (
                    <option key={d} value={i}>
                      {t(d)}
                    </option>
                  ))}
                </select>
              </Field>
              <TimeField
                label={t("deadlineHour")}
                fixedMinute
                value={`${String(form.deadlineHour).padStart(2, "0")}:59`}
                onChange={(v) =>
                  setForm({ ...form, deadlineHour: Number(v.split(":")[0]) })
                }
              />
            </div>
          </div>
        </section>
        <section className="settings-section">
          <div>
            <h2>{t("ranking")}</h2>
            <p>{t("rankingHint")}</p>
          </div>
          <div className="settings-panel">
            <Field label={t("rankingWeeks")}>
              <input
                type="number"
                min={2}
                max={52}
                value={form.rankingWeeks}
                onChange={(e) =>
                  setForm({ ...form, rankingWeeks: Number(e.target.value) })
                }
              />
            </Field>
            <div className="weight-fields">
              {(["timeliness", "attendance", "stability"] as const).map(
                (key) => (
                  <Field
                    key={key}
                    label={t(
                      `${key === "timeliness" ? "timeliness" : key}Weight` as MessageKey,
                    )}
                  >
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={form.weights[key]}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          weights: {
                            ...form.weights,
                            [key]: Number(e.target.value),
                          },
                        })
                      }
                    />
                  </Field>
                ),
              )}
            </div>
            <div className="weight-total">
              {t("total")}:{" "}
              <strong>
                {num(
                  Object.values(form.weights).reduce((s, v) => s + v, 0),
                  locale,
                )}
                %
              </strong>
            </div>
            <Button variant="primary" type="submit" disabled={Boolean(busy)}>
              {t(busy === "settings" ? "saving" : "save")}
            </Button>
          </div>
        </section>
      </form>
      <section className="settings-section">
        <div>
          <h2>{t("emailAccount")}</h2>
          <p>{t("emailAccountHint")}</p>
        </div>
        <div className="settings-panel">
          <p dir="ltr">{data.user.email}</p>
          <p className="muted">
            {t(data.user.isSystemAdmin ? "adminRole" : "memberRole")}
          </p>
        </div>
      </section>
      <section className="settings-section">
        <div>
          <h2>{t("backup")}</h2>
          <p>{t("backupDescription")}</p>
        </div>
        <div className="settings-panel">
          <a
            className="button button-secondary"
            href={`/api/backup?locale=${locale}`}
            download
          >
            <DownloadIcon />
            {t("downloadBackup")}
          </a>
          <p className="muted small">{t("backupRestoreHint")}</p>
          <Field label={t("file")}>
            <input
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/json,.json"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </Field>
          <Button
            disabled={!file || Boolean(busy)}
            onClick={() =>
              void run("restore", async () => {
                const excel = file!.name.toLowerCase().endsWith(".xlsx");
                await request("/api/backup/restore", {
                  method: "POST",
                  headers: {
                    "Content-Type": excel
                      ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                      : "application/json",
                  },
                  body: excel ? await file!.arrayBuffer() : await file!.text(),
                });
                await onSaved();
              })
            }
          >
            {t(busy === "restore" ? "saving" : "restoreBackup")}
          </Button>
        </div>
      </section>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
