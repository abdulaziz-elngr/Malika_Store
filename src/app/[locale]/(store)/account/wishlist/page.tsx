import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container } from "@/components/ui/container";
import { AccountShell } from "@/features/storefront/account/account-shell";
import { WishlistGrid } from "@/features/storefront/account/wishlist-grid";
import type { Locale } from "@/i18n/routing";
import { getCustomer } from "@/server/auth/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false } };

// Public on purpose: guests keep a wishlist in the browser, and it is merged into their account when they sign in.
export default async function WishlistPage({ params }: { params: Promise<{ locale: Locale }> }) {
  setRequestLocale((await params).locale);
  const [t, customer] = await Promise.all([getTranslations("account"), getCustomer()]);
  if (customer) return <AccountShell customer={customer} title={t("nav.wishlist")}><WishlistGrid /></AccountShell>;
  return (
    <Container className="py-12 lg:py-16">
      <h1 className="mb-3 font-display text-5xl text-brand sm:text-6xl">{t("nav.wishlist")}</h1>
      <p className="mb-10 max-w-xl text-muted">{t("guestWishlistNote")}</p>
      <WishlistGrid />
    </Container>
  );
}
