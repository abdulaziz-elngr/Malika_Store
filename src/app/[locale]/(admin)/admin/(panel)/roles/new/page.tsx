import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/admin/primitives";
import { buttonClasses } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { RoleForm } from "@/features/admin/roles/role-form";
import { requirePermission } from "@/server/auth/rbac";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "New role — MALIKA Admin" };

export default async function NewRolePage({ params }: { params: Promise<{ locale: Locale }> }) {
  setRequestLocale((await params).locale);
  await requirePermission("roles:create");
  const [t, r, f] = await Promise.all([getTranslations("admin.role"), getTranslations("admin.roles"), getTranslations("admin.form")]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={r("title")}
        title={t("newTitle")}
        description={t("newIntro")}
        actions={
          <Link href="/admin/roles" className={buttonClasses("secondary", "min-h-11")}>
            {f("back")}
          </Link>
        }
      />
      <RoleForm role={null} permissionKeys={[]} />
    </div>
  );
}
