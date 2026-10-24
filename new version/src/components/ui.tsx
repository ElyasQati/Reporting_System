"use client";
import * as Dialog from "@radix-ui/react-dialog";
import * as Alert from "@radix-ui/react-alert-dialog";
import clsx from "clsx";
import type { ButtonHTMLAttributes } from "react";
import { useI18n } from "./providers";
import { CloseIcon } from "./icons";
export function Button({
  variant = "secondary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return (
    <button
      className={clsx("button", `button-${variant}`, className)}
      {...props}
    />
  );
}
export function IconButton({
  label,
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      className={clsx("icon-button", className)}
      aria-label={label}
      title={label}
      {...props}
    >
      {children}
    </button>
  );
}
export function Modal({
  title,
  description,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const { locale, t } = useI18n();
  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content
          dir={locale === "fa" ? "rtl" : "ltr"}
          className={clsx("modal", wide && "modal-wide")}
          aria-describedby={description ? "modal-description" : undefined}
        >
          <header className="modal-header">
            <div>
              <Dialog.Title>{title}</Dialog.Title>
              {description && (
                <Dialog.Description id="modal-description">
                  {description}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close asChild>
              <IconButton label={t("close")}>
                <CloseIcon />
              </IconButton>
            </Dialog.Close>
          </header>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function Confirm({
  title,
  description,
  onConfirm,
  onClose,
  busy,
}: {
  title: string;
  description: string;
  onConfirm: () => void;
  onClose: () => void;
  busy: boolean;
}) {
  const { t, locale } = useI18n();
  return (
    <Alert.Root open onOpenChange={(open) => !open && !busy && onClose()}>
      <Alert.Portal>
        <Alert.Overlay className="modal-overlay" />
        <Alert.Content
          className="modal confirm-modal"
          dir={locale === "fa" ? "rtl" : "ltr"}
        >
          <Alert.Title>{title}</Alert.Title>
          <Alert.Description>{description}</Alert.Description>
          <div className="form-actions">
            <Button onClick={onClose} disabled={busy}>
              {t("cancel")}
            </Button>
            <Button variant="danger" onClick={onConfirm} disabled={busy}>
              {t(busy ? "saving" : "confirm")}
            </Button>
          </div>
        </Alert.Content>
      </Alert.Portal>
    </Alert.Root>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Empty({
  text,
  action,
}: {
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <p>{text}</p>
      {action}
    </div>
  );
}
export function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "positive" | "warning" | "negative";
}) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}
