import { and, asc, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db/client";
import { addresses, categories, collections, couponUsages, coupons, customers, notifications, orderEvents, orders, products, reviews } from "@/db/schema";
import type { OrderStatus } from "@/db/schema";
import type { AdminSessionUser } from "@/server/auth/admin-session";
import { recordAudit } from "./audit";

/* ───────── orders ───────── */

const PAGE = 20;

/** Allowed next states. Cancelled and returned are terminal; nothing is silently rewound. */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["shipped", "cancelled"],
  shipped: ["delivered", "returned"],
  delivered: ["returned"],
  cancelled: [],
  returned: [],
};

export const canTransition = (from: OrderStatus, to: OrderStatus) => ORDER_TRANSITIONS[from].includes(to);

const ORDER_STATUSES = Object.keys(ORDER_TRANSITIONS) as OrderStatus[];
const PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded"] as const;
const escapeLike = (q: string) => `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

export async function listOrdersAdmin(f: { q?: string; status?: string; payment?: string; page: number }) {
  const conds: (SQL | undefined)[] = [];
  const q = f.q?.trim().slice(0, 80);
  if (q) {
    const like = escapeLike(q);
    const seqNum = Number(q.replace(/^MLK-/i, ""));
    conds.push(
      or(ilike(orders.name, like), ilike(orders.phone, like), ilike(orders.email, like), ilike(orders.city, like), Number.isFinite(seqNum) && seqNum > 0 ? eq(orders.seq, seqNum) : undefined),
    );
  }
  if (f.status && ORDER_STATUSES.includes(f.status as OrderStatus)) conds.push(eq(orders.status, f.status as OrderStatus));
  if (f.payment && PAYMENT_STATUSES.includes(f.payment as (typeof PAYMENT_STATUSES)[number])) conds.push(eq(orders.paymentStatus, f.payment as "pending"));
  const where = conds.length ? and(...conds) : undefined;

  const [{ total } = { total: 0 }] = await db.select({ total: count() }).from(orders).where(where);
  const rows = await db
    // The outer key is written out ("order"."id"): ${orders.id} renders bare here and would bind to the inner row's id.
    .select({ o: orders, itemCount: sql<number>`(select coalesce(sum(i.quantity),0)::int from order_item i where i.order_id = "order"."id")` })
    .from(orders)
    .where(where)
    .orderBy(desc(orders.createdAt))
    .limit(PAGE)
    .offset((f.page - 1) * PAGE);
  return { rows, total, pages: Math.max(1, Math.ceil(total / PAGE)) };
}

export const getOrderAdmin = (id: string) =>
  db.query.orders.findFirst({ where: eq(orders.id, id), with: { items: true, events: { orderBy: [asc(orderEvents.createdAt)] }, customer: true } });

export type OrderAdmin = NonNullable<Awaited<ReturnType<typeof getOrderAdmin>>>;

const STATUS_TITLES: Record<OrderStatus, { ar: string; en: string }> = {
  pending: { ar: "تم استلام طلبك", en: "Order received" },
  confirmed: { ar: "تم تأكيد طلبك", en: "Order confirmed" },
  preparing: { ar: "طلبك قيد التحضير", en: "Order is being prepared" },
  shipped: { ar: "طلبك في الطريق إليك", en: "Your order has shipped" },
  delivered: { ar: "تم تسليم طلبك", en: "Order delivered" },
  cancelled: { ar: "تم إلغاء طلبك", en: "Order cancelled" },
  returned: { ar: "تم استلام إرجاع طلبك", en: "Return received" },
};

/** Changes the order status, appends to the timeline and tells the customer. */
export async function updateOrderStatus(actor: AdminSessionUser, orderId: string, to: OrderStatus, note: string) {
  const before = await getOrderAdmin(orderId);
  if (!before) return { ok: false as const, code: "not_found" as const };
  if (before.status === to) return { ok: false as const, code: "same" as const };
  if (!canTransition(before.status, to)) return { ok: false as const, code: "invalid" as const };

  const title = STATUS_TITLES[to];
  await db.transaction(async (tx) => {
    await tx.update(orders).set({ status: to, updatedAt: new Date() }).where(eq(orders.id, orderId));
    await tx.insert(orderEvents).values({ orderId, status: to, note: note || null });
    if (before.customerId) {
      await tx.insert(notifications).values({
        audience: "customer",
        customerId: before.customerId,
        kind: `order_${to}`,
        titleAr: title.ar,
        titleEn: title.en,
        bodyAr: `طلب رقم MLK-${before.seq}`,
        bodyEn: `Order MLK-${before.seq}`,
        href: `/account/orders/MLK-${before.seq}`,
      });
    }
  });

  await recordAudit(null, actor, {
    action: "order.status",
    entity: "order",
    entityId: orderId,
    summary: `Order MLK-${before.seq}: ${before.status} → ${to}${note ? ` — ${note}` : ""}`,
    before: { status: before.status },
    after: { status: to, note: note || null },
  });
  return { ok: true as const };
}

export async function updatePaymentStatus(actor: AdminSessionUser, orderId: string, to: "pending" | "paid" | "failed" | "refunded") {
  const before = await getOrderAdmin(orderId);
  if (!before) return false;
  await db.update(orders).set({ paymentStatus: to, updatedAt: new Date() }).where(eq(orders.id, orderId));
  await recordAudit(null, actor, {
    action: "order.payment",
    entity: "order",
    entityId: orderId,
    summary: `Order MLK-${before.seq}: payment ${before.paymentStatus} → ${to}`,
    before: { paymentStatus: before.paymentStatus },
    after: { paymentStatus: to },
  });
  return true;
}

export async function setInternalNote(actor: AdminSessionUser, orderId: string, note: string) {
  const before = await getOrderAdmin(orderId);
  if (!before) return false;
  const value = note.trim().slice(0, 2000) || null;
  await db.update(orders).set({ internalNote: value, updatedAt: new Date() }).where(eq(orders.id, orderId));
  await recordAudit(null, actor, {
    action: "order.note",
    entity: "order",
    entityId: orderId,
    summary: `Updated internal note on MLK-${before.seq}`,
    before: { internalNote: before.internalNote },
    after: { internalNote: value },
  });
  return true;
}

/* ───────── customers ───────── */

export async function listCustomersAdmin(f: { q?: string; page: number }) {
  const conds: (SQL | undefined)[] = [];
  const q = f.q?.trim().slice(0, 80);
  if (q) {
    const like = escapeLike(q);
    conds.push(or(ilike(customers.name, like), ilike(customers.email, like), ilike(customers.phone, like)));
  }
  const where = conds.length ? and(...conds) : undefined;

  const [{ total } = { total: 0 }] = await db.select({ total: count() }).from(customers).where(where);
  const rows = await db
    .select({
      c: customers,
      // "order" is a reserved word and the subqueries live in their own scope, so both the table
      // and the correlated outer key are written out explicitly (drizzle renders ${customers.id} bare).
      orderCount: sql<number>`(select count(*)::int from "order" o where o.customer_id = "customer"."id" and o.status not in ('cancelled','returned'))`,
      totalSpent: sql<number>`(select coalesce(sum(o.total_minor),0)::bigint::float8 from "order" o where o.customer_id = "customer"."id" and o.status not in ('cancelled','returned'))`,
      lastOrderAt: sql<Date | null>`(select max(o.created_at) from "order" o where o.customer_id = "customer"."id")`,
    })
    .from(customers)
    .where(where)
    .orderBy(desc(customers.createdAt))
    .limit(PAGE)
    .offset((f.page - 1) * PAGE);
  return { rows, total, pages: Math.max(1, Math.ceil(total / PAGE)) };
}

export const getCustomerAdmin = (id: string) =>
  db.query.customers.findFirst({
    where: eq(customers.id, id),
    with: {
      addresses: { orderBy: [desc(addresses.createdAt)] },
      orders: { orderBy: [desc(orders.createdAt)], limit: 50 },
      wishlist: { with: { product: true } },
    },
  });

export type CustomerAdmin = NonNullable<Awaited<ReturnType<typeof getCustomerAdmin>>>;

/* ───────── reviews ───────── */

export async function listReviewsAdmin(f: { q?: string; status?: string; rating?: string; page: number }) {
  const conds: (SQL | undefined)[] = [];
  const q = f.q?.trim().slice(0, 80);
  if (q) {
    const like = escapeLike(q);
    conds.push(or(ilike(reviews.name, like), ilike(reviews.body, like), ilike(products.nameEn, like), ilike(products.nameAr, like)));
  }
  if (f.status && ["pending", "approved", "rejected"].includes(f.status)) conds.push(eq(reviews.status, f.status as "pending"));
  const rating = Number(f.rating);
  if (rating >= 1 && rating <= 5) conds.push(eq(reviews.rating, rating));
  const where = conds.length ? and(...conds) : undefined;

  const [{ total } = { total: 0 }] = await db.select({ total: count() }).from(reviews).innerJoin(products, eq(products.id, reviews.productId)).where(where);
  const rows = await db
    .select({ r: reviews, productNameAr: products.nameAr, productNameEn: products.nameEn, productSlug: products.slug, customerEmail: customers.email })
    .from(reviews)
    .innerJoin(products, eq(products.id, reviews.productId))
    .leftJoin(customers, eq(customers.id, reviews.customerId))
    .where(where)
    .orderBy(desc(reviews.createdAt))
    .limit(PAGE)
    .offset((f.page - 1) * PAGE);
  return { rows, total, pages: Math.max(1, Math.ceil(total / PAGE)) };
}

export type ReviewAction = "approve" | "reject" | "feature" | "unfeature" | "delete";

export async function moderateReview(actor: AdminSessionUser, id: string, action: ReviewAction) {
  const [row] = await db
    .select({ r: reviews, product: products.nameEn })
    .from(reviews)
    .innerJoin(products, eq(products.id, reviews.productId))
    .where(eq(reviews.id, id))
    .limit(1);
  if (!row) return false;

  if (action === "delete") {
    await db.delete(reviews).where(eq(reviews.id, id));
    await recordAudit(null, actor, { action: "review.delete", entity: "review", entityId: id, summary: `Deleted review by ${row.r.name} on ${row.product}`, before: { name: row.r.name, rating: row.r.rating, body: row.r.body.slice(0, 200) } });
    return true;
  }

  const patch = action === "approve" ? { status: "approved" as const } : action === "reject" ? { status: "rejected" as const } : { featured: action === "feature" };
  await db.update(reviews).set({ ...patch, updatedAt: new Date() }).where(eq(reviews.id, id));
  await recordAudit(null, actor, {
    action: `review.${action}`,
    entity: "review",
    entityId: id,
    summary: `${action} review by ${row.r.name} on ${row.product}`,
    before: { status: row.r.status, featured: row.r.featured },
    after: { ...patch },
  });
  return true;
}

/* ───────── coupons ───────── */

export async function listCouponsAdmin(f: { q?: string; page: number }) {
  const conds: (SQL | undefined)[] = [];
  const q = f.q?.trim().slice(0, 60);
  if (q) {
    const like = escapeLike(q);
    conds.push(or(ilike(coupons.code, like), ilike(coupons.descriptionEn, like), ilike(coupons.descriptionAr, like)));
  }
  const where = conds.length ? and(...conds) : undefined;

  const [{ total } = { total: 0 }] = await db.select({ total: count() }).from(coupons).where(where);
  const rows = await db.select().from(coupons).where(where).orderBy(desc(coupons.createdAt)).limit(PAGE).offset((f.page - 1) * PAGE);
  return { rows, total, pages: Math.max(1, Math.ceil(total / PAGE)) };
}

export const getCouponAdmin = (id: string) => db.query.coupons.findFirst({ where: eq(coupons.id, id) });

export type CouponInput = {
  code: string;
  type: "percent" | "fixed";
  value: number;
  descriptionAr: string;
  descriptionEn: string;
  minOrderMinor: number | null;
  maxDiscountMinor: number | null;
  startsAt: string;
  expiresAt: string;
  usageLimit: number | null;
  perCustomerLimit: number | null;
  active: boolean;
  productIds: string[];
  categoryIds: string[];
  collectionIds: string[];
};

export async function saveCoupon(actor: AdminSessionUser, id: string | null, input: CouponInput) {
  const values = {
    code: input.code.trim().toUpperCase(),
    type: input.type,
    value: input.value,
    descriptionAr: input.descriptionAr || null,
    descriptionEn: input.descriptionEn || null,
    minOrderMinor: input.minOrderMinor,
    maxDiscountMinor: input.maxDiscountMinor,
    startsAt: input.startsAt ? new Date(input.startsAt) : null,
    expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    usageLimit: input.usageLimit,
    perCustomerLimit: input.perCustomerLimit,
    active: input.active,
    productIds: input.productIds,
    categoryIds: input.categoryIds,
    collectionIds: input.collectionIds,
    updatedAt: new Date(),
  };
  let cid: string;
  if (id) {
    const [row] = await db.update(coupons).set(values).where(eq(coupons.id, id)).returning({ id: coupons.id });
    cid = row!.id;
  } else {
    const [row] = await db.insert(coupons).values(values).returning({ id: coupons.id });
    cid = row!.id;
  }
  await recordAudit(null, actor, {
    action: id ? "coupon.update" : "coupon.create",
    entity: "coupon",
    entityId: cid,
    summary: `${id ? "Updated" : "Created"} coupon ${values.code}`,
    after: { code: values.code, type: values.type, value: values.value, active: values.active },
  });
  return cid;
}

export async function deleteCoupon(actor: AdminSessionUser, id: string) {
  // What the customer paid stays on the order; only the definition is removed.
  const [row] = await db.delete(coupons).where(eq(coupons.id, id)).returning({ code: coupons.code, usedCount: coupons.usedCount });
  if (row) await recordAudit(null, actor, { action: "coupon.delete", entity: "coupon", entityId: id, summary: `Deleted coupon ${row.code}`, before: { code: row.code, usedCount: row.usedCount } });
  return !!row;
}

export async function toggleCoupon(actor: AdminSessionUser, id: string, active: boolean) {
  const [row] = await db.update(coupons).set({ active, updatedAt: new Date() }).where(eq(coupons.id, id)).returning({ code: coupons.code, active: coupons.active });
  if (!row) return false;
  await recordAudit(null, actor, { action: "coupon.toggle", entity: "coupon", entityId: id, summary: `${active ? "Activated" : "Deactivated"} coupon ${row.code}`, after: { active } });
  return true;
}

/** Real usage count (rows), which is authoritative over the denormalised `usedCount`. */
export async function couponUsageCounts() {
  const rows = await db.select({ id: coupons.id, uses: count(couponUsages.id) }).from(coupons).leftJoin(couponUsages, eq(couponUsages.couponId, coupons.id)).groupBy(coupons.id);
  return new Map(rows.map((r) => [r.id, r.uses]));
}

/** Options for the coupon restriction pickers (labels only). */
export async function couponRestrictionOptions() {
  const [cats, cols, prods] = await Promise.all([
    db.select({ id: categories.id, nameEn: categories.nameEn }).from(categories).orderBy(categories.nameEn).limit(100),
    db.select({ id: collections.id, nameEn: collections.nameEn }).from(collections).orderBy(collections.nameEn).limit(100),
    db.select({ id: products.id, nameEn: products.nameEn, nameAr: products.nameAr }).from(products).orderBy(desc(products.createdAt)).limit(300),
  ]);
  return { categories: cats, collections: cols, products: prods };
}
