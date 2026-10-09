import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AccountShell } from "@/features/storefront/account/account-shell";
import { PasswordForm, ProfileForm } from "@/features/storefront/account/profile-forms";
import type { Locale } from "@/i18n/routing";
import { requireCustomer } from "@/server/auth/guard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false } };

export default async function ProfilePage({ params }: { params: Promise<{ locale: Locale }> }) {
  setRequestLocale((await params).locale);
  const customer = await requireCustomer("/account/profile");
  const t = await getTranslations("account");
  return (
    <AccountShell customer={customer} title={t("nav.profile")}>
      <section aria-labelledby="pi" className="space-y-6"><h2 id="pi" className="text-xs font-medium uppercase tracking-[0.25em] text-accent">{t("personalInfo")}</h2><ProfileForm name={customer.name} phone={customer.phone ?? ""} email={customer.email} /></section>
      <section aria-labelledby="ps" className="mt-14 space-y-6 border-t border-line pt-12"><h2 id="ps" className="text-xs font-medium uppercase tracking-[0.25em] text-accent">{t("security")}</h2><PasswordForm /></section>
    </AccountShell>
  );
}
