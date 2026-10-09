import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { buttonClasses } from "@/components/ui/button";
import { AccountShell } from "@/features/storefront/account/account-shell";
import { StatusBadge } from "@/features/storefront/account/order-views";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatDate } from "@/lib/format";
import { formatMoney, type Loc } from "@/lib/localize";
import { requireCustomer } from "@/server/auth/guard";
import { getCustomerOrders, formatOrderNumber } from "@/server/services/orders";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false } };

export default async function AccountPage({ params }: { params: Promise<{ locale: Locale }> }) {
  setRequestLocale((await params).locale);
  const customer = await requireCustomer("/account");
  const [t, loc, orders] = await Promise.all([getTranslations("account"), getLocale() as Promise<Loc>, getCustomerOrders(customer.id)]);
  const latest = orders[0];
  const spent = orders.filter((o) => o.status !== "cancelled" && o.status !== "returned").reduce((s, o) => s + o.totalMinor, 0);
  const active = orders.filter((o) => ["pending", "confirmed", "preparing", "shipped"].includes(o.status)).length;

  return (
    <AccountShell customer={customer} title={t("nav.overview")}>
      <dl className="grid gap-px border border-line bg-line sm:grid-cols-3">
        {[[t("statOrders"), String(orders.length)], [t("statActive"), String(active)], [t("statSpent"), formatMoney(spent, loc)]].map(([k, v]) => (
          <div key={k} className="bg-background p-6"><dt className="text-[0.72rem] uppercase tracking-[0.2em] text-accent">{k}</dt><dd className="mt-2 font-display text-3xl text-brand">{v}</dd></div>
        ))}
      </dl>
      <section className="mt-12" aria-labelledby="latest">
        <h2 id="latest" className="mb-5 text-xs font-medium uppercase tracking-[0.25em] text-accent">{t("latestOrder")}</h2>
        {latest ? (
          <Link href={`/account/orders/${formatOrderNumber(latest.seq)}`} className="flex flex-wrap items-center justify-between gap-4 border border-line p-6 transition-colors hover:border-brand">
            <div><p dir="ltr" className="font-display text-2xl text-brand">{formatOrderNumber(latest.seq)}</p><p className="text-sm text-muted">{formatDate(latest.createdAt, loc)} · {formatMoney(latest.totalMinor, loc)}</p></div>
            <StatusBadge status={latest.status} />
          </Link>
        ) : (
          <div className="grid justify-items-start gap-4 border border-line p-8"><p className="text-muted">{t("noOrdersYet")}</p><Link href="/shop" className={buttonClasses("primary")}>{t("startShopping")}</Link></div>
        )}
      </section>
    </AccountShell>
  );
}
