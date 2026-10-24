"use client";
import { useI18n } from "@/components/providers";
export default function ErrorPage({ reset }: { reset: () => void }) {
  const { t } = useI18n();
  return (
    <main className="loading-screen">
      <h1>{t("errorTitle")}</h1>
      <button className="button button-primary" onClick={reset}>
        {t("retry")}
      </button>
    </main>
  );
}
