import { relations } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { adminUsers } from "./admin";
import { customers } from "./commerce";
import { products as catalogProducts } from "./catalog";

export const reviewStatusEnum = pgEnum("review_status", ["pending", "approved", "rejected"]);
export const mediaKindEnum = pgEnum("media_kind", ["image", "video"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

/** Product reviews. Only "approved" rows are shown on the storefront. */
export const reviews = pgTable(
  "review",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id").notNull().references(() => catalogProducts.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    email: text("email"),
    rating: integer("rating").notNull(), // 1–5
    body: text("body").notNull(),
    status: reviewStatusEnum("status").notNull().default("pending"),
    featured: boolean("featured").notNull().default(false),
    ...timestamps,
  },
  (t) => [index("review_product_idx").on(t.productId, t.status), index("review_status_idx").on(t.status, t.createdAt)],
);

/** Promotional banners shown on the storefront. */
export const banners = pgTable(
  "banner",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    titleAr: text("title_ar").notNull(),
    titleEn: text("title_en").notNull(),
    bodyAr: text("body_ar"),
    bodyEn: text("body_en"),
    imageUrl: text("image_url"),
    mobileImageUrl: text("mobile_image_url"),
    ctaLabelAr: text("cta_label_ar"),
    ctaLabelEn: text("cta_label_en"),
    href: text("href"),
    position: text("position").notNull().default("home"), // home | promo | strip
    tone: text("tone").notNull().default("wine"),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    visible: boolean("visible").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (t) => [index("banner_position_idx").on(t.position, t.visible)],
);

/**
 * CMS rows of the homepage: one row per section, ordered and toggled from the admin.
 * `config` holds the section's bilingual copy, images, links, animation and layout options.
 */
export const homepageSections = pgTable(
  "homepage_section",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: text("key").notNull(), // hero | marquee | new_collection | categories | editorial | lookbook | best_sellers | banner | testimonials | newsletter
    enabled: boolean("enabled").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    config: jsonb("config").notNull().default({}),
    ...timestamps,
  },
  (t) => [uniqueIndex("homepage_section_key_idx").on(t.key)],
);

/** CMS pages: about, contact, faq, privacy, terms… fully editable without code. */
export const pages = pgTable(
  "page",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    titleAr: text("title_ar").notNull(),
    titleEn: text("title_en").notNull(),
    bodyAr: text("body_ar").notNull().default(""),
    bodyEn: text("body_en").notNull().default(""),
    visible: boolean("visible").notNull().default(true),
    seoTitleAr: text("seo_title_ar"),
    seoTitleEn: text("seo_title_en"),
    seoDescriptionAr: text("seo_description_ar"),
    seoDescriptionEn: text("seo_description_en"),
    ...timestamps,
  },
  (t) => [uniqueIndex("page_slug_idx").on(t.slug)],
);

/** Header / footer menus, editable from the admin. */
export const navigationItems = pgTable(
  "navigation_item",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    menu: text("menu").notNull().default("header"), // header | footer
    labelAr: text("label_ar").notNull(),
    labelEn: text("label_en").notNull(),
    href: text("href").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    visible: boolean("visible").notNull().default(true),
    ...timestamps,
  },
  (t) => [index("navigation_menu_idx").on(t.menu, t.sortOrder)],
);

/** Central media library. Files live under public/uploads; this row is the catalogue entry. */
export const media = pgTable(
  "media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    url: text("url").notNull(),
    kind: mediaKindEnum("kind").notNull().default("image"),
    name: text("name").notNull(),
    folder: text("folder").notNull().default("/"),
    altAr: text("alt_ar"),
    altEn: text("alt_en"),
    width: integer("width"),
    height: integer("height"),
    sizeBytes: integer("size_bytes"),
    createdById: uuid("created_by").references(() => adminUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("media_folder_idx").on(t.folder), index("media_created_idx").on(t.createdAt)],
);

/** Newsletter subscribers captured by the storefront. */
export const newsletterSubscribers = pgTable(
  "newsletter_subscriber",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    source: text("source").notNull().default("footer"),
    locale: text("locale").notNull().default("ar"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("newsletter_email_idx").on(t.email)],
);

export const reviewRelations = relations(reviews, ({ one }) => ({
  product: one(catalogProducts, { fields: [reviews.productId], references: [catalogProducts.id] }),
  customer: one(customers, { fields: [reviews.customerId], references: [customers.id] }),
}));

export type Review = typeof reviews.$inferSelect;
export type Banner = typeof banners.$inferSelect;
export type HomepageSection = typeof homepageSections.$inferSelect;
export type Page = typeof pages.$inferSelect;
export type NavigationItem = typeof navigationItems.$inferSelect;
export type MediaItem = typeof media.$inferSelect;
