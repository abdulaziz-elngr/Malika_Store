import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AccountShell } from "@/features/storefront/account/account-shell";
import { AddressManager } from "@/features/storefront/account/address-manager";
import type { Locale } from "@/i18n/routing";
import { requireCustomer } from "@/server/auth/guard";
import { listAddresses } from "@/server/services/customers";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false } };

export default async function AddressesPage({ params }: { params: Promise<{ locale: Locale }> }) {
  setRequestLocale((await params).locale);
  const customer = await requireCustomer("/account/addresses");
  const [t, addresses] = await Promise.all([getTranslations("account"), listAddresses(customer.id)]);
  return (
    <AccountShell customer={customer} title={t("nav.addresses")}>
      <AddressManager addresses={addresses.map((a) => ({ id: a.id, label: a.label, recipient: a.recipient, phone: a.phone, governorate: a.governorate, city: a.city, line1: a.line1, line2: a.line2, notes: a.notes, isDefault: a.isDefault }))} />
    </AccountShell>
  );
}
