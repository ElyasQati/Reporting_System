"use client";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { request, RequestError } from "@/lib/client";
import { errorText } from "@/lib/i18n";
import { useI18n } from "./providers";
import { Button, Confirm, Pill } from "./ui";
import { EyeIcon } from "./icons";

type Access = {
  active: boolean;
  createdAt: string;
  revokedAt: string | null;
  lastUsedAt: string | null;
};
export function MonitorAccessView() {
  const { t, locale } = useI18n();
  const [access, setAccess] = useState<Access | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState<"replace" | "revoke" | null>(
    null,
  );
  const fail = useCallback(
    (error: unknown) =>
      setError(
        errorText(
          error instanceof RequestError ? error.code : "SERVER_UNAVAILABLE",
          locale,
        ),
      ),
    [locale],
  );
  const load = useCallback(
    () =>
      request<{ access: Access | null }>("/api/monitor-access")
        .then((result) => {
          setAccess(result.access);
          setError("");
        })
        .catch(fail)
        .finally(() => setLoading(false)),
    [fail],
  );
  useEffect(() => {
    void load();
  }, [load]);
  const update = async (action: "replace" | "revoke") => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (action === "replace") {
        const result = await request<{ code: string; access: Access }>(
          "/api/monitor-access",
          { method: "POST" },
        );
        setAccess(result.access);
        setCode(result.code);
      } else {
        await request("/api/monitor-access", { method: "DELETE" });
        setCode("");
        await load();
      }
      setConfirmation(null);
    } catch (error) {
      fail(error);
    } finally {
      setBusy(false);
    }
  };
  const timestamp = (value: string | null) =>
    value
      ? new Intl.DateTimeFormat(
          locale === "fa" ? "fa-AF-u-ca-persian" : "en-US",
          {
            dateStyle: "medium",
            timeStyle: "short",
            hour12: true,
            timeZone: "Asia/Kabul",
          },
        ).format(new Date(value))
      : "—";
  return (
    <div className="monitor-access-layout">
      <section
        className="panel monitor-access-panel"
        aria-busy={loading || busy}
      >
        <div className="section-heading">
          <h2>{t("monitorAccess")}</h2>
          <EyeIcon />
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
            <Button onClick={() => void load()}>{t("retry")}</Button>
          </p>
        )}
        {loading ? (
          <p role="status">{t("loading")}</p>
        ) : (
          <>
            <Pill tone={access?.active ? "positive" : "neutral"}>
              {t(
                access?.active
                  ? "monitorAccessActive"
                  : "monitorAccessInactive",
              )}
            </Pill>
            <p>{t(access ? "monitorCodeRotation" : "monitorAccessEmpty")}</p>
            {access && (
              <dl className="monitor-facts">
                <div>
                  <dt>{t("createdAt")}</dt>
                  <dd>{timestamp(access.createdAt)}</dd>
                </div>
                <div>
                  <dt>{t("monitorLastUsed")}</dt>
                  <dd>{timestamp(access.lastUsedAt)}</dd>
                </div>
              </dl>
            )}
            {code && (
              <div className="invitation-result" role="status">
                <h3>{t("monitorCodeReady")}</h3>
                <p>{t("monitorCodeHint")}</p>
                <input
                  className="monitor-code-output"
                  aria-label={t("monitorCode")}
                  readOnly
                  value={code}
                  dir="ltr"
                  onFocus={(event) => event.currentTarget.select()}
                />
                <Button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(code);
                      toast.success(t("copiedCode"));
                    } catch {
                      toast.error(t("monitorCodeHint"));
                    }
                  }}
                >
                  {t("copyCode")}
                </Button>
              </div>
            )}
            <div className="monitor-access-actions">
              <Button
                variant="primary"
                disabled={busy || Boolean(error)}
                onClick={() =>
                  access?.active
                    ? setConfirmation("replace")
                    : void update("replace")
                }
              >
                {t(access?.active ? "monitorCodeReplace" : "monitorCodeCreate")}
              </Button>
              {access?.active && (
                <Button
                  variant="danger"
                  disabled={busy}
                  onClick={() => setConfirmation("revoke")}
                >
                  {t("monitorCodeRevoke")}
                </Button>
              )}
            </div>
          </>
        )}
      </section>
      <aside className="monitor-permissions">
        <h2>{t("monitorPermissions")}</h2>
        <p>{t("monitorPermissionsHint")}</p>
        <h2>{t("monitorCode")}</h2>
        <p>{t("monitorCodeSecurity")}</p>
        <p className="muted">{t("monitorCodeRotation")}</p>
      </aside>
      {confirmation && (
        <Confirm
          title={t(
            confirmation === "replace"
              ? "monitorCodeReplace"
              : "monitorCodeRevoke",
          )}
          description={t(
            confirmation === "replace"
              ? "monitorReplaceConfirm"
              : "monitorRevokeConfirm",
          )}
          onConfirm={() => void update(confirmation)}
          onClose={() => !busy && setConfirmation(null)}
          busy={busy}
        />
      )}
    </div>
  );
}
