import { Megaphone } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/admin/primitives";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { SubscribersManager } from "@/features/admin/marketing/subscribers-manager";
import { Pagination } from "@/features/storefront/shop/pagination";
import { can, requirePermission } from "@/server/auth/rbac";
import { listSubscribers } from "@/server/services/admin-content";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Marketing — MALIKA Admin" };
const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

export default async function MarketingPage({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  setRequestLocale((await params).locale);
  const admin = await requirePermission("marketing:view");
  const sp = await searchParams;
  const q = one(sp.q).slice(0, 120);
  const page = Math.min(500, Math.max(1, Number.parseInt(one(sp.page), 10) || 1));

  const [t, f, data] = await Promise.all([getTranslations("admin.marketing"), getTranslations("admin.form"), listSubscribers({ q: q || undefined, page })]);

  const query: Record<string, string> = {};
  if (q) query.q = q;

  return (
    <div className="space-y-8">
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("intro")} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="border border-line bg-surface p-5">
          <p className="text-[0.72rem] uppercase tracking-[0.2em] text-accent">{t("statsTitle")}</p>
          <p className="mt-2 font-display text-3xl text-foreground">{data.total}</p>
        </div>
        <div className="border border-line bg-surface p-5 lg:col-span-2">
          <p className="text-[0.72rem] uppercase tracking-[0.2em] text-accent">{t("noteTitle")}</p>
          <p className="mt-2 max-w-3xl text-sm text-muted">{t("noteBody")}</p>
        </div>
      </div>

      <form method="get" role="search" className="flex flex-wrap items-end gap-3">
        <label className="grid min-w-56 flex-1 gap-1.5 text-xs uppercase tracking-[0.18em] text-accent">
          {t("searchLabel")}
          <input type="search" name="q" defaultValue={q} maxLength={120} placeholder={f("searchPlaceholder")} className={`${inputClass} h-11 text-sm normal-case tracking-normal text-foreground`} />
        </label>
        <Button type="submit" className="min-h-11">
          {f("apply")}
        </Button>
        {query.q ? (
          <Link href="/admin/marketing" className="inline-flex min-h-11 items-center px-3 text-sm text-muted underline-offset-4 hover:underline">
            {f("reset")}
          </Link>
        ) : null}
      </form>

      <SubscribersManager rows={data.rows} canDelete={can(admin, "marketing:edit")} emptyIcon={<Megaphone size={30} strokeWidth={1.2} />} />
      <div className="-mt-8">
        <Pagination page={page} pages={data.pages} pathname="/admin/marketing" query={query} />
      </div>
    </div>
  );
}
