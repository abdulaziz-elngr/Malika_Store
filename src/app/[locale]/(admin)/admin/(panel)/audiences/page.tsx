import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/admin/primitives";
import { AudiencesManager } from "@/features/admin/audiences/audiences-manager";
import type { Locale } from "@/i18n/routing";
import { can, requirePermission } from "@/server/auth/rbac";
import { listAudiencesAdmin } from "@/server/services/admin-audiences";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Audiences — MALIKA Admin" };

export default async function AudiencesPage({ params }: { params: Promise<{ locale: Locale }> }) {
  setRequestLocale((await params).locale);
  const admin = await requirePermission("categories:view");
  const [t, rows] = await Promise.all([getTranslations("admin.audiences"), listAudiencesAdmin()]);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("intro")} />
      <AudiencesManager
        rows={rows.map((r) => ({ id: r.a.id, slug: r.a.slug, nameAr: r.a.nameAr, nameEn: r.a.nameEn, includeUnisex: r.a.includeUnisex, visible: r.a.visible, sortOrder: r.a.sortOrder, productCount: r.productCount }))}
        canCreate={can(admin, "categories:create")}
        canEdit={can(admin, "categories:edit")}
        canDelete={can(admin, "categories:delete")}
      />
    </div>
  );
}
