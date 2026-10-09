import { and, asc, count, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db/client";
import { categories, collections, inventoryMovements, productCollections, productImages, productVariants, products } from "@/db/schema";
import { slugify } from "@/lib/slug";
import type { AdminSessionUser } from "@/server/auth/admin-session";
import { recordAudit, changedFields } from "./audit";

/* ───────── products ───────── */

const PAGE = 20;

export async function listProductsAdmin(f: { q?: string; status?: string; category?: string; gender?: string; page: number }) {
  const conds: (SQL | undefined)[] = [];
  const q = f.q?.trim().slice(0, 80);
  if (q) {
    const like = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    conds.push(or(ilike(products.nameAr, like), ilike(products.nameEn, like), ilike(products.sku, like), ilike(products.slug, like)));
  }
  if (f.status && ["draft", "published", "archived"].includes(f.status)) conds.push(eq(products.status, f.status as "draft"));
  if (f.gender && ["women", "men", "unisex"].includes(f.gender)) conds.push(eq(products.gender, f.gender as "women"));
  if (f.category) conds.push(eq(products.categoryId, f.category));
  const where = conds.length ? and(...conds) : undefined;

  const [{ total } = { total: 0 }] = await db.select({ total: count() }).from(products).where(where);
  // Outer key written out as "product"."id" — ${products.id} renders bare inside field-list SQL and binds to the inner row.
  const rows = await db
    .select({ p: products, categoryNameEn: categories.nameEn, image: sql<string | null>`(select url from product_image i where i.product_id = "product"."id" order by i.sort_order limit 1)`, stock: sql<number>`(select coalesce(sum(v.stock),0)::int from product_variant v where v.product_id = "product"."id")` })
    .from(products)
    .leftJoin(categories, eq(categories.id, products.categoryId))
    .where(where)
    .orderBy(desc(products.createdAt))
    .limit(PAGE)
    .offset((f.page - 1) * PAGE);
  return { rows, total, pages: Math.max(1, Math.ceil(total / PAGE)) };
}

export const getProductAdmin = (id: string) =>
  db.query.products.findFirst({
    where: eq(products.id, id),
    with: { images: { orderBy: [asc(productImages.sortOrder)] }, variants: { orderBy: [asc(productVariants.sortOrder)] }, collections: true },
  });

export type ProductAdmin = NonNullable<Awaited<ReturnType<typeof getProductAdmin>>>;

export type ProductImageInput = { id?: string; url: string | null; tone: string; altAr: string; altEn: string; colorHex: string | null };
export type VariantInput = { id?: string; sku: string; size: string; colorNameAr: string; colorNameEn: string; colorHex: string; priceMinor: number | null; stock: number };

export type ProductInput = {
  nameAr: string; nameEn: string; sku: string; slug: string;
  shortAr: string; shortEn: string; descriptionAr: string; descriptionEn: string;
  materialsAr: string; materialsEn: string; careAr: string; careEn: string;
  priceMinor: number; salePriceMinor: number | null; costMinor: number | null;
  categoryId: string | null; gender: "women" | "men" | "unisex"; status: "draft" | "published" | "archived";
  featured: boolean; isNew: boolean; bestSeller: boolean; weightGrams: number | null; tags: string[]; videoUrl: string | null;
  collectionIds: string[]; images: ProductImageInput[]; variants: VariantInput[];
  seoTitleAr: string; seoTitleEn: string; seoDescriptionAr: string; seoDescriptionEn: string;
};

/** Creates or updates a product with its images, variants and collection links, inside one transaction. */
export async function saveProduct(actor: AdminSessionUser, id: string | null, input: ProductInput) {
  const before = id ? await getProductAdmin(id) : null;
  const now = new Date();

  const result = await db.transaction(async (tx) => {
    const values = {
      nameAr: input.nameAr, nameEn: input.nameEn, sku: input.sku, slug: input.slug || slugify(input.nameEn),
      shortAr: input.shortAr || null, shortEn: input.shortEn || null, descriptionAr: input.descriptionAr || null, descriptionEn: input.descriptionEn || null,
      materialsAr: input.materialsAr || null, materialsEn: input.materialsEn || null, careAr: input.careAr || null, careEn: input.careEn || null,
      priceMinor: input.priceMinor, salePriceMinor: input.salePriceMinor, costMinor: input.costMinor,
      categoryId: input.categoryId, gender: input.gender, status: input.status,
      featured: input.featured, isNew: input.isNew, bestSeller: input.bestSeller,
      weightGrams: input.weightGrams, tags: input.tags, videoUrl: input.videoUrl || null,
      seoTitleAr: input.seoTitleAr || null, seoTitleEn: input.seoTitleEn || null, seoDescriptionAr: input.seoDescriptionAr || null, seoDescriptionEn: input.seoDescriptionEn || null,
      updatedAt: now,
    };

    let productId: string;
    if (id) {
      const [row] = await tx.update(products).set(values).where(eq(products.id, id)).returning({ id: products.id });
      productId = row!.id;
    } else {
      const [row] = await tx.insert(products).values({ ...values, createdAt: now }).returning({ id: products.id });
      productId = row!.id;
    }

    // Images: update kept rows, insert new ones, delete the rest.
    const keepImageIds = input.images.map((i) => i.id).filter((x): x is string => !!x);
    if (before) {
      const drop = before.images.filter((i) => !keepImageIds.includes(i.id)).map((i) => i.id);
      if (drop.length) await tx.delete(productImages).where(inArray(productImages.id, drop));
    }
    for (const [i, im] of input.images.entries()) {
      const imgValues = { url: im.url || null, tone: im.tone, altAr: im.altAr || null, altEn: im.altEn || null, colorHex: im.colorHex, sortOrder: i };
      if (im.id) await tx.update(productImages).set(imgValues).where(eq(productImages.id, im.id));
      else {
        const [row] = await tx.insert(productImages).values({ ...imgValues, productId }).returning({ id: productImages.id });
        im.id = row!.id;
      }
    }

    // Variants: stock changes are recorded as inventory movements.
    const keepVariantIds = input.variants.map((v) => v.id).filter((x): x is string => !!x);
    if (before) {
      const drop = before.variants.filter((v) => !keepVariantIds.includes(v.id)).map((v) => v.id);
      if (drop.length) await tx.delete(productVariants).where(inArray(productVariants.id, drop));
    }
    const movements: { variantId: string; delta: number; reason: string; note: string }[] = [];
    for (const [i, v] of input.variants.entries()) {
      const vValues = { sku: v.sku, size: v.size, colorNameAr: v.colorNameAr, colorNameEn: v.colorNameEn, colorHex: v.colorHex, priceMinor: v.priceMinor, sortOrder: i, updatedAt: now };
      if (v.id) {
        const prev = before?.variants.find((x) => x.id === v.id);
        await tx.update(productVariants).set(vValues).where(eq(productVariants.id, v.id));
        if (prev && prev.stock !== v.stock) movements.push({ variantId: v.id, delta: v.stock - prev.stock, reason: "adjustment", note: "Product edit" });
      } else {
        const [row] = await tx.insert(productVariants).values({ ...vValues, productId, stock: v.stock }).returning({ id: productVariants.id });
        if (v.stock > 0) movements.push({ variantId: row!.id, delta: v.stock, reason: "initial", note: "Opening stock" });
      }
    }
    if (movements.length) await tx.insert(inventoryMovements).values(movements);

    // Collection links: replace.
    await tx.delete(productCollections).where(eq(productCollections.productId, productId));
    if (input.collectionIds.length)
      await tx.insert(productCollections).values(input.collectionIds.map((collectionId, i) => ({ productId, collectionId, sortOrder: i })));

    return productId;
  });

  const after = await getProductAdmin(result);
  const diff = before ? changedFields(pickAudit(before), pickAudit(after!)) : { before: {}, after: pickAudit(after!) };
  await recordAudit(null, actor, { action: id ? "product.update" : "product.create", entity: "product", entityId: result, summary: `${id ? "Updated" : "Created"} product ${input.nameEn} (${input.sku})`, ...diff });
  return result;
}

const pickAudit = (p: ProductAdmin) => ({ nameEn: p.nameEn, nameAr: p.nameAr, sku: p.sku, slug: p.slug, priceMinor: p.priceMinor, salePriceMinor: p.salePriceMinor, status: p.status, featured: p.featured, gender: p.gender, categoryId: p.categoryId });

export async function setProductStatus(actor: AdminSessionUser, ids: string[], status: "draft" | "published" | "archived") {
  const rows = await db.update(products).set({ status, updatedAt: new Date() }).where(inArray(products.id, ids)).returning({ id: products.id, nameEn: products.nameEn });
  await recordAudit(null, actor, { action: `product.${status}`, entity: "product", entityId: ids.join(","), summary: `Set ${rows.length} product(s) to ${status}`, after: { status } });
  return rows.length;
}

export async function setProductFlags(actor: AdminSessionUser, id: string, flags: { featured?: boolean; isNew?: boolean; bestSeller?: boolean }) {
  const [before] = await db.select({ featured: products.featured, isNew: products.isNew, bestSeller: products.bestSeller }).from(products).where(eq(products.id, id)).limit(1);
  await db.update(products).set({ ...flags, updatedAt: new Date() }).where(eq(products.id, id));
  await recordAudit(null, actor, { action: "product.update", entity: "product", entityId: id, summary: "Updated product flags", before, after: { ...before, ...flags } });
}

export async function duplicateProduct(actor: AdminSessionUser, id: string) {
  const src = await getProductAdmin(id);
  if (!src) return null;
  const stamp = Date.now().toString(36).slice(-4).toUpperCase();
  const copyId = await saveProduct(actor, null, {
    nameAr: src.nameAr, nameEn: `${src.nameEn} (copy)`, sku: `${src.sku}-${stamp}`, slug: `${src.slug}-${stamp.toLowerCase()}`,
    shortAr: src.shortAr ?? "", shortEn: src.shortEn ?? "", descriptionAr: src.descriptionAr ?? "", descriptionEn: src.descriptionEn ?? "",
    materialsAr: src.materialsAr ?? "", materialsEn: src.materialsEn ?? "", careAr: src.careAr ?? "", careEn: src.careEn ?? "",
    priceMinor: src.priceMinor, salePriceMinor: src.salePriceMinor, costMinor: src.costMinor,
    categoryId: src.categoryId, gender: src.gender, status: "draft", featured: false, isNew: false, bestSeller: false,
    weightGrams: src.weightGrams, tags: src.tags, videoUrl: src.videoUrl,
    collectionIds: src.collections.map((c) => c.collectionId),
    images: src.images.map((i) => ({ url: i.url, tone: i.tone, altAr: i.altAr ?? "", altEn: i.altEn ?? "", colorHex: i.colorHex })),
    variants: src.variants.map((v) => ({ sku: `${v.sku}-${stamp}`, size: v.size, colorNameAr: v.colorNameAr, colorNameEn: v.colorNameEn, colorHex: v.colorHex, priceMinor: v.priceMinor, stock: 0 })),
    seoTitleAr: src.seoTitleAr ?? "", seoTitleEn: src.seoTitleEn ?? "", seoDescriptionAr: src.seoDescriptionAr ?? "", seoDescriptionEn: src.seoDescriptionEn ?? "",
  });
  return copyId;
}

export async function deleteProducts(actor: AdminSessionUser, ids: string[]) {
  const rows = await db.delete(products).where(inArray(products.id, ids)).returning({ nameEn: products.nameEn });
  await recordAudit(null, actor, { action: "product.delete", entity: "product", entityId: ids.join(","), summary: `Deleted ${rows.length} product(s)`, before: { names: rows.map((r) => r.nameEn) } });
  return rows.length;
}

/* ───────── categories ───────── */

export const listCategoriesAdmin = () =>
  db.select({ c: categories, productCount: sql<number>`(select count(*)::int from product p where p.category_id = "category"."id")` }).from(categories).orderBy(asc(categories.sortOrder), asc(categories.nameEn));

export type CategoryInput = { nameAr: string; nameEn: string; slug: string; descriptionAr: string; descriptionEn: string; imageUrl: string | null; tone: string; parentId: string | null; visible: boolean; seoTitleAr: string; seoTitleEn: string; seoDescriptionAr: string; seoDescriptionEn: string };

export async function saveCategory(actor: AdminSessionUser, id: string | null, input: CategoryInput) {
  const values = { nameAr: input.nameAr, nameEn: input.nameEn, slug: input.slug || slugify(input.nameEn), descriptionAr: input.descriptionAr || null, descriptionEn: input.descriptionEn || null, imageUrl: input.imageUrl, tone: input.tone, parentId: input.parentId, visible: input.visible, seoTitleAr: input.seoTitleAr || null, seoTitleEn: input.seoTitleEn || null, seoDescriptionAr: input.seoDescriptionAr || null, seoDescriptionEn: input.seoDescriptionEn || null, updatedAt: new Date() };
  let cid: string;
  if (id) {
    const [row] = await db.update(categories).set(values).where(eq(categories.id, id)).returning({ id: categories.id });
    cid = row!.id;
  } else {
    const [{ max } = { max: 0 }] = await db.select({ max: sql<number>`coalesce(max(sort_order), -1)::int` }).from(categories);
    const [row] = await db.insert(categories).values({ ...values, sortOrder: max + 1 }).returning({ id: categories.id });
    cid = row!.id;
  }
  await recordAudit(null, actor, { action: id ? "category.update" : "category.create", entity: "category", entityId: cid, summary: `${id ? "Updated" : "Created"} category ${input.nameEn}`, after: { nameEn: input.nameEn, slug: values.slug, visible: input.visible } });
  return cid;
}

export async function reorderCategory(actor: AdminSessionUser, id: string, dir: -1 | 1) {
  const all = await db.select().from(categories).orderBy(asc(categories.sortOrder));
  const i = all.findIndex((c) => c.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= all.length) return;
  await db.transaction(async (tx) => {
    await tx.update(categories).set({ sortOrder: j, updatedAt: new Date() }).where(eq(categories.id, all[i]!.id));
    await tx.update(categories).set({ sortOrder: i, updatedAt: new Date() }).where(eq(categories.id, all[j]!.id));
  });
  await recordAudit(null, actor, { action: "category.reorder", entity: "category", entityId: id, summary: `Moved category ${all[i]!.nameEn} ${dir < 0 ? "up" : "down"}` });
}

export async function deleteCategory(actor: AdminSessionUser, id: string) {
  const [row] = await db.delete(categories).where(eq(categories.id, id)).returning({ nameEn: categories.nameEn });
  if (row) await recordAudit(null, actor, { action: "category.delete", entity: "category", entityId: id, summary: `Deleted category ${row.nameEn}`, before: { nameEn: row.nameEn } });
  return !!row;
}

/* ───────── collections ───────── */

export const listCollectionsAdmin = () =>
  db.select({ c: collections, productCount: sql<number>`(select count(*)::int from product_collection pc where pc.collection_id = "collection"."id")` }).from(collections).orderBy(desc(collections.createdAt));

/** Lightweight labels for the collection/coupon product pickers. */
export const productOptions = () => db.select({ id: products.id, nameEn: products.nameEn, nameAr: products.nameAr, sku: products.sku }).from(products).orderBy(desc(products.createdAt)).limit(500);

/** Every collection→product link, so the editor can pre-check assigned products. */
export const allCollectionLinks = () => db.select({ collectionId: productCollections.collectionId, productId: productCollections.productId }).from(productCollections);

export const getCollectionAdmin = (id: string) => db.query.collections.findFirst({ where: eq(collections.id, id) });

export type CollectionInput = { nameAr: string; nameEn: string; slug: string; descriptionAr: string; descriptionEn: string; coverUrl: string | null; bannerUrl: string | null; tone: string; startsAt: string; endsAt: string; visible: boolean; productIds: string[]; seoTitleAr: string; seoTitleEn: string; seoDescriptionAr: string; seoDescriptionEn: string };

export async function saveCollection(actor: AdminSessionUser, id: string | null, input: CollectionInput) {
  const values = { nameAr: input.nameAr, nameEn: input.nameEn, slug: input.slug || slugify(input.nameEn), descriptionAr: input.descriptionAr || null, descriptionEn: input.descriptionEn || null, coverUrl: input.coverUrl, bannerUrl: input.bannerUrl, tone: input.tone, startsAt: input.startsAt ? new Date(input.startsAt) : null, endsAt: input.endsAt ? new Date(input.endsAt) : null, visible: input.visible, seoTitleAr: input.seoTitleAr || null, seoTitleEn: input.seoTitleEn || null, seoDescriptionAr: input.seoDescriptionAr || null, seoDescriptionEn: input.seoDescriptionEn || null, updatedAt: new Date() };
  let cid: string;
  if (id) {
    const [row] = await db.update(collections).set(values).where(eq(collections.id, id)).returning({ id: collections.id });
    cid = row!.id;
  } else {
    const [row] = await db.insert(collections).values(values).returning({ id: collections.id });
    cid = row!.id;
  }
  await db.delete(productCollections).where(eq(productCollections.collectionId, cid));
  if (input.productIds.length) {
    const real = await db.select({ id: products.id }).from(products).where(inArray(products.id, input.productIds));
    if (real.length) await db.insert(productCollections).values(real.map((p, i) => ({ productId: p.id, collectionId: cid, sortOrder: i })));
  }
  await recordAudit(null, actor, { action: id ? "collection.update" : "collection.create", entity: "collection", entityId: cid, summary: `${id ? "Updated" : "Created"} collection ${input.nameEn}`, after: { nameEn: input.nameEn, visible: input.visible, products: input.productIds.length } });
  return cid;
}

export async function deleteCollection(actor: AdminSessionUser, id: string) {
  const [row] = await db.delete(collections).where(eq(collections.id, id)).returning({ nameEn: collections.nameEn });
  if (row) await recordAudit(null, actor, { action: "collection.delete", entity: "collection", entityId: id, summary: `Deleted collection ${row.nameEn}`, before: { nameEn: row.nameEn } });
  return !!row;
}

/* ───────── inventory ───────── */

export const INVENTORY_PAGE = 25;

export async function listVariantsAdmin(f: { q?: string; level?: string; page: number; threshold: number }) {
  const conds: (SQL | undefined)[] = [];
  const q = f.q?.trim().slice(0, 80);
  if (q) {
    const like = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    conds.push(or(ilike(products.nameEn, like), ilike(products.nameAr, like), ilike(productVariants.sku, like)));
  }
  if (f.level === "low") conds.push(and(sql`${productVariants.stock} > 0`, sql`${productVariants.stock} <= ${f.threshold}`));
  if (f.level === "out") conds.push(eq(productVariants.stock, 0));
  const where = conds.length ? and(...conds) : undefined;

  const [{ total } = { total: 0 }] = await db.select({ total: count() }).from(productVariants).innerJoin(products, eq(products.id, productVariants.productId)).where(where);
  const rows = await db
    .select({ v: productVariants, nameAr: products.nameAr, nameEn: products.nameEn, slug: products.slug, status: products.status, costMinor: products.costMinor, priceMinor: products.priceMinor })
    .from(productVariants)
    .innerJoin(products, eq(products.id, productVariants.productId))
    .where(where)
    .orderBy(sql`${productVariants.stock} asc`, products.nameEn)
    .limit(INVENTORY_PAGE)
    .offset((f.page - 1) * INVENTORY_PAGE);
  return { rows, total, pages: Math.max(1, Math.ceil(total / INVENTORY_PAGE)) };
}

/** Headline inventory numbers; `low` honours the admin-configurable low-stock threshold. */
export async function inventoryStats(threshold: number) {
  const [r] = await db
    .select({
      units: sql<number>`coalesce(sum(${productVariants.stock}),0)::int`,
      valueMinor: sql<number>`coalesce(sum(${productVariants.stock} * coalesce(${products.costMinor}, ${products.priceMinor})),0)::bigint::float8`,
      low: sql<number>`count(*) filter (where ${productVariants.stock} between 1 and ${threshold})::int`,
      out: sql<number>`count(*) filter (where ${productVariants.stock} = 0)::int`,
    })
    .from(productVariants)
    .innerJoin(products, eq(products.id, productVariants.productId));
  return { units: r?.units ?? 0, valueMinor: Math.round(r?.valueMinor ?? 0), low: r?.low ?? 0, out: r?.out ?? 0 };
}

export async function adjustStock(actor: AdminSessionUser, variantId: string, delta: number, reason: string, note: string) {
  if (!Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 100_000) return false;
  const [row] = await db.update(productVariants).set({ stock: sql`greatest(0, ${productVariants.stock} + ${delta})`, updatedAt: new Date() }).where(eq(productVariants.id, variantId)).returning({ id: productVariants.id, stock: productVariants.stock });
  if (!row) return false;
  await db.insert(inventoryMovements).values({ variantId, delta, reason, note: note || null });
  await recordAudit(null, actor, { action: "inventory.adjust", entity: "product_variant", entityId: variantId, summary: `Stock ${delta > 0 ? "+" : ""}${delta} (${reason}) → ${row.stock}`, after: { delta, reason, note, stock: row.stock } });
  return true;
}

/** Absolute target stock: derives the delta from the current value, then records it like any other change. */
export async function setStock(actor: AdminSessionUser, variantId: string, value: number, reason: string, note: string) {
  const [cur] = await db.select({ stock: productVariants.stock }).from(productVariants).where(eq(productVariants.id, variantId)).limit(1);
  if (!cur) return false;
  const delta = value - cur.stock;
  if (delta === 0) return true; // already at the target — nothing to record
  return adjustStock(actor, variantId, delta, reason, note);
}

export async function listMovements(variantId: string) {
  return db.select().from(inventoryMovements).where(eq(inventoryMovements.variantId, variantId)).orderBy(desc(inventoryMovements.createdAt)).limit(30);
}
