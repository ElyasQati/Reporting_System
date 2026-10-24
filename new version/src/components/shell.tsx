"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import type { MessageKey } from "@/lib/i18n";
import { useI18n } from "./providers";
import { IconButton } from "./ui";
import {
  ActivityIcon,
  BookIcon,
  CalendarIcon,
  CloseIcon,
  FolderIcon,
  HomeIcon,
  LogoutIcon,
  MenuIcon,
  MoonIcon,
  SettingsIcon,
  SunIcon,
  UserIcon,
  UsersIcon,
} from "./icons";
const navigation = [
  { path: "dashboard", key: "dashboard", Icon: HomeIcon },
  { path: "classes", key: "classes", Icon: BookIcon },
  { path: "reports", key: "reports", Icon: CalendarIcon },
  { path: "curricula", key: "curricula", Icon: FolderIcon },
  { path: "teachers", key: "teachers", Icon: UserIcon },
  { path: "supervisors", key: "supervisors", Icon: UsersIcon },
  { path: "analytics", key: "analytics", Icon: ActivityIcon },
] as const;
export function Logo() {
  const { t } = useI18n();
  return (
    <div className="brand">
      <BookIcon className="brand-mark" />
      <div>
        <strong>{t("brand")}</strong>
        <span>{t("tagline")}</span>
      </div>
    </div>
  );
}
export function Appearance({ view = "" }: { view?: string }) {
  const { locale, t } = useI18n();
  const { setTheme, resolvedTheme } = useTheme();
  return (
    <div className="appearance">
      <a
        className="language-button"
        href={`/${locale === "fa" ? "en" : "fa"}${view && view !== "dashboard" ? `/${view}` : ""}`}
        aria-label={t("language")}
      >
        {locale === "fa" ? "English" : "فارسی"}
      </a>
      <IconButton
        label={t("dark")}
        className="theme-dark"
        onClick={() => setTheme("dark")}
      >
        <MoonIcon />
      </IconButton>
      <IconButton
        label={t("light")}
        className="theme-light"
        onClick={() => setTheme("light")}
      >
        <SunIcon />
      </IconButton>
      <span className="sr-only">{resolvedTheme}</span>
    </div>
  );
}
export function Shell({
  view,
  name,
  organization,
  onLogout,
  children,
}: {
  view: string;
  name: string;
  organization: string;
  onLogout: () => void;
  children: React.ReactNode;
}) {
  const { locale, t } = useI18n();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document
      .querySelector<HTMLElement>("#workspace-navigation button")
      ?.focus();
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [open]);
  const link = (path: string, key: MessageKey, Icon: typeof HomeIcon) => (
    <Link
      onClick={() => setOpen(false)}
      key={path}
      href={`/${locale}${path === "dashboard" ? "" : `/${path}`}`}
      className={`nav-link ${view === path ? "is-active" : ""}`}
      aria-current={view === path ? "page" : undefined}
    >
      <Icon />
      <span>{t(key)}</span>
    </Link>
  );
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        {locale === "fa" ? "پرش به محتوا" : "Skip to content"}
      </a>
      {open && (
        <button
          className="sidebar-scrim"
          aria-label={t("close")}
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        id="workspace-navigation"
        className={`sidebar ${open ? "sidebar-open" : ""}`}
        onKeyDown={(event) => {
          if (!open) return;
          if (event.key === "Escape") {
            setOpen(false);
            return;
          }
          if (event.key === "Tab") {
            const focusable = [
              ...event.currentTarget.querySelectorAll<HTMLElement>(
                "a[href],button:not([disabled])",
              ),
            ];
            const first = focusable[0],
              last = focusable.at(-1);
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last?.focus();
            }
            if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <div className="sidebar-top">
          <Logo />
          <IconButton
            label={t("close")}
            className="mobile-only"
            onClick={() => setOpen(false)}
          >
            <CloseIcon />
          </IconButton>
        </div>
        <div className="workspace-label">
          <span className="workspace-dot" />
          <span>{organization}</span>
        </div>
        <nav aria-label={t("management")}>
          <span className="nav-group-label">{t("management")}</span>
          {navigation.map((n) => link(n.path, n.key, n.Icon))}
          <span className="nav-group-label nav-group-bottom">
            {t("preferences")}
          </span>
          {link("archive", "archive", FolderIcon)}
          {link("settings", "settings", SettingsIcon)}
        </nav>
        <div className="sidebar-footer">
          <span className="avatar">{name.slice(0, 1)}</span>
          <div>
            <strong>{name}</strong>
            <small>{t("credentials")}</small>
          </div>
          <IconButton label={t("logout")} onClick={onLogout}>
            <LogoutIcon />
          </IconButton>
        </div>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <div className="topbar-start">
            <IconButton
              label={t("workspace")}
              className="mobile-only"
              aria-expanded={open}
              aria-controls="workspace-navigation"
              onClick={() => setOpen(true)}
            >
              <MenuIcon />
            </IconButton>
            <span>{t("workspace")}</span>
            <span className="breadcrumb-slash">/</span>
            <span className="breadcrumb-current">{t(view as MessageKey)}</span>
          </div>
          <Appearance view={view} />
        </header>
        <main className="workspace-sheet" id="main-content">
          {children}
        </main>
        <footer className="page-footer">
          <span>
            {t("brand")} · {t("tagline")}
          </span>
          <span>Asia/Kabul</span>
        </footer>
      </div>
    </div>
  );
}
