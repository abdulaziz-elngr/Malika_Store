import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { Loader } from "@/components/brand/loader";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { CustomCursor } from "@/components/motion/custom-cursor";
import { VisitBeacon } from "@/features/storefront/analytics/visit-beacon";
import { CartDrawer } from "@/features/storefront/cart/cart-drawer";
import { CartProvider } from "@/features/storefront/cart/cart-provider";
import { WishlistProvider } from "@/features/storefront/wishlist/wishlist-provider";
import { routing } from "@/i18n/routing";
import { pick } from "@/lib/localize";
import { getNav } from "@/server/services/content";

/** Storefront chrome: header, footer, cart drawer and the cart/wishlist state. The admin area has its own layout. */
export default async function StoreLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  // Navigation CMS drives both menus; the components fall back to the default links when a menu is empty.
  const [headerNav, footerNav] = await Promise.all([getNav("header"), getNav("footer")]);
  const toLinks = (rows: typeof headerNav) => rows.map((r) => ({ id: r.id, href: r.href, label: pick(locale, r.labelAr, r.labelEn) }));

  return (
    <WishlistProvider>
      <CartProvider>
        <VisitBeacon />
        <Loader />
        <CustomCursor />
        <Header items={toLinks(headerNav)} />
        <main id="main">{children}</main>
        <Footer items={toLinks(footerNav)} />
        <CartDrawer />
      </CartProvider>
    </WishlistProvider>
  );
}
