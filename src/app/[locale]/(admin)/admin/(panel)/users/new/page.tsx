import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/admin/primitives";
import { buttonClasses } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { StaffForm } from "@/features/admin/users/staff-form";
import { requirePermission } from "@/server/auth/rbac";
import { roleOptions } from "@/server/services/admin-staff";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "New user — MALIKA Admin" };

export default async function NewUserPage({ params }: { params: Promise<{ locale: Locale }> }) {
  setRequestLocale((await params).locale);
  await requirePermission("users:create");
  const [t, u, f, roles] = await Promise.all([getTranslations("admin.user"), getTranslations("admin.users"), getTranslations("admin.form"), roleOptions()]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={u("title")}
        title={t("newTitle")}
        description={t("newIntro")}
        actions={
          <Link href="/admin/users" className={buttonClasses("secondary", "min-h-11")}>
            {f("back")}
          </Link>
        }
      />
      <StaffForm user={null} roles={roles} />
    </div>
  );
}
