import { LayoutDashboard } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { Card, CardHeader, EmptyState, PageHeader } from "@/components/admin/primitives";
import { SeriesChart } from "@/features/admin/dashboard/series-chart";
import { AttentionStrip, LowStock, RecentCustomers, RecentOrders, TopCategories, TopProducts } from "@/features/admin/dashboard/panels";
import { RangeFilter } from "@/features/admin/dashboard/range-filter";
import { StatCard } from "@/features/admin/dashboard/stat-card";
import type { Locale } from "@/i18n/routing";
import { resolveRange } from "@/lib/date-range";
import { formatMoney, pick, type Loc } from "@/lib/localize";
import { requirePermission } from "@/server/auth/rbac";
import { getDashboard } from "@/server/services/analytics";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Dashboard — MALIKA Admin" };

const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

export default async function DashboardPage({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  setRequestLocale((await params).locale);
  const admin = await requirePermission("dashboard:view");
  const sp = await searchParams;
  const range = resolveRange(one(sp.range), { from: one(sp.from), to: one(sp.to) });
  const [t, loc, d] = await Promise.all([getTranslations("admin.dashboard"), getLocale() as Promise<Loc>, getDashboard(admin, range)]);
  const nf = new Intl.NumberFormat(loc === "ar" ? "ar-EG" : "en-GB");
  const pct = new Intl.NumberFormat(loc === "ar" ? "ar-EG" : "en-GB", { maximumFractionDigits: 2 });
  const s = d.sales;
  const series = d.series;
  const nothing = !s && !d.customers && !d.stock && !d.catalog;
  const chartSub = d.range.step === 7 ? t("charts.perWeek") : t("charts.perDay");

  return (
    <div className="space-y-8">
      <PageHeader eyebrow={pick(loc, admin.role.nameAr, admin.role.nameEn)} title={t("greeting", { name: admin.name })} description={t("subtitle")} />
      {nothing ? (
        <Card><EmptyState icon={<LayoutDashboard size={32} strokeWidth={1.2} />} title={t("limited.title")} body={t("limited.body")} /></Card>
      ) : (
        <>
          {s && <RangeFilter active={range.key} fromDay={range.fromDay} toDay={range.toDay} />}
          {(d.attention || d.stock) && <AttentionStrip attention={d.attention} stock={d.stock} />}

          <section aria-label={t("stats.revenue")} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {s && <>
              <StatCard label={t("stats.revenue")} value={formatMoney(s.revenue, loc)} hint={t("stats.revenueHint")} delta={s.delta.revenue} />
              <StatCard label={t("stats.orders")} value={nf.format(s.validOrders)} hint={t("stats.ordersHint", { count: nf.format(s.lost) })} delta={s.delta.orders} />
              <StatCard label={t("stats.aov")} value={formatMoney(s.aov, loc)} hint={t("stats.aovHint")} delta={s.delta.aov} />
              <StatCard label={t("stats.conversion")} value={s.conversion == null ? "—" : `${pct.format(s.conversion)}%`} hint={s.visitors ? t("stats.conversionHint", { visitors: nf.format(s.visitors) }) : t("stats.conversionNone")} />
            </>}
            {d.customers && <StatCard label={t("stats.customers")} value={nf.format(d.customers.newInRange)} hint={t("stats.customersHint", { total: nf.format(d.customers.total) })} delta={d.customers.newDelta} />}
            {d.catalog && <StatCard label={t("stats.products")} value={nf.format(d.catalog.published)} hint={t("stats.productsHint", { draft: nf.format(d.catalog.draft), archived: nf.format(d.catalog.archived) })} />}
          </section>

          {s && series && (
            <section className="grid gap-4 lg:grid-cols-2">
              {([["orders", "bar", "int"], ["revenue", "area", "money"]] as const).map(([k, kind, format]) => (
                <Card key={k} aria-labelledby={`ch-${k}`}>
                  <CardHeader id={`ch-${k}`} title={t(`charts.${k}`)} action={<span className="text-xs text-muted">{chartSub}</span>} />
                  <div className="p-5">
                    {s.validOrders === 0 ? <EmptyState title={t("charts.empty")} /> : <SeriesChart title={t(`charts.${k}`)} kind={kind} format={format} step={d.range.step} points={series.map((p) => ({ day: p.day, value: k === "orders" ? p.orders : p.revenue }))} />}
                  </div>
                </Card>
              ))}
            </section>
          )}

          {(d.topProducts || d.topCategories) && <section className="grid gap-4 lg:grid-cols-2">{d.topProducts && <TopProducts rows={d.topProducts} />}{d.topCategories && <TopCategories rows={d.topCategories} />}</section>}
          {(d.recentOrders || d.customers) && (
            <section className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
              {d.recentOrders && <RecentOrders rows={d.recentOrders} />}
              {d.customers && <RecentCustomers rows={d.customers.recent} />}
            </section>
          )}
          {d.stock && <LowStock stock={d.stock} />}
        </>
      )}
    </div>
  );
}
