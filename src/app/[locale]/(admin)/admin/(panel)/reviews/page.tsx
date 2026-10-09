import { Star } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/admin/primitives";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { ReviewsManager } from "@/features/admin/reviews/reviews-manager";
import { Pagination } from "@/features/storefront/shop/pagination";
import { can, requirePermission } from "@/server/auth/rbac";
import { listReviewsAdmin } from "@/server/services/admin-sales";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Reviews — MALIKA Admin" };
const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");
const STATUSES = ["pending", "approved", "rejected"] as const;
const RATINGS = ["1", "2", "3", "4", "5"] as const;

export default async function ReviewsPage({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  setRequestLocale((await params).locale);
  const admin = await requirePermission("reviews:view");
  const sp = await searchParams;
  const q = one(sp.q).slice(0, 80);
  const status = STATUSES.includes(one(sp.status) as (typeof STATUSES)[number]) ? one(sp.status) : "";
  const rating = RATINGS.includes(one(sp.rating) as (typeof RATINGS)[number]) ? one(sp.rating) : "";
  const page = Math.min(500, Math.max(1, Number.parseInt(one(sp.page), 10) || 1));

  const [t, f, data] = await Promise.all([
    getTranslations("admin.reviews"),
    getTranslations("admin.form"),
    listReviewsAdmin({ q: q || undefined, status: status || undefined, rating: rating || undefined, page }),
  ]);

  const query: Record<string, string> = {};
  if (q) query.q = q;
  if (status) query.status = status;
  if (rating) query.rating = rating;

  return (
    <div className="space-y-8">
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("intro")} />

      <form method="get" role="search" className="flex flex-wrap items-end gap-3">
        <label className="grid min-w-56 flex-1 gap-1.5 text-xs uppercase tracking-[0.18em] text-accent">
          {t("searchLabel")}
          <input type="search" name="q" defaultValue={q} maxLength={80} placeholder={f("searchPlaceholder")} className={`${inputClass} h-11 text-sm normal-case tracking-normal text-foreground`} />
        </label>
        <label className="grid gap-1.5 text-xs uppercase tracking-[0.18em] text-accent">
          {f("status")}
          <select name="status" defaultValue={status} className={`${inputClass} h-11 min-w-44 text-sm normal-case tracking-normal text-foreground`}>
            <option value="">{t("allStatuses")}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`statuses.${s}` as "statuses.pending")}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-xs uppercase tracking-[0.18em] text-accent">
          {t("cols.rating")}
          <select name="rating" defaultValue={rating} className={`${inputClass} h-11 min-w-40 text-sm normal-case tracking-normal text-foreground`}>
            <option value="">{t("allRatings")}</option>
            {RATINGS.map((r) => (
              <option key={r} value={r}>
                {t("stars", { count: Number(r) })}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" className="min-h-11">
          {f("apply")}
        </Button>
        {query.q || query.status || query.rating ? (
          <Link href="/admin/reviews" className="inline-flex min-h-11 items-center px-3 text-sm text-muted underline-offset-4 hover:underline">
            {f("reset")}
          </Link>
        ) : null}
      </form>

      <ReviewsManager
        rows={data.rows.map((r) => ({
          id: r.r.id,
          name: r.r.name,
          email: r.r.email,
          rating: r.r.rating,
          body: r.r.body,
          status: r.r.status,
          featured: r.r.featured,
          createdAt: r.r.createdAt,
          productNameAr: r.productNameAr,
          productNameEn: r.productNameEn,
          customerEmail: r.customerEmail,
        }))}
        canEdit={can(admin, "reviews:edit")}
        emptyIcon={<Star size={30} strokeWidth={1.2} />}
      />
      <div className="-mt-8">
        <Pagination page={page} pages={data.pages} pathname="/admin/reviews" query={query} />
      </div>
    </div>
  );
}
