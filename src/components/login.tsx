"use client";
import { useState, type FormEvent } from "react";
import { request, RequestError } from "@/lib/client";
import { errorText } from "@/lib/i18n";
import { useI18n } from "./providers";
import { Appearance, Logo } from "./shell";
import { Button, Field } from "./ui";
import { ArrowRightIcon, CheckIcon, LockIcon } from "./icons";
export function Login({ onLogin }: { onLogin: () => void }) {
  const { t, locale } = useI18n();
  const [registering, setRegistering] = useState(false);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (registering && password !== confirmation) {
      setError(t("passwordMismatch"));
      return;
    }
    setBusy(true);
    setError("");
    try {
      await request(registering ? "/api/auth/register" : "/api/auth", {
        method: "POST",
        body: JSON.stringify({ name, username, password }),
      });
      onLogin();
    } catch (e) {
      setError(
        registering &&
          e instanceof RequestError &&
          e.code === "VALIDATION_ERROR"
          ? t("registrationInvalid")
          : errorText(
              e instanceof RequestError ? e.code : "SERVER_UNAVAILABLE",
              locale,
            ),
      );
    } finally {
      setBusy(false);
    }
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
            <h2>{t(registering ? "signup" : "signin")}</h2>
            <p>{t(registering ? "signupHint" : "signinHint")}</p>
          </div>
          <form onSubmit={submit}>
            {registering && (
              <Field label={t("fullName")}>
                <input
                  required
                  autoComplete="name"
                  maxLength={150}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  dir="auto"
                />
              </Field>
            )}
            <Field label={t("username")}>
              <input
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                minLength={registering ? 3 : 1}
                maxLength={80}
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                dir="auto"
              />
            </Field>
            <Field label={t("password")}>
              <input
                type="password"
                autoComplete={registering ? "new-password" : "current-password"}
                minLength={registering ? 10 : undefined}
                maxLength={registering ? 72 : 200}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            {registering && (
              <>
                <Field label={t("confirmPassword")}>
                  <input
                    type="password"
                    required
                    autoComplete="new-password"
                    minLength={10}
                    maxLength={72}
                    value={confirmation}
                    onChange={(e) => setConfirmation(e.target.value)}
                  />
                </Field>
                <p className="muted small">
                  {t("usernameFormat")} · {t("minPassword")}
                </p>
              </>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <Button variant="primary" disabled={busy} type="submit">
              {t(busy ? "loading" : registering ? "signup" : "signin")}
              <ArrowRightIcon className="directional-icon" />
            </Button>
          </form>
          <Button
            variant="ghost"
            className="auth-switch"
            disabled={busy}
            onClick={() => {
              setRegistering(!registering);
              setError("");
              setPassword("");
              setConfirmation("");
            }}
          >
            {t(registering ? "switchToSignin" : "switchToSignup")}
          </Button>
          <p className="login-security">{t("credentials")}</p>
        </section>
      </main>
      <footer className="login-footer">
        {t("brand")} · {t("tagline")}
      </footer>
    </div>
  );
}
