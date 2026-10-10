import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/admin/primitives";
import { requirePermission } from "@/server/auth/rbac";
import { DEFAULT_BRAND, DEFAULT_THEME, getBrandSettings, getThemeSettings } from "@/server/services/settings";
import { BrandCard } from "@/features/admin/theme/brand-card";
import { ThemeEditor } from "@/features/admin/theme/theme-editor";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Theme — MALIKA Admin" };

export default async function ThemePage({ params }: { params: Promise<{ locale: "ar" | "en" }> }) {
  setRequestLocale((await params).locale);
  await requirePermission("theme:view");
  const [t, theme, brand] = await Promise.all([getTranslations("admin.theme"), getThemeSettings(), getBrandSettings().catch(() => DEFAULT_BRAND)]);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("intro")} />
      <BrandCard brand={brand} />
      <ThemeEditor theme={theme} defaults={DEFAULT_THEME} />
    </div>
  );
}
