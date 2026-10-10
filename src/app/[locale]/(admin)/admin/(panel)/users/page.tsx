import { Users } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/admin/primitives";
import { buttonClasses } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { UsersManager } from "@/features/admin/users/users-manager";
import { can, requirePermission } from "@/server/auth/rbac";
import { listStaffAdmin } from "@/server/services/admin-staff";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Users — MALIKA Admin" };

export default async function UsersPage({ params }: { params: Promise<{ locale: Locale }> }) {
  setRequestLocale((await params).locale);
  const admin = await requirePermission("users:view");
  const [t, rows] = await Promise.all([getTranslations("admin.users"), listStaffAdmin()]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("intro")}
        actions={
          can(admin, "users:create") ? (
            <Link href="/admin/users/new" className={buttonClasses()}>
              {t("new")}
            </Link>
          ) : undefined
        }
      />
      <UsersManager
        rows={rows.map(({ u, roleKey, roleNameEn, roleNameAr }) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          active: u.active,
          lastLoginAt: u.lastLoginAt,
          roleKey,
          roleNameEn,
          roleNameAr,
        }))}
        canCreate={can(admin, "users:create")}
        canEdit={can(admin, "users:edit")}
        canDelete={can(admin, "users:delete")}
        emptyIcon={<Users size={30} strokeWidth={1.2} />}
      />
    </div>
  );
}
