import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminTopBar } from "@/features/admin/admin-chrome";
import { AdminLoginForm } from "@/features/admin/admin-login-form";
import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getAdmin } from "@/server/auth/admin-session";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (await getAdmin()) redirect({ href: "/admin", locale });
  const t = await getTranslations("admin.login");
  return (
    <main id="main">
      <AdminTopBar />
      <div className="mx-auto grid max-w-md gap-8 px-6 py-20">
        <div className="space-y-3 text-center">
          <p className="text-[0.72rem] uppercase tracking-[0.3em] text-accent">{t("eyebrow")}</p>
          <h1 className="font-display text-5xl text-brand">{t("title")}</h1>
          <p className="text-muted">{t("intro")}</p>
        </div>
        <AdminLoginForm />
        <p className="text-center text-xs text-muted">{t("note")}</p>
      </div>
    </main>
  );
}
