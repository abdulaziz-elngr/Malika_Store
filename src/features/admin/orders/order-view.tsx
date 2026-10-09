import { Package } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Card, CardHeader, TableWrap, Td, Th } from "@/components/admin/primitives";
import { OrderStatusBadge } from "@/features/admin/dashboard/status-badge";
import { formatDate } from "@/lib/format";
import { formatMoney, pick, type Loc } from "@/lib/localize";
import type { OrderAdmin } from "@/server/services/admin-sales";

/** IDs we can label from the storefront checkout namespaces; anything else falls back to the raw id. */
const DELIVERY_IDS = new Set(["standard", "express"]);
const PAYMENT_IDS = new Set(["cod", "card", "wallet"]);

/** Read-only order body: customer & address, items, totals, details and the status trail. */
export async function OrderView({ order }: { order: OrderAdmin }) {
  const [t, o, co, loc] = await Promise.all([
    getTranslations("admin.order"),
    getTranslations("orders"),
    getTranslations("checkout"),
    getLocale() as Promise<Loc>,
  ]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title={t("customer")} />
          <div className="space-y-4 p-5 text-sm">
            <div className="space-y-1">
              <p className="text-base font-medium">{order.name}</p>
              <p dir="ltr" className="text-start break-all text-muted">
                {order.email}
              </p>
              <p dir="ltr" className="text-start text-muted">
                {order.phone}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-[0.72rem] uppercase tracking-[0.18em] text-accent">{t("address")}</p>
              <p className="text-muted">{order.line1}</p>
              {order.line2 ? <p className="text-muted">{order.line2}</p> : null}
              <p className="text-muted">
                {order.city} · {order.governorate}
              </p>
            </div>
            {!order.customer ? <p className="text-xs text-muted">{t("guest")}</p> : null}
            {order.notes ? (
              <div className="space-y-1 border-t border-line pt-4">
                <p className="text-[0.72rem] uppercase tracking-[0.18em] text-accent">{t("customerNote")}</p>
                <p className="whitespace-pre-wrap text-muted">{order.notes}</p>
              </div>
            ) : null}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title={o("items")} />
          <TableWrap>
            <thead>
              <tr className="border-b border-line">
                <Th>{t("colProduct")}</Th>
                <Th>{t("colVariant")}</Th>
                <Th className="text-end">{t("colQty")}</Th>
                <Th className="text-end">{t("colTotal")}</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {order.items.map((it) => (
                <tr key={it.id}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <span className="grid size-11 shrink-0 place-items-center overflow-hidden border border-line bg-brand/5 text-muted" aria-hidden>
                        {it.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element -- admin thumbnails accept arbitrary stored URLs
                          <img src={it.imageUrl} alt="" className="size-full object-cover" />
                        ) : (
                          <Package size={16} strokeWidth={1.4} />
                        )}
                      </span>
                      <span>
                        <p className="font-medium">{pick(loc, it.nameAr, it.nameEn)}</p>
                        <p className="text-xs text-muted" dir="ltr">
                          {it.sku}
                        </p>
                      </span>
                    </div>
                  </Td>
                  <Td className="whitespace-nowrap text-muted">
                    {it.size} · {pick(loc, it.colorNameAr, it.colorNameEn)}
                  </Td>
                  <Td className="text-end tabular-nums">{it.quantity}</Td>
                  <Td className="text-end tabular-nums">{formatMoney(it.lineTotalMinor, loc)}</Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title={o("summary")} />
          <dl className="divide-y divide-line text-sm">
            <TotalRow label={o("subtotal")} value={formatMoney(order.subtotalMinor, loc)} />
            {order.discountMinor > 0 || order.couponCode ? <TotalRow label={o("discount")} value={`− ${formatMoney(order.discountMinor, loc)}`} /> : null}
            <TotalRow label={o("shipping")} value={order.shippingMinor > 0 ? formatMoney(order.shippingMinor, loc) : o("free")} />
            {order.couponCode ? <TotalRow label={t("coupon")} value={order.couponCode} ltr /> : null}
            <TotalRow label={o("total")} value={formatMoney(order.totalMinor, loc)} strong />
          </dl>
        </Card>

        <Card>
          <CardHeader title={t("meta")} />
          <dl className="divide-y divide-line text-sm">
            <MetaRow
              label={t("deliveryMethod")}
              value={DELIVERY_IDS.has(order.deliveryMethod) ? co(`delivery.${order.deliveryMethod}` as "delivery.standard") : order.deliveryMethod}
            />
            <MetaRow
              label={t("paymentMethod")}
              value={PAYMENT_IDS.has(order.paymentMethod) ? co(`payment.${order.paymentMethod}` as "payment.cod") : order.paymentMethod}
            />
            {order.paymentReference ? <MetaRow label={t("paymentReference")} value={order.paymentReference} /> : null}
          </dl>
        </Card>

        <Card>
          <CardHeader title={t("timeline")} />
          {order.events.length === 0 ? (
            <p className="p-5 text-sm text-muted">{t("timelineEmpty")}</p>
          ) : (
            <ol className="divide-y divide-line">
              {order.events.map((e) => (
                <li key={e.id} className="flex items-start justify-between gap-3 px-5 py-3.5 text-sm">
                  <span className="min-w-0 space-y-1">
                    <OrderStatusBadge status={e.status} />
                    {e.note ? <p className="break-words text-xs text-muted">{e.note}</p> : null}
                  </span>
                  <time className="shrink-0 text-xs text-muted" dateTime={new Date(e.createdAt).toISOString()}>
                    {formatDate(e.createdAt, loc, true)}
                  </time>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </div>
  );
}

function TotalRow({ label, value, strong, ltr }: { label: string; value: string; strong?: boolean; ltr?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-3 px-5 py-3 ${strong ? "bg-brand/5" : ""}`}>
      <dt className={strong ? "text-xs uppercase tracking-[0.18em] text-accent" : "text-muted"}>{label}</dt>
      <dd className={`tabular-nums ${strong ? "font-medium" : ""}`} dir={ltr ? "ltr" : undefined}>
        {value}
      </dd>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 py-3">
      <dt className="text-xs uppercase tracking-[0.15em] text-accent">{label}</dt>
      <dd className="text-end text-muted" dir="ltr">
        {value}
      </dd>
    </div>
  );
}
