import { relations } from "drizzle-orm";
import { boolean, index, integer, pgEnum, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const genderEnum = pgEnum("gender", ["women", "men", "unisex"]);
export const productStatusEnum = pgEnum("product_status", ["draft", "published", "archived"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const categories = pgTable(
  "category",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    nameAr: text("name_ar").notNull(),
    nameEn: text("name_en").notNull(),
    descriptionAr: text("description_ar"),
    descriptionEn: text("description_en"),
    imageUrl: text("image_url"),
    tone: text("tone").notNull().default("wine"),
    parentId: uuid("parent_id"),
    sortOrder: integer("sort_order").notNull().default(0),
    visible: boolean("visible").notNull().default(true),
    seoTitleAr: text("seo_title_ar"),
    seoTitleEn: text("seo_title_en"),
    seoDescriptionAr: text("seo_description_ar"),
    seoDescriptionEn: text("seo_description_en"),
    ...timestamps,
  },
  (t) => [uniqueIndex("category_slug_idx").on(t.slug), index("category_parent_idx").on(t.parentId)],
);

export const collections = pgTable(
  "collection",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    nameAr: text("name_ar").notNull(),
    nameEn: text("name_en").notNull(),
    descriptionAr: text("description_ar"),
    descriptionEn: text("description_en"),
    coverUrl: text("cover_url"),
    bannerUrl: text("banner_url"),
    tone: text("tone").notNull().default("wine"),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    visible: boolean("visible").notNull().default(true),
    seoTitleAr: text("seo_title_ar"),
    seoTitleEn: text("seo_title_en"),
    seoDescriptionAr: text("seo_description_ar"),
    seoDescriptionEn: text("seo_description_en"),
    ...timestamps,
  },
  (t) => [uniqueIndex("collection_slug_idx").on(t.slug)],
);

export const products = pgTable(
  "product",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    sku: text("sku").notNull(),
    nameAr: text("name_ar").notNull(),
    nameEn: text("name_en").notNull(),
    shortAr: text("short_ar"),
    shortEn: text("short_en"),
    descriptionAr: text("description_ar"),
    descriptionEn: text("description_en"),
    materialsAr: text("materials_ar"),
    materialsEn: text("materials_en"),
    careAr: text("care_ar"),
    careEn: text("care_en"),
    // Money is stored in minor units (piastres) to avoid float errors.
    priceMinor: integer("price_minor").notNull(),
    salePriceMinor: integer("sale_price_minor"),
    costMinor: integer("cost_minor"),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    gender: genderEnum("gender").notNull().default("women"),
    status: productStatusEnum("status").notNull().default("draft"),
    featured: boolean("featured").notNull().default(false),
    isNew: boolean("is_new").notNull().default(false),
    bestSeller: boolean("best_seller").notNull().default(false),
    soldCount: integer("sold_count").notNull().default(0),
    weightGrams: integer("weight_grams"),
    tags: text("tags").array().notNull().default([]),
    videoUrl: text("video_url"),
    seoTitleAr: text("seo_title_ar"),
    seoTitleEn: text("seo_title_en"),
    seoDescriptionAr: text("seo_description_ar"),
    seoDescriptionEn: text("seo_description_en"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("product_slug_idx").on(t.slug),
    uniqueIndex("product_sku_idx").on(t.sku),
    index("product_category_idx").on(t.categoryId),
    index("product_status_gender_idx").on(t.status, t.gender),
  ],
);

export const productCollections = pgTable(
  "product_collection",
  {
    productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    collectionId: uuid("collection_id").notNull().references(() => collections.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.productId, t.collectionId] }), index("pc_collection_idx").on(t.collectionId)],
);

export const productImages = pgTable(
  "product_image",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    url: text("url"), // null until a real photo is uploaded; tone is the on-brand fallback panel
    tone: text("tone").notNull().default("wine"),
    altAr: text("alt_ar"),
    altEn: text("alt_en"),
    colorHex: text("color_hex"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("product_image_product_idx").on(t.productId, t.sortOrder)],
);

export const productVariants = pgTable(
  "product_variant",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    sku: text("sku").notNull(),
    size: text("size").notNull(),
    colorNameAr: text("color_name_ar").notNull(),
    colorNameEn: text("color_name_en").notNull(),
    colorHex: text("color_hex").notNull(),
    priceMinor: integer("price_minor"), // optional override of the product price
    stock: integer("stock").notNull().default(0),
    imageId: uuid("image_id").references(() => productImages.id, { onDelete: "set null" }),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (t) => [uniqueIndex("variant_sku_idx").on(t.sku), index("variant_product_idx").on(t.productId)],
);

export const inventoryMovements = pgTable(
  "inventory_movement",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    variantId: uuid("variant_id").notNull().references(() => productVariants.id, { onDelete: "cascade" }),
    delta: integer("delta").notNull(),
    reason: text("reason").notNull(), // initial | sale | return | adjustment | damage
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("movement_variant_idx").on(t.variantId, t.createdAt)],
);

export const categoryRelations = relations(categories, ({ many }) => ({ products: many(products) }));
export const productRelations = relations(products, ({ one, many }) => ({
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  images: many(productImages),
  variants: many(productVariants),
  collections: many(productCollections),
}));
export const productImageRelations = relations(productImages, ({ one }) => ({ product: one(products, { fields: [productImages.productId], references: [products.id] }) }));
export const variantRelations = relations(productVariants, ({ one }) => ({ product: one(products, { fields: [productVariants.productId], references: [products.id] }) }));
export const collectionRelations = relations(collections, ({ many }) => ({ products: many(productCollections) }));
export const productCollectionRelations = relations(productCollections, ({ one }) => ({
  product: one(products, { fields: [productCollections.productId], references: [products.id] }),
  collection: one(collections, { fields: [productCollections.collectionId], references: [collections.id] }),
}));
