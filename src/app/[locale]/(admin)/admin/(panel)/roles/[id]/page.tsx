import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/admin/primitives";
import { buttonClasses } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { RoleForm } from "@/features/admin/roles/role-form";
import { requirePermission } from "@/server/auth/rbac";
import { getRoleAdmin } from "@/server/services/admin-staff";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Edit role — MALIKA Admin" };

export default async function EditRolePage({ params }: { params: Promise<{ locale: Locale; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requirePermission("roles:edit");
  const [data, t, r, f] = await Promise.all([getRoleAdmin(id), getTranslations("admin.role"), getTranslations("admin.roles"), getTranslations("admin.form")]);
  if (!data) notFound();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={r("title")}
        title={data.role.nameEn}
        description={t("editIntro")}
        actions={
          <Link href="/admin/roles" className={buttonClasses("secondary", "min-h-11")}>
            {f("back")}
          </Link>
        }
      />
      <RoleForm
        role={{ id: data.role.id, key: data.role.key, nameAr: data.role.nameAr, nameEn: data.role.nameEn, isSystem: data.role.isSystem }}
        permissionKeys={data.permissionKeys}
      />
    </div>
  );
}
