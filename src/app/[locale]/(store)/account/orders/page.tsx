import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { buttonClasses } from "@/components/ui/button";
import { AccountShell } from "@/features/storefront/account/account-shell";
import { StatusBadge } from "@/features/storefront/account/order-views";
import { ImageSlot } from "@/features/storefront/home/image-slot";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatDate } from "@/lib/format";
import { formatMoney, type Loc } from "@/lib/localize";
import { requireCustomer } from "@/server/auth/guard";
import { formatOrderNumber, getCustomerOrders } from "@/server/services/orders";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false } };
type Tone = "wine" | "copper" | "cream" | "sage";

export default async function OrdersPage({ params }: { params: Promise<{ locale: Locale }> }) {
  setRequestLocale((await params).locale);
  const customer = await requireCustomer("/account/orders");
  const [t, loc, orders] = await Promise.all([getTranslations("account"), getLocale() as Promise<Loc>, getCustomerOrders(customer.id)]);
  return (
    <AccountShell customer={customer} title={t("nav.orders")}>
      {orders.length === 0 ? (
        <div className="grid justify-items-start gap-4 border border-line p-8"><p className="text-muted">{t("noOrdersYet")}</p><Link href="/shop" className={buttonClasses("primary")}>{t("startShopping")}</Link></div>
      ) : (
        <ul className="space-y-4">
          {orders.map((o) => {
            const number = formatOrderNumber(o.seq);
            return (
              <li key={o.id}>
                <Link href={`/account/orders/${number}`} className="grid gap-5 border border-line p-5 transition-colors hover:border-brand sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2"><p dir="ltr" className="font-display text-2xl text-brand">{number}</p><StatusBadge status={o.status} /></div>
                    <p className="text-sm text-muted">{formatDate(o.createdAt, loc)} · {t("itemsCount", { count: o.items.reduce((s, i) => s + i.quantity, 0) })} · {formatMoney(o.totalMinor, loc)}</p>
                  </div>
                  <div className="flex gap-2">{o.items.slice(0, 4).map((i) => <div key={i.id} className="w-12"><ImageSlot src={i.imageUrl} tone={i.tone as Tone} sizes="48px" className="aspect-[3/4]" /></div>)}</div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </AccountShell>
  );
}
