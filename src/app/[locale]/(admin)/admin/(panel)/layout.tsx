import { getLocale, setRequestLocale } from "next-intl/server";
import { AdminShell } from "@/features/admin/shell/admin-shell";
import { visibleNav } from "@/features/admin/nav";
import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { PermissionKey } from "@/lib/permissions";
import { getAdmin } from "@/server/auth/admin-session";
import { can } from "@/server/auth/rbac";
import { pick, type Loc } from "@/lib/localize";

export const dynamic = "force-dynamic";

/**
 * Everything under /admin except sign-in and the 403 page. The staff member is resolved once here;
 * each page still calls requirePermission() itself, because a layout is not a security boundary.
 */
export default async function PanelLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const [admin, loc] = await Promise.all([getAdmin(), getLocale() as Promise<Loc>]);
  if (!admin) redirect({ href: "/admin/login", locale });
  const groups = visibleNav((r) => can(admin, `${r}:view` as PermissionKey));
  return (
    <AdminShell user={{ name: admin!.name, email: admin!.email, roleName: pick(loc, admin!.role.nameAr, admin!.role.nameEn) }} groups={groups}>
      {children}
    </AdminShell>
  );
}
