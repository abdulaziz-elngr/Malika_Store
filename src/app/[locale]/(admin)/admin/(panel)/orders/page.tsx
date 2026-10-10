import { ClipboardList } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/admin/primitives";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { OrdersManager } from "@/features/admin/orders/orders-manager";
import { PAYMENT_STATUSES, type PaymentStatus } from "@/features/admin/orders/tones";
import { Pagination } from "@/features/storefront/shop/pagination";
import type { OrderStatus } from "@/db/schema";
import { can, requirePermission } from "@/server/auth/rbac";
import { ORDER_TRANSITIONS, listOrdersAdmin } from "@/server/services/admin-sales";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Orders — MALIKA Admin" };
const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");
const ORDER_STATUSES = Object.keys(ORDER_TRANSITIONS) as OrderStatus[];

export default async function OrdersPage({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  setRequestLocale((await params).locale);
  const admin = await requirePermission("orders:view");
  const sp = await searchParams;
  const q = one(sp.q).slice(0, 80);
  const status = ORDER_STATUSES.includes(one(sp.status) as OrderStatus) ? one(sp.status) : "";
  const payment = PAYMENT_STATUSES.includes(one(sp.payment) as PaymentStatus) ? one(sp.payment) : "";
  const page = Math.min(500, Math.max(1, Number.parseInt(one(sp.page), 10) || 1));

  const [t, f, st, pt, data] = await Promise.all([
    getTranslations("admin.orders"),
    getTranslations("admin.form"),
    getTranslations("orders.status"),
    getTranslations("orders.payment"),
    listOrdersAdmin({ q: q || undefined, status: status || undefined, payment: payment || undefined, page }),
  ]);

  const query: Record<string, string> = {};
  if (q) query.q = q;
  if (status) query.status = status;
  if (payment) query.payment = payment;

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
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {st(s)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-xs uppercase tracking-[0.18em] text-accent">
          {t("cols.payment")}
          <select name="payment" defaultValue={payment} className={`${inputClass} h-11 min-w-44 text-sm normal-case tracking-normal text-foreground`}>
            <option value="">{t("allPayments")}</option>
            {PAYMENT_STATUSES.map((p) => (
              <option key={p} value={p}>
                {pt(p)}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" className="min-h-11">
          {f("apply")}
        </Button>
        {query.q || query.status || query.payment ? (
          <Link href="/admin/orders" className="inline-flex min-h-11 items-center px-3 text-sm text-muted underline-offset-4 hover:underline">
            {f("reset")}
          </Link>
        ) : null}
      </form>

      <OrdersManager
        rows={data.rows.map((r) => ({
          id: r.o.id,
          seq: r.o.seq,
          name: r.o.name,
          email: r.o.email,
          status: r.o.status,
          paymentStatus: r.o.paymentStatus,
          totalMinor: r.o.totalMinor,
          createdAt: r.o.createdAt,
          itemCount: r.itemCount,
        }))}
        transitions={ORDER_TRANSITIONS}
        canEdit={can(admin, "orders:edit")}
        emptyIcon={<ClipboardList size={30} strokeWidth={1.2} />}
      />
      <div className="-mt-8">
        <Pagination page={page} pages={data.pages} pathname="/admin/orders" query={query} />
      </div>
    </div>
  );
}
