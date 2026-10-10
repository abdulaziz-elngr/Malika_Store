import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/admin/primitives";
import { SeoForm } from "@/features/admin/seo/seo-form";
import { requirePermission } from "@/server/auth/rbac";
import { getSeoSettings } from "@/server/services/settings";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "SEO — MALIKA Admin" };

export default async function SeoPage({ params }: { params: Promise<{ locale: "ar" | "en" }> }) {
  setRequestLocale((await params).locale);
  await requirePermission("seo:view");
  const [t, seo] = await Promise.all([getTranslations("admin.seo"), getSeoSettings()]);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("intro")} />
      <SeoForm seo={seo} />
    </div>
  );
}
