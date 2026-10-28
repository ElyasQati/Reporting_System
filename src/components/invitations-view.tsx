"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { request, RequestError } from "@/lib/client";
import { errorText } from "@/lib/i18n";
import type { Invitation } from "@/lib/types";
import { useI18n } from "./providers";
import { Button, Empty, Field } from "./ui";
import { PlusIcon, RefreshIcon } from "./icons";

type Row = Omit<Invitation, "codeHash" | "expiresAt"> & { expiresAt: string };
export function InvitationsView() {
  const { t, locale } = useI18n();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [email, setEmail] = useState("");
  const [days, setDays] = useState(7);
  const [created, setCreated] = useState<{
    code: string;
    email: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const message = useCallback(
    (error: unknown) =>
      errorText(
        error instanceof RequestError ? error.code : "SERVER_UNAVAILABLE",
        locale,
      ),
    [locale],
  );
  const load = useCallback(async () => {
    const data = await request<{ invitations: Row[] }>(
      "/api/admin/invitations",
    );
    setRows(data.invitations);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void request<{ invitations: Row[] }>("/api/admin/invitations", {
      signal: controller.signal,
    })
      .then((data) => {
        if (!controller.signal.aborted) setRows(data.invitations);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(message(error));
      });
    return () => controller.abort();
  }, [message]);
  const run = async (task: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await task();
    } catch (error) {
      setError(message(error));
    } finally {
      setBusy(false);
    }
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      const result = await request<{ code: string; email: string }>(
        "/api/admin/invitations",
        { method: "POST", body: JSON.stringify({ email, days }) },
      );
      setCreated(result);
      setEmail("");
      await load();
    });
  };
  const date = (value: string) =>
    new Intl.DateTimeFormat(locale === "fa" ? "fa-AF-u-ca-persian" : "en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
      hour12: true,
      timeZone: "Asia/Kabul",
    }).format(new Date(value));
  return (
    <div className="invitation-layout">
      <form
        className="invitation-form settings-panel"
        onSubmit={submit}
        aria-busy={busy}
      >
        <h2>{t("createInvitation")}</h2>
        <p className="muted small">{t("invitationsDescription")}</p>
        <Field label={t("inviteEmail")}>
          <input
            required
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            maxLength={254}
            value={email}
            dir="ltr"
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
        <Field label={t("inviteValidity")}>
          <select
            value={days}
            onChange={(event) => setDays(Number(event.target.value))}
          >
            {[1, 3, 7, 14, 30].map((value) => (
              <option key={value} value={value}>
                {new Intl.NumberFormat(locale).format(value)} {t("daysUnit")}
              </option>
            ))}
          </select>
        </Field>
        <Button type="submit" variant="primary" disabled={busy}>
          <PlusIcon />
          {t(busy ? "saving" : "createInvitation")}
        </Button>
        {created && (
          <section className="invitation-result" aria-live="polite">
            <h3>{t("invitationCreated")}</h3>
            <p dir="ltr" className="invite-email">
              {created.email}
            </p>
            <Field label={t("invitationCode")}>
              <input
                readOnly
                value={created.code}
                dir="ltr"
                onFocus={(event) => event.target.select()}
              />
            </Field>
            <p className="muted small">{t("invitationCopyHint")}</p>
            <Button
              type="button"
              onClick={() => {
                void navigator.clipboard
                  .writeText(created.code)
                  .then(() => toast.success(t("copiedCode")))
                  .catch(() =>
                    setError(
                      locale === "fa"
                        ? "کد را از کادر انتخاب و کپی کنید."
                        : "Select and copy the code from the field.",
                    ),
                  );
              }}
            >
              {t("copyCode")}
            </Button>
          </section>
        )}
      </form>
      <section className="invitation-history" aria-busy={busy || rows === null}>
        <div className="section-heading">
          <h2>{t("inviteHistory")}</h2>
          <Button disabled={busy} onClick={() => void run(load)}>
            <RefreshIcon />
            {t("refresh")}
          </Button>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {rows === null ? (
          <p className="muted">{t("loading")}</p>
        ) : rows.length === 0 ? (
          <Empty text={t("noInvitations")} />
        ) : (
          <ul className="invitation-list">
            {rows.map((row) => {
              const active =
                !row.usedAt &&
                !row.revokedAt &&
                new Date(row.expiresAt) > new Date();
              const state = row.usedAt
                ? "inviteUsed"
                : row.revokedAt
                  ? "inviteRevoked"
                  : active
                    ? "inviteActive"
                    : "inviteExpired";
              return (
                <li key={row._id}>
                  <div className="invitation-row-heading">
                    <strong dir="ltr" className="invite-email">
                      {row.email}
                    </strong>
                    <span
                      className={`status-badge ${active ? "status-good" : ""}`}
                    >
                      {t(state)}
                    </span>
                  </div>
                  <div className="invitation-row-details">
                    <span>
                      {t("createdAt")}: {date(row.createdAt)}
                    </span>
                    <span>
                      {t("expiresAt")}: {date(row.expiresAt)}
                    </span>
                    {active && (
                      <Button
                        variant="ghost"
                        disabled={busy}
                        onClick={() =>
                          void run(async () => {
                            await request("/api/admin/invitations", {
                              method: "PATCH",
                              body: JSON.stringify({ id: row._id }),
                            });
                            if (created?.email === row.email) setCreated(null);
                            await load();
                          })
                        }
                      >
                        {t("revokeInvitation")}
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
