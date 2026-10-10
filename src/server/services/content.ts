import { and, asc, desc, eq, gte, inArray, isNull, lte, or } from "drizzle-orm";
import { db } from "@/db/client";
import { banners, navigationItems, pages, productImages, products, productVariants } from "@/db/schema";

/**
 * Storefront-facing content reads (navigation menus, CMS pages, campaign banners,
 * homepage merchandising). The admin writes through the admin services; this file
 * is the read side the public pages use.
 */

export type NavRow = typeof navigationItems.$inferSelect;

/** Visible menu items for the header or footer, in their CMS order. */
export async function getNav(menu: "header" | "footer"): Promise<NavRow[]> {
  return db
    .select()
    .from(navigationItems)
    .where(and(eq(navigationItems.menu, menu), eq(navigationItems.visible, true)))
    .orderBy(asc(navigationItems.sortOrder));
}

/** A published CMS page by slug — powers /about, /contact, /faq, /privacy, /terms and any custom page. */
export async function getPageBySlug(slug: string) {
  const [row] = await db.select().from(pages).where(and(eq(pages.slug, slug), eq(pages.visible, true))).limit(1);
  return row ?? null;
}

export type BannerRow = typeof banners.$inferSelect;

/** Banners inside their schedule window, optionally filtered by position (home | promo | strip). */
export async function getActiveBanners(position?: string): Promise<BannerRow[]> {
  const now = new Date();
  const conds = [
    eq(banners.visible, true),
    or(isNull(banners.startsAt), lte(banners.startsAt, now))!,
    or(isNull(banners.endsAt), gte(banners.endsAt, now))!,
  ];
  if (position) conds.push(eq(banners.position, position));
  return db.select().from(banners).where(and(...conds)).orderBy(asc(banners.sortOrder), asc(banners.createdAt));
}

/**
 * Best-seller strip for the homepage: published products flagged `bestSeller`,
 * strongest sellers first, with images and variants so ProductCard can render.
 */
export async function listBestSellers(limit = 8) {
  const capped = Math.min(12, Math.max(1, limit));
  const ids = (
    await db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.status, "published"), eq(products.bestSeller, true)))
      .orderBy(desc(products.soldCount), desc(products.createdAt))
      .limit(capped)
  ).map((r) => r.id);
  if (!ids.length) return [];
  const found = await db.query.products.findMany({
    where: inArray(products.id, ids),
    with: { images: { orderBy: [asc(productImages.sortOrder)] }, variants: { orderBy: [asc(productVariants.sortOrder)] } },
  });
  return ids.map((id) => found.find((r) => r.id === id)).filter((r): r is (typeof found)[number] => !!r);
}
