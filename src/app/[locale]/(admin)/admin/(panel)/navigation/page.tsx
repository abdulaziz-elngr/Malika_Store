import { Link2 } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/admin/primitives";
import type { Locale } from "@/i18n/routing";
import { NavigationManager } from "@/features/admin/navigation/navigation-manager";
import { can, requirePermission } from "@/server/auth/rbac";
import { listNavItems } from "@/server/services/admin-content";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Navigation — MALIKA Admin" };

export default async function NavigationPage({ params }: { params: Promise<{ locale: Locale }> }) {
  setRequestLocale((await params).locale);
  const admin = await requirePermission("navigation:view");
  const [t, header, footer] = await Promise.all([
    getTranslations("admin.navigation"),
    listNavItems("header"),
    listNavItems("footer"),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("intro")} />
      <NavigationManager
        rows={{ header, footer }}
        canCreate={can(admin, "navigation:create")}
        canEdit={can(admin, "navigation:edit")}
        canDelete={can(admin, "navigation:delete")}
        emptyIcon={<Link2 size={30} strokeWidth={1.2} />}
      />
    </div>
  );
}
