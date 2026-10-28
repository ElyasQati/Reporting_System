"use client";
import { useEffect, useState, type FormEvent } from "react";
import { request, RequestError } from "@/lib/client";
import { ADMIN_EMAIL } from "@/lib/access";
import { errorText } from "@/lib/i18n";
import { useI18n } from "./providers";
import { Appearance, Logo } from "./shell";
import { Button, Field } from "./ui";
import { ArrowRightIcon, CheckIcon, LockIcon } from "./icons";
export function Login({ onLogin }: { onLogin: () => void }) {
  const { t, locale } = useI18n();
  const [registering, setRegistering] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [invitationCode, setInvitationCode] = useState("");
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState<{
    challengeId: string;
    expiresAt: string;
    retryAfter: number;
  } | null>(null);
  const [resendAt, setResendAt] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const adminEmail = email.trim().toLowerCase() === ADMIN_EMAIL;
  useEffect(() => {
    const tick = () =>
      setRemaining(Math.max(0, Math.ceil((resendAt - Date.now()) / 1000)));
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [resendAt]);
  const send = async () => {
    const result = await request<NonNullable<typeof challenge>>(
      "/api/auth/email/send",
      {
        method: "POST",
        body: JSON.stringify({
          email,
          ...(registering && name ? { name } : {}),
          ...(registering && !adminEmail ? { invitationCode } : {}),
          locale,
        }),
      },
    );
    setChallenge(result);
    setResendAt(Date.now() + result.retryAfter * 1000);
    setRemaining(result.retryAfter);
    setCode("");
  };
  const run = async (task: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await task();
    } catch (error) {
      setError(
        errorText(
          error instanceof RequestError ? error.code : "SERVER_UNAVAILABLE",
          locale,
        ),
      );
    } finally {
      setBusy(false);
    }
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      if (!challenge) {
        await send();
        return;
      }
      await request("/api/auth/email/verify", {
        method: "POST",
        body: JSON.stringify({ challengeId: challenge.challengeId, code }),
      });
      onLogin();
    });
  };
  return (
    <div className="login-page">
      <header>
        <Logo />
        <Appearance />
      </header>
      <main className="login-main">
        <section className="login-story">
          <p className="story-context">{t("tagline")}</p>
          <h1>{t("signinTitle")}</h1>
          <p className="story-description">{t("signinDescription")}</p>
          <div className="weekly-motif" aria-hidden="true">
            <div className="motif-heading">
              <span>{t("currentWeek")}</span>
              <span>{t("reportHealth")}</span>
            </div>
            {(
              ["signinFeature1", "signinFeature2", "signinFeature3"] as const
            ).map((key) => (
              <div className="motif-row" key={key}>
                <CheckIcon />
                <span>{t(key)}</span>
              </div>
            ))}
            <div className="motif-footer">
              <span>{t("friday")}</span>
              <span className="motif-line" />
              <span>{t("thursday")} · 11:59 PM</span>
            </div>
          </div>
          <p className="story-footnote">{t("welcome")}</p>
        </section>
        <section className="login-form-panel">
          <div className="login-form-heading">
            <LockIcon />
            <h2>
              {t(challenge ? "otpHeading" : registering ? "signup" : "signin")}
            </h2>
            <p>
              {t(
                challenge
                  ? "otpHint"
                  : registering
                    ? "emailSignupHint"
                    : "emailSigninHint",
              )}
            </p>
          </div>
          <form onSubmit={submit} aria-busy={busy}>
            {challenge ? (
              <>
                <p className="otp-destination" dir="ltr">
                  {email.trim().toLowerCase()}
                </p>
                <Field label={t("otpCode")}>
                  <input
                    key="otp"
                    className="otp-input"
                    autoFocus
                    required
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    minLength={6}
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    dir="ltr"
                    aria-describedby="otp-help"
                  />
                </Field>
                <p id="otp-help" className="muted small">
                  {t("otpHint")}
                </p>
              </>
            ) : (
              <>
                {registering && (
                  <Field label={t("fullName")}>
                    <input
                      required
                      autoComplete="name"
                      maxLength={150}
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      dir="auto"
                    />
                  </Field>
                )}
                <Field label={t("email")}>
                  <input
                    key="email"
                    type="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    maxLength={254}
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoFocus
                    dir="ltr"
                  />
                </Field>
                {registering && !adminEmail && (
                  <>
                    <Field label={t("invitationCode")}>
                      <input
                        required
                        autoComplete="off"
                        minLength={8}
                        maxLength={40}
                        value={invitationCode}
                        onChange={(event) =>
                          setInvitationCode(event.target.value.toUpperCase())
                        }
                        dir="ltr"
                        aria-describedby="invite-help"
                      />
                    </Field>
                    <p id="invite-help" className="muted small">
                      {t("inviteHint")}
                    </p>
                  </>
                )}
              </>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <Button variant="primary" disabled={busy} type="submit">
              {t(busy ? "loading" : challenge ? "verifyCode" : "sendCode")}
              <ArrowRightIcon className="directional-icon" />
            </Button>
          </form>
          {challenge ? (
            <div className="otp-actions">
              <Button
                variant="ghost"
                disabled={busy || remaining > 0}
                onClick={() => void run(send)}
              >
                {remaining > 0
                  ? `${t("resendIn")} ${remaining} ${t("seconds")}`
                  : t("resendCode")}
              </Button>
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  setChallenge(null);
                  setCode("");
                  setError("");
                }}
              >
                {t("changeEmail")}
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              className="auth-switch"
              disabled={busy}
              onClick={() => {
                setRegistering(!registering);
                setError("");
                setInvitationCode("");
              }}
            >
              {t(registering ? "switchToSignin" : "switchToSignup")}
            </Button>
          )}
          <p className="login-security">{t("credentials")}</p>
        </section>
      </main>
      <footer className="login-footer">
        {t("brand")} · {t("tagline")}
      </footer>
    </div>
  );
}
