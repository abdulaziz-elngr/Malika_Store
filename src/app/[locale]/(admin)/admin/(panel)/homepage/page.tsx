import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/admin/primitives";
import type { Locale } from "@/i18n/routing";
import { HomepageManager } from "@/features/admin/homepage/homepage-manager";
import { can, requirePermission } from "@/server/auth/rbac";
import { listHomepageSections, syncHomepageSections } from "@/server/services/admin-content";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Homepage — MALIKA Admin" };

export default async function HomepagePage({ params }: { params: Promise<{ locale: Locale }> }) {
  setRequestLocale((await params).locale);
  const admin = await requirePermission("homepage:view");
  // Idempotent: makes sure all known sections exist before the builder lists them.
  await syncHomepageSections();
  const [t, rows] = await Promise.all([getTranslations("admin.homepage"), listHomepageSections()]);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("intro")} />
      <HomepageManager
        rows={rows.map((r) => ({ id: r.id, key: r.key, enabled: r.enabled, sortOrder: r.sortOrder, config: (r.config ?? {}) as Record<string, unknown> }))}
        canEdit={can(admin, "homepage:edit")}
      />
    </div>
  );
}
