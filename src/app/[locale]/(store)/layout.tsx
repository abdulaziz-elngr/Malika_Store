import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Loader } from "@/components/brand/loader";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { WhatsAppButton } from "@/components/layout/whatsapp-button";
import { CustomCursor } from "@/components/motion/custom-cursor";
import { VisitBeacon } from "@/features/storefront/analytics/visit-beacon";
import { CartDrawer } from "@/features/storefront/cart/cart-drawer";
import { CartProvider } from "@/features/storefront/cart/cart-provider";
import { WishlistProvider } from "@/features/storefront/wishlist/wishlist-provider";
import { routing } from "@/i18n/routing";
import { buildHeaderLinks } from "@/lib/header-nav";
import { pick, type Loc } from "@/lib/localize";
import { getHeaderAudiences } from "@/server/services/catalog";
import { getNav } from "@/server/services/content";

const navDefaults = { shop: "/shop", newArrivals: "/shop?sort=newest", collections: "/collections", about: "/about" } as const;

/** Storefront chrome: header, footer, cart drawer and the cart/wishlist state. The admin area has its own layout. */
export default async function StoreLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  // Navigation CMS drives both menus; the components fall back to the default links when a menu is empty.
  const [headerNav, footerNav, audiences, n] = await Promise.all([getNav("header"), getNav("footer"), getHeaderAudiences(), getTranslations({ locale, namespace: "nav" })]);
  const toLinks = (rows: typeof headerNav) => rows.map((r) => ({ id: r.id, href: r.href, label: pick(locale, r.labelAr, r.labelEn) }));
  // Audiences created in the admin (Women, Men, Kids…) join the header by themselves, each with its categories and collections.
  // With an empty CMS menu the default links are used, minus the hard-coded Women/Men entries the audiences replace.
  const cmsHeader = headerNav.length
    ? toLinks(headerNav)
    : audiences.length
      ? (["shop", "newArrivals", "collections", "about"] as const).map((k) => ({ id: k, href: navDefaults[k], label: n(k) }))
      : [];
  const headerLinks = buildHeaderLinks(cmsHeader, audiences, locale as Loc, { categories: n("categories"), collections: n("collections"), viewAll: n("viewAll") });

  return (
    <WishlistProvider>
      <CartProvider>
        <VisitBeacon />
        <Loader />
        <CustomCursor />
        <Header items={headerLinks} viewAllLabel={n("viewAll")} />
        <main id="main">{children}</main>
        <Footer items={toLinks(footerNav)} />
        <WhatsAppButton />
        <CartDrawer />
      </CartProvider>
    </WishlistProvider>
  );
}
