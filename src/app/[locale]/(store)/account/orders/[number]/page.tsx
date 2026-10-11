import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AccountShell } from "@/features/storefront/account/account-shell";
import { OrderDetail } from "@/features/storefront/account/order-views";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { requireCustomer } from "@/server/auth/guard";
import { getOrderForCustomer } from "@/server/services/orders";
import { getReviewStatusByProduct } from "@/server/services/reviews";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false } };

export default async function OrderPage({ params }: { params: Promise<{ locale: Locale; number: string }> }) {
  const { locale, number } = await params;
  setRequestLocale(locale);
  const customer = await requireCustomer(`/account/orders/${number}`);
  const order = await getOrderForCustomer(customer.id, decodeURIComponent(number));
  if (!order) notFound();
  const t = await getTranslations("account");
  const reviewStatuses = await getReviewStatusByProduct(customer.id, order.items.flatMap((i) => (i.productId ? [i.productId] : [])));
  return (
    <AccountShell customer={customer} title={t("orderDetails")}>
      <Link href="/account/orders" className="mb-8 inline-block text-sm uppercase tracking-[0.18em] text-accent hover:text-foreground"><span aria-hidden className="inline-block rtl:rotate-180">←</span> {t("backToOrders")}</Link>
      <OrderDetail order={order} reviewStatuses={reviewStatuses} />
    </AccountShell>
  );
}
