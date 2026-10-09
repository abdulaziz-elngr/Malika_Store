import { getTranslations, setRequestLocale } from "next-intl/server";
import { buttonClasses } from "@/components/ui/button";
import { AdminTopBar } from "@/features/admin/admin-chrome";
import { Link, redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getAdmin } from "@/server/auth/admin-session";

export const dynamic = "force-dynamic";

export default async function ForbiddenPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!(await getAdmin())) redirect({ href: "/admin/login", locale });
  const t = await getTranslations("admin.forbidden");
  return (
    <main id="main">
      <AdminTopBar />
      <div className="mx-auto grid max-w-md justify-items-center gap-5 px-6 py-24 text-center">
        <p className="font-display text-7xl text-accent">403</p>
        <h1 className="font-display text-4xl text-brand">{t("title")}</h1>
        <p className="text-muted">{t("body")}</p>
        <Link href="/admin" className={buttonClasses("secondary")}>{t("back")}</Link>
      </div>
    </main>
  );
}
