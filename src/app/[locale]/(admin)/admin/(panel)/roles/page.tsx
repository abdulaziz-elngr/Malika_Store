import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/admin/primitives";
import { buttonClasses } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { RolesManager } from "@/features/admin/roles/roles-manager";
import { can, requirePermission } from "@/server/auth/rbac";
import { listRolesAdmin } from "@/server/services/admin-staff";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Roles — MALIKA Admin" };

export default async function RolesPage({ params }: { params: Promise<{ locale: Locale }> }) {
  setRequestLocale((await params).locale);
  const admin = await requirePermission("roles:view");
  const [t, rows] = await Promise.all([getTranslations("admin.roles"), listRolesAdmin()]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("intro")}
        actions={
          can(admin, "roles:create") ? (
            <Link href="/admin/roles/new" className={buttonClasses()}>
              {t("new")}
            </Link>
          ) : undefined
        }
      />
      <RolesManager
        rows={rows.map(({ r, permCount, userCount }) => ({ id: r.id, key: r.key, nameAr: r.nameAr, nameEn: r.nameEn, isSystem: r.isSystem, permCount, userCount }))}
        canCreate={can(admin, "roles:create")}
        canEdit={can(admin, "roles:edit")}
        canDelete={can(admin, "roles:delete")}
        emptyIcon={<ShieldCheck size={30} strokeWidth={1.2} />}
      />
    </div>
  );
}
