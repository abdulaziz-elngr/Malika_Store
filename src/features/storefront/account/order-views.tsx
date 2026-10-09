import { Check } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { ImageSlot } from "@/features/storefront/home/image-slot";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { governorateName } from "@/lib/geo";
import { formatMoney, pick, type Loc } from "@/lib/localize";
import type { OrderDetails } from "@/server/services/orders";
import { formatOrderNumber } from "@/server/services/orders";

type Tone = "wine" | "copper" | "cream" | "sage";
const FLOW = ["pending", "confirmed", "preparing", "shipped", "delivered"] as const;

export async function StatusBadge({ status }: { status: string }) {
  const t = await getTranslations("orders");
  const tone = status === "delivered" ? "border-sage-700 text-sage-700 dark:border-sage-500 dark:text-sage-500" : status === "cancelled" || status === "returned" ? "border-muted text-muted" : "border-brand text-brand";
  return <span className={cn("inline-block border px-2.5 py-1 text-[0.68rem] uppercase tracking-[0.18em]", tone)}>{t(`status.${status}` as never)}</span>;
}

/** Order tracking: Pending → Confirmed → Preparing → Shipped → Delivered, with the date each step was reached. */
export async function OrderTimeline({ order }: { order: Pick<OrderDetails, "status" | "events"> }) {
  const [t, loc] = await Promise.all([getTranslations("orders"), getLocale() as Promise<Loc>]);
  const dateOf = (s: string) => order.events.find((e) => e.status === s)?.createdAt;
  const off = order.status === "cancelled" || order.status === "returned";
  const reached = off ? FLOW.findLastIndex((s) => !!dateOf(s)) : FLOW.indexOf(order.status as (typeof FLOW)[number]);

  return (
    <ol aria-label={t("tracking")} className="grid gap-6 sm:grid-cols-5 sm:gap-3">
      {FLOW.map((s, i) => {
        const done = i <= reached;
        const current = !off && i === reached;
        const date = dateOf(s);
        return (
          <li key={s} aria-current={current ? "step" : undefined} className="flex items-start gap-4 sm:flex-col sm:gap-3">
            <span className={cn("grid size-8 shrink-0 place-items-center rounded-full border text-xs", done ? "border-brand bg-brand text-brand-contrast" : "border-line text-muted", current && "ring-2 ring-accent ring-offset-2 ring-offset-background")}>
              {done ? <Check size={14} strokeWidth={2.4} /> : i + 1}
            </span>
            <span className="space-y-0.5 text-sm">
              <span className={cn("block font-medium", !done && "text-muted")}>{t(`status.${s}` as never)}</span>
              {date && <span className="block text-xs text-muted">{formatDate(date, loc, true)}</span>}
            </span>
          </li>
        );
      })}
      {off && (
        <li className="sm:col-span-5">
          <p role="status" className="border border-brand/40 bg-brand/5 px-4 py-3 text-sm text-brand">{t(`status.${order.status}` as never)} · {dateOf(order.status) && formatDate(dateOf(order.status)!, loc, true)}</p>
        </li>
      )}
    </ol>
  );
}

export async function OrderDetail({ order, heading }: { order: OrderDetails; heading?: React.ReactNode }) {
  const [t, tc, loc] = await Promise.all([getTranslations("orders"), getTranslations("checkout"), getLocale() as Promise<Loc>]);
  return (
    <div className="space-y-12">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[0.72rem] uppercase tracking-[0.22em] text-accent">{t("orderNumber")}</p>
          <h2 dir="ltr" className="font-display text-4xl text-brand">{formatOrderNumber(order.seq)}</h2>
          <p className="mt-1 text-sm text-muted">{t("placedOn", { date: formatDate(order.createdAt, loc, true) })}</p>
        </div>
        <StatusBadge status={order.status} />
      </header>
      {heading}
      <section aria-labelledby="ot"><h3 id="ot" className="sr-only">{t("tracking")}</h3><OrderTimeline order={order} /></section>

      <section aria-labelledby="oi">
        <h3 id="oi" className="mb-2 text-xs font-medium uppercase tracking-[0.25em] text-accent">{t("items")}</h3>
        <ul className="border-t border-line">
          {order.items.map((i) => (
            <li key={i.id} className="flex gap-4 border-b border-line py-5">
              <div className="w-20 shrink-0"><ImageSlot src={i.imageUrl} tone={i.tone as Tone} sizes="80px" className="aspect-[3/4]" /></div>
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-display text-lg leading-snug"><Link href={`/products/${i.slug}`}>{pick(loc, i.nameAr, i.nameEn)}</Link></p>
                <p className="mt-1 text-muted">{pick(loc, i.colorNameAr, i.colorNameEn)} · {i.size} · ×{i.quantity}</p>
              </div>
              <p className="text-sm">{formatMoney(i.lineTotalMinor, loc)}</p>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-10 md:grid-cols-2">
        <section aria-labelledby="od" className="space-y-2 text-sm">
          <h3 id="od" className="mb-3 text-xs font-medium uppercase tracking-[0.25em] text-accent">{t("delivery")}</h3>
          <p>{order.name}</p>
          <p className="text-muted">{order.line1}{order.line2 ? `، ${order.line2}` : ""}</p>
          <p className="text-muted">{order.city}، {governorateName(order.governorate, loc)}</p>
          <p dir="ltr" className="text-start text-muted">{order.phone}</p>
          <p className="pt-2 text-muted">{tc(`delivery.${order.deliveryMethod}` as never)} · {tc(`payment.${order.paymentMethod}` as never)} · {t(`payment.${order.paymentStatus}` as never)}</p>
          {order.notes && <p className="pt-2 text-muted">“{order.notes}”</p>}
        </section>
        <section aria-labelledby="os">
          <h3 id="os" className="mb-3 text-xs font-medium uppercase tracking-[0.25em] text-accent">{t("summary")}</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between"><dt className="text-muted">{t("subtotal")}</dt><dd>{formatMoney(order.subtotalMinor, loc)}</dd></div>
            {order.discountMinor > 0 && <div className="flex justify-between"><dt className="text-muted">{t("discount")}{order.couponCode ? ` (${order.couponCode})` : ""}</dt><dd className="text-sage-700 dark:text-sage-500">− {formatMoney(order.discountMinor, loc)}</dd></div>}
            <div className="flex justify-between"><dt className="text-muted">{t("shipping")}</dt><dd>{order.shippingMinor === 0 ? t("free") : formatMoney(order.shippingMinor, loc)}</dd></div>
            <div className="flex items-baseline justify-between border-t border-line pt-4"><dt className="uppercase tracking-[0.18em]">{t("total")}</dt><dd className="font-display text-2xl text-brand">{formatMoney(order.totalMinor, loc)}</dd></div>
          </dl>
        </section>
      </div>
    </div>
  );
}
