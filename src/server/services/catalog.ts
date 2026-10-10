import { and, asc, count, desc, eq, exists, gte, ilike, inArray, isNotNull, lte, ne, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db/client";
import { audiences, categories, collections, productCollections, productImages, productVariants, products } from "@/db/schema";
import type { ShopQuery } from "@/lib/validation/shop";

export const PAGE_SIZE = 12;
const effectivePrice = sql<number>`coalesce(${products.salePriceMinor}, ${products.priceMinor})`;

function buildWhere(q: Partial<ShopQuery>, fixedGender?: string): SQL | undefined {
  const c: (SQL | undefined)[] = [eq(products.status, "published")];
  const gender = fixedGender ?? q.gender;
  // An audience can opt in to also showing "unisex" pieces (Women/Men do by default, Kids does not).
  if (gender) c.push(or(eq(products.gender, gender), and(eq(products.gender, "unisex"), sql`exists (select 1 from audience a where a.slug = ${gender} and a.include_unisex)`)));
  if (q.category?.length) c.push(inArray(products.categoryId, db.select({ id: categories.id }).from(categories).where(inArray(categories.slug, q.category))));
  if (q.collection?.length)
    c.push(exists(db.select({ x: sql`1` }).from(productCollections).innerJoin(collections, eq(collections.id, productCollections.collectionId)).where(and(eq(productCollections.productId, products.id), inArray(collections.slug, q.collection), eq(collections.visible, true)))));
  const variantConds: SQL[] = [eq(productVariants.productId, products.id)];
  if (q.size?.length) variantConds.push(inArray(productVariants.size, q.size));
  if (q.color?.length) variantConds.push(inArray(productVariants.colorNameEn, q.color));
  if (q.stock === "in") variantConds.push(sql`${productVariants.stock} > 0`);
  if (variantConds.length > 1) c.push(exists(db.select({ x: sql`1` }).from(productVariants).where(and(...variantConds))));
  if (q.min != null) c.push(gte(effectivePrice, q.min * 100));
  if (q.max != null) c.push(lte(effectivePrice, q.max * 100));
  if (q.sale) c.push(and(isNotNull(products.salePriceMinor), sql`${products.salePriceMinor} < ${products.priceMinor}`));
  if (q.q) {
    const like = `%${q.q.replace(/[%_]/g, "")}%`;
    c.push(or(ilike(products.nameAr, like), ilike(products.nameEn, like), ilike(products.sku, like), sql`${like} ilike any(${products.tags})`));
  }
  return and(...c);
}

const orderBy = (sort: ShopQuery["sort"]) =>
  sort === "newest" ? [desc(products.isNew), desc(products.createdAt)]
  : sort === "best" ? [desc(products.soldCount)]
  : sort === "price_asc" ? [asc(effectivePrice)]
  : sort === "price_desc" ? [desc(effectivePrice)]
  : [desc(products.featured), desc(products.soldCount)];

export async function listProducts(q: ShopQuery, fixedGender?: string) {
  const where = buildWhere(q, fixedGender);
  const [{ total } = { total: 0 }] = await db.select({ total: count() }).from(products).where(where);
  // Two steps: the filter subqueries reference the outer table, which the relational API aliases, so ids are selected first.
  const ids = (await db.select({ id: products.id }).from(products).where(where).orderBy(...orderBy(q.sort)).limit(PAGE_SIZE).offset((q.page - 1) * PAGE_SIZE)).map((r) => r.id);
  const found = ids.length
    ? await db.query.products.findMany({
        where: inArray(products.id, ids),
        with: { images: { orderBy: [asc(productImages.sortOrder)] }, variants: { orderBy: [asc(productVariants.sortOrder)] } },
      })
    : [];
  const rows = ids.map((id) => found.find((r) => r.id === id)).filter((r): r is (typeof found)[number] => !!r);
  return { items: rows, total, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export type ProductListItem = Awaited<ReturnType<typeof listProducts>>["items"][number];

export async function getFacets(fixedGender?: string) {
  const base = buildWhere({}, fixedGender);
  const [auds, cats, cols, sizes, colors, [range]] = await Promise.all([
    db.select({ slug: audiences.slug, nameAr: audiences.nameAr, nameEn: audiences.nameEn }).from(audiences).where(eq(audiences.visible, true)).orderBy(asc(audiences.sortOrder)),
    db.select({ slug: categories.slug, nameAr: categories.nameAr, nameEn: categories.nameEn }).from(categories).where(eq(categories.visible, true)).orderBy(asc(categories.sortOrder)),
    db.select({ slug: collections.slug, nameAr: collections.nameAr, nameEn: collections.nameEn }).from(collections).where(eq(collections.visible, true)).orderBy(asc(collections.createdAt)),
    db.selectDistinct({ size: productVariants.size }).from(productVariants).innerJoin(products, eq(products.id, productVariants.productId)).where(base),
    db.selectDistinct({ nameAr: productVariants.colorNameAr, nameEn: productVariants.colorNameEn, hex: productVariants.colorHex }).from(productVariants).innerJoin(products, eq(products.id, productVariants.productId)).where(base),
    db.select({ min: sql<number>`coalesce(min(${effectivePrice}),0)`, max: sql<number>`coalesce(max(${effectivePrice}),0)` }).from(products).where(base),
  ]);
  const order = ["XS", "S", "M", "L", "XL", "38", "40", "42", "44", "46", "One size"];
  return {
    audiences: auds, categories: cats, collections: cols, colors,
    sizes: sizes.map((s) => s.size).sort((a, b) => order.indexOf(a) - order.indexOf(b)),
    priceMin: Math.floor((range?.min ?? 0) / 100), priceMax: Math.ceil((range?.max ?? 0) / 100),
  };
}

export async function getProductBySlug(slug: string) {
  return db.query.products.findFirst({
    where: and(eq(products.slug, slug), eq(products.status, "published")),
    with: { category: true, images: { orderBy: [asc(productImages.sortOrder)] }, variants: { orderBy: [asc(productVariants.sortOrder)] } },
  });
}

export async function getRelatedProducts(productId: string, categoryId: string | null, limit = 4) {
  return db.query.products.findMany({
    where: and(eq(products.status, "published"), ne(products.id, productId), categoryId ? eq(products.categoryId, categoryId) : undefined),
    orderBy: [desc(products.soldCount)],
    limit,
    with: { images: { orderBy: [asc(productImages.sortOrder)] }, variants: { orderBy: [asc(productVariants.sortOrder)] } },
  });
}

export async function listCollections() {
  return db.select().from(collections).where(eq(collections.visible, true)).orderBy(asc(collections.createdAt));
}

export async function getCollection(slug: string) {
  const [row] = await db.select().from(collections).where(and(eq(collections.slug, slug), eq(collections.visible, true))).limit(1);
  return row ?? null;
}

/** Published products by id, in the order given (used by the wishlist page). */
export async function getProductsByIds(ids: string[]) {
  if (!ids.length) return [];
  const rows = await db.query.products.findMany({
    where: and(inArray(products.id, ids), eq(products.status, "published")),
    with: { images: { orderBy: [asc(productImages.sortOrder)] }, variants: { orderBy: [asc(productVariants.sortOrder)] } },
  });
  return ids.map((id) => rows.find((r) => r.id === id)).filter((r): r is (typeof rows)[number] => !!r);
}

export async function getAudience(slug: string) {
  const [row] = await db.select().from(audiences).where(and(eq(audiences.slug, slug), eq(audiences.visible, true))).limit(1);
  return row ?? null;
}
