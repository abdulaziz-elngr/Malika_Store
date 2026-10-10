import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/admin/primitives";
import { buttonClasses } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { ResetPasswordCard } from "@/features/admin/users/reset-password-card";
import { StaffForm } from "@/features/admin/users/staff-form";
import { requirePermission } from "@/server/auth/rbac";
import { getStaffAdmin, roleOptions } from "@/server/services/admin-staff";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Edit user — MALIKA Admin" };

export default async function EditUserPage({ params }: { params: Promise<{ locale: Locale; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requirePermission("users:edit");
  const [user, roles, u, f] = await Promise.all([getStaffAdmin(id), roleOptions(), getTranslations("admin.users"), getTranslations("admin.form")]);
  if (!user) notFound();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={u("title")}
        title={user.name}
        actions={
          <Link href="/admin/users" className={buttonClasses("secondary", "min-h-11")}>
            {f("back")}
          </Link>
        }
      />
      <StaffForm user={{ id: user.id, name: user.name, email: user.email, active: user.active, roleKey: user.role.key }} roles={roles} />
      <ResetPasswordCard userId={user.id} />
    </div>
  );
}
