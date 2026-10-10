import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/admin/primitives";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { CouponsManager } from "@/features/admin/coupons/coupons-manager";
import { Pagination } from "@/features/storefront/shop/pagination";
import { can, requirePermission } from "@/server/auth/rbac";
import { couponUsageCounts, listCouponsAdmin } from "@/server/services/admin-sales";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Coupons — MALIKA Admin" };
const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

export default async function CouponsPage({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  setRequestLocale((await params).locale);
  const admin = await requirePermission("coupons:view");
  const sp = await searchParams;
  const q = one(sp.q).slice(0, 60);
  const page = Math.min(500, Math.max(1, Number.parseInt(one(sp.page), 10) || 1));

  const [t, f, data, counts] = await Promise.all([
    getTranslations("admin.coupons"),
    getTranslations("admin.form"),
    listCouponsAdmin({ q: q || undefined, page }),
    couponUsageCounts(),
  ]);

  const query: Record<string, string> = {};
  if (q) query.q = q;

  return (
    <div className="space-y-8">
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("intro")} />

      <form method="get" role="search" className="flex flex-wrap items-end gap-3">
        <label className="grid min-w-56 flex-1 gap-1.5 text-xs uppercase tracking-[0.18em] text-accent">
          {t("searchLabel")}
          <input type="search" name="q" defaultValue={q} maxLength={60} placeholder={f("searchPlaceholder")} className={`${inputClass} h-11 text-sm normal-case tracking-normal text-foreground`} />
        </label>
        <Button type="submit" className="min-h-11">
          {f("apply")}
        </Button>
        {query.q ? (
          <Link href="/admin/coupons" className="inline-flex min-h-11 items-center px-3 text-sm text-muted underline-offset-4 hover:underline">
            {f("reset")}
          </Link>
        ) : null}
      </form>

      <CouponsManager
        rows={data.rows}
        usage={Object.fromEntries(counts)}
        canCreate={can(admin, "coupons:create")}
        canEdit={can(admin, "coupons:edit")}
        canDelete={can(admin, "coupons:delete")}
      />
      <div className="-mt-8">
        <Pagination page={page} pages={data.pages} pathname="/admin/coupons" query={query} />
      </div>
    </div>
  );
}
