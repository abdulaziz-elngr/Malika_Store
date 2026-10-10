import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { Badge, PageHeader } from "@/components/admin/primitives";
import { inputClass } from "@/components/ui/field";
import { OrderStatusBadge } from "@/features/admin/dashboard/status-badge";
import { OrderControls } from "@/features/admin/orders/order-controls";
import { OrderView } from "@/features/admin/orders/order-view";
import { PAYMENT_TONE } from "@/features/admin/orders/tones";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatDate } from "@/lib/format";
import type { Loc } from "@/lib/localize";
import { can, requirePermission } from "@/server/auth/rbac";
import { ORDER_TRANSITIONS, getOrderAdmin } from "@/server/services/admin-sales";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Order — MALIKA Admin" };

export default async function OrderDetailPage({ params }: { params: Promise<{ locale: Locale; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const admin = await requirePermission("orders:view");
  const [order, t, o, pt, loc] = await Promise.all([
    getOrderAdmin(id),
    getTranslations("admin.order"),
    getTranslations("orders"),
    getTranslations("orders.payment"),
    getLocale() as Promise<Loc>,
  ]);
  if (!order) notFound();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={t("eyebrow")}
        title={`MLK-${order.seq}`}
        description={o("placedOn", { date: formatDate(order.createdAt, loc, true) })}
        actions={
          <Link href="/admin/orders" className={`${inputClass} inline-flex h-11 w-auto items-center px-4 text-sm`}>
            {t("backToList")}
          </Link>
        }
      />

      <div className="-mt-6 flex flex-wrap items-center gap-2">
        <OrderStatusBadge status={order.status} />
        <Badge tone={PAYMENT_TONE[order.paymentStatus] ?? "neutral"}>{pt(order.paymentStatus)}</Badge>
      </div>

      <OrderControls
        order={{ id: order.id, status: order.status, paymentStatus: order.paymentStatus, internalNote: order.internalNote }}
        transitions={ORDER_TRANSITIONS}
        canEdit={can(admin, "orders:edit")}
      />

      <OrderView order={order} />
    </div>
  );
}
