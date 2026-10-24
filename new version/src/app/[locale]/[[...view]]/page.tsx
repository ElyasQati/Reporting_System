import { notFound } from "next/navigation";
import { WorkspaceApp } from "@/components/workspace-app";
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; view?: string[] }>;
}) {
  const { locale, view = [] } = await params;
  const page = view.join("/") || "dashboard";
  if (
    ![
      "dashboard",
      "classes",
      "reports",
      "curricula",
      "teachers",
      "supervisors",
      "analytics",
      "archive",
      "settings",
    ].includes(page) ||
    !["fa", "en"].includes(locale)
  )
    notFound();
  return <WorkspaceApp key={locale} view={page} />;
}
