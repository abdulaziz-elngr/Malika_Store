import { relations } from "drizzle-orm";
import { boolean, index, integer, pgEnum, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { productVariants, products } from "./catalog";

export const orderStatusEnum = pgEnum("order_status", ["pending", "confirmed", "preparing", "shipped", "delivered", "cancelled", "returned"]);
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "paid", "failed", "refunded"]);
export const couponTypeEnum = pgEnum("coupon_type", ["percent", "fixed"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const customers = pgTable(
  "customer",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(), // always stored lower-cased
    passwordHash: text("password_hash").notNull(),
    name: text("name").notNull(),
    phone: text("phone"),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex("customer_email_idx").on(t.email)],
);

export const customerSessions = pgTable(
  "customer_session",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(), // sha-256 of the cookie token; the raw token is never stored
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ip: text("ip"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("session_token_idx").on(t.tokenHash), index("session_customer_idx").on(t.customerId)],
);

export const addresses = pgTable(
  "address",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
    label: text("label"),
    recipient: text("recipient").notNull(),
    phone: text("phone").notNull(),
    governorate: text("governorate").notNull(),
    city: text("city").notNull(),
    line1: text("line1").notNull(),
    line2: text("line2"),
    notes: text("notes"),
    isDefault: boolean("is_default").notNull().default(false),
    ...timestamps,
  },
  (t) => [index("address_customer_idx").on(t.customerId)],
);

export const wishlistItems = pgTable(
  "wishlist_item",
  {
    customerId: uuid("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
    productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.customerId, t.productId] }), index("wishlist_product_idx").on(t.productId)],
);

export const coupons = pgTable(
  "coupon",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull(), // stored upper-cased
    type: couponTypeEnum("type").notNull(),
    value: integer("value").notNull(), // percent (1-100) or fixed amount in minor units
    descriptionAr: text("description_ar"),
    descriptionEn: text("description_en"),
    minOrderMinor: integer("min_order_minor"),
    maxDiscountMinor: integer("max_discount_minor"),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    usageLimit: integer("usage_limit"),
    perCustomerLimit: integer("per_customer_limit"),
    usedCount: integer("used_count").notNull().default(0),
    active: boolean("active").notNull().default(true),
    // Restrictions: when any list is non-empty the discount applies only to matching items.
    productIds: uuid("product_ids").array().notNull().default([]),
    categoryIds: uuid("category_ids").array().notNull().default([]),
    collectionIds: uuid("collection_ids").array().notNull().default([]),
    ...timestamps,
  },
  (t) => [uniqueIndex("coupon_code_idx").on(t.code)],
);

export const orders = pgTable(
  "order",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Human order number is MLK-<seq>; the identity column keeps it unique and gap-tolerant under concurrency.
    seq: integer("seq").notNull().generatedAlwaysAsIdentity({ startWith: 10291 }),
    customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
    email: text("email").notNull(),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    governorate: text("governorate").notNull(),
    city: text("city").notNull(),
    line1: text("line1").notNull(),
    line2: text("line2"),
    notes: text("notes"),
    internalNote: text("internal_note"),
    deliveryMethod: text("delivery_method").notNull(),
    paymentMethod: text("payment_method").notNull(),
    paymentStatus: paymentStatusEnum("payment_status").notNull().default("pending"),
    paymentReference: text("payment_reference"),
    status: orderStatusEnum("status").notNull().default("pending"),
    subtotalMinor: integer("subtotal_minor").notNull(),
    shippingMinor: integer("shipping_minor").notNull(),
    discountMinor: integer("discount_minor").notNull().default(0),
    totalMinor: integer("total_minor").notNull(),
    couponId: uuid("coupon_id").references(() => coupons.id, { onDelete: "set null" }),
    couponCode: text("coupon_code"),
    locale: text("locale").notNull().default("ar"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("order_seq_idx").on(t.seq),
    index("order_customer_idx").on(t.customerId, t.createdAt),
    index("order_phone_idx").on(t.phone),
    index("order_status_idx").on(t.status, t.createdAt),
  ],
);

export const orderItems = pgTable(
  "order_item",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
    // Snapshot of what the customer bought, so history survives later catalogue edits.
    slug: text("slug").notNull(),
    nameAr: text("name_ar").notNull(),
    nameEn: text("name_en").notNull(),
    sku: text("sku").notNull(),
    size: text("size").notNull(),
    colorNameAr: text("color_name_ar").notNull(),
    colorNameEn: text("color_name_en").notNull(),
    colorHex: text("color_hex").notNull(),
    imageUrl: text("image_url"),
    tone: text("tone").notNull().default("wine"),
    unitPriceMinor: integer("unit_price_minor").notNull(),
    quantity: integer("quantity").notNull(),
    lineTotalMinor: integer("line_total_minor").notNull(),
  },
  (t) => [index("order_item_order_idx").on(t.orderId), index("order_item_variant_idx").on(t.variantId)],
);

export const orderEvents = pgTable(
  "order_event",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    status: orderStatusEnum("status").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("order_event_order_idx").on(t.orderId, t.createdAt)],
);

export const couponUsages = pgTable(
  "coupon_usage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    couponId: uuid("coupon_id").notNull().references(() => coupons.id, { onDelete: "cascade" }),
    orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
    email: text("email").notNull(),
    discountMinor: integer("discount_minor").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("coupon_usage_coupon_idx").on(t.couponId, t.email)],
);

export const notifications = pgTable(
  "notification",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    audience: text("audience").notNull().default("customer"), // customer | admin (admin feed arrives in a later phase)
    customerId: uuid("customer_id").references(() => customers.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // order_confirmed | order_shipped | order_delivered | order_cancelled | …
    titleAr: text("title_ar").notNull(),
    titleEn: text("title_en").notNull(),
    bodyAr: text("body_ar"),
    bodyEn: text("body_en"),
    href: text("href"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("notification_customer_idx").on(t.customerId, t.createdAt)],
);

export const customerRelations = relations(customers, ({ many }) => ({
  addresses: many(addresses),
  orders: many(orders),
  wishlist: many(wishlistItems),
}));
export const addressRelations = relations(addresses, ({ one }) => ({ customer: one(customers, { fields: [addresses.customerId], references: [customers.id] }) }));
export const wishlistRelations = relations(wishlistItems, ({ one }) => ({
  customer: one(customers, { fields: [wishlistItems.customerId], references: [customers.id] }),
  product: one(products, { fields: [wishlistItems.productId], references: [products.id] }),
}));
export const orderRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, { fields: [orders.customerId], references: [customers.id] }),
  items: many(orderItems),
  events: many(orderEvents),
}));
export const orderItemRelations = relations(orderItems, ({ one }) => ({ order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }) }));
export const orderEventRelations = relations(orderEvents, ({ one }) => ({ order: one(orders, { fields: [orderEvents.orderId], references: [orders.id] }) }));

export type OrderStatus = (typeof orderStatusEnum.enumValues)[number];
