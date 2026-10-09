import { CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buttonClasses } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { OrderDetail } from "@/features/storefront/account/order-views";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { ORDER_COOKIE, unsign } from "@/server/auth/secret";
import { getCustomer } from "@/server/auth/session";
import { getOrderByNumber } from "@/server/services/orders";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false } };

export default async function ConfirmationPage({ params }: { params: Promise<{ locale: Locale; number: string }> }) {
  const { locale, number } = await params;
  setRequestLocale(locale);
  const order = await getOrderByNumber(decodeURIComponent(number));
  if (!order) notFound();

  // Guests prove ownership with the short-lived signed cookie set at checkout; signed-in customers by account.
  const [customer, jar] = await Promise.all([getCustomer(), cookies()]);
  const owns = unsign(jar.get(ORDER_COOKIE)?.value) === `MLK-${order.seq}` || (!!customer && order.customerId === customer.id);
  if (!owns) notFound();

  const t = await getTranslations("checkout");
  return (
    <Container className="max-w-4xl py-14 lg:py-20">
      <div className="mb-14 grid justify-items-center gap-4 text-center">
        <CheckCircle2 size={44} strokeWidth={1} className="text-accent" aria-hidden />
        <h1 className="font-display text-5xl text-brand sm:text-6xl">{t("thanksTitle")}</h1>
        <p className="max-w-md text-muted">{t("thanksBody", { email: order.email })}</p>
      </div>
      <OrderDetail order={order} />
      <div className="mt-14 flex flex-wrap justify-center gap-4">
        <Link href="/shop" className={buttonClasses("primary")}>{t("continueShopping")}</Link>
        {customer ? <Link href="/account/orders" className={buttonClasses("secondary")}>{t("myOrders")}</Link> : <Link href="/account/register" className={buttonClasses("secondary")}>{t("createAccount")}</Link>}
      </div>
    </Container>
  );
}
