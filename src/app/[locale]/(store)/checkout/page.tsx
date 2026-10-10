import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { CheckoutFlow } from "@/features/storefront/checkout/checkout-flow";
import { getCustomer } from "@/server/auth/session";
import { listPaymentMethods } from "@/lib/payments";
import { listAddresses } from "@/server/services/customers";
import { getPaymentSettings } from "@/server/services/settings";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "checkout" });
  return { title: `${t("title")} — MALIKA`, robots: { index: false } };
}

export default async function CheckoutPage({ params }: { params: Promise<{ locale: Locale }> }) {
  setRequestLocale((await params).locale);
  const customer = await getCustomer();
  const [addresses, payments] = await Promise.all([customer ? listAddresses(customer.id) : Promise.resolve([]), getPaymentSettings()]);
  return (
    <CheckoutFlow
      customer={customer ? { name: customer.name, email: customer.email, phone: customer.phone } : null}
      addresses={addresses.map((a) => ({ id: a.id, label: a.label, recipient: a.recipient, phone: a.phone, governorate: a.governorate, city: a.city, line1: a.line1, line2: a.line2, notes: a.notes, isDefault: a.isDefault }))}
      methods={listPaymentMethods(payments).filter((m) => m.enabled)}
      payments={payments}
    />
  );
}
