import { Tags } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/admin/primitives";
import { CategoriesManager } from "@/features/admin/catalog/categories-manager";
import type { Locale } from "@/i18n/routing";
import { can, requirePermission } from "@/server/auth/rbac";
import { listCategoriesAdmin } from "@/server/services/admin-catalog";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Categories — MALIKA Admin" };

export default async function CategoriesPage({ params }: { params: Promise<{ locale: Locale }> }) {
  setRequestLocale((await params).locale);
  const admin = await requirePermission("categories:view");
  const [t, rows] = await Promise.all([getTranslations("admin.categories"), listCategoriesAdmin()]);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("intro")} />
      <CategoriesManager
        rows={rows.map((r) => ({ ...r.c, productCount: r.productCount }))}
        canCreate={can(admin, "categories:create")}
        canEdit={can(admin, "categories:edit")}
        canDelete={can(admin, "categories:delete")}
        emptyIcon={<Tags size={30} strokeWidth={1.2} />}
      />
    </div>
  );
}
