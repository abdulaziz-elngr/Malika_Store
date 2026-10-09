import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { and, asc, count, desc, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { categories, customers, orderItems, orders, productVariants, products, storefrontVisits } from "@/db/schema";
import { deltaPercent, type ResolvedRange } from "@/lib/date-range";
import type { AdminSessionUser } from "@/server/auth/admin-session";
import { can } from "@/server/auth/rbac";
import { formatOrderNumber } from "./orders";

export const LOW_STOCK_THRESHOLD = 5; // moves to admin settings with the inventory screens (Phase 7)

/** "Valid" orders count towards revenue: everything except cancelled and returned ones. */
const valid = sql`${orders.status} not in ('cancelled','returned')`;
const cairoDayOf = (col: AnyPgColumn) => sql<string>`to_char(${col} at time zone 'Africa/Cairo', 'YYYY-MM-DD')`;

type Window = { from: Date; to: Date };
const inWindow = (col: AnyPgColumn, w: Window) => and(gte(col, w.from), lt(col, w.to));

async function salesTotals(w: Window) {
  const [r] = await db
    .select({
      placed: count(),
      valid: sql<number>`count(*) filter (where ${valid})::int`,
      lost: sql<number>`count(*) filter (where not (${valid}))::int`,
      revenue: sql<number>`coalesce(sum(${orders.totalMinor}) filter (where ${valid}), 0)::bigint::float8`,
    })
    .from(orders)
    .where(inWindow(orders.createdAt, w));
  const [v] = await db.select({ n: sql<number>`count(distinct ${storefrontVisits.visitorId})::int` }).from(storefrontVisits).where(and(gte(storefrontVisits.createdAt, w.from), lt(storefrontVisits.createdAt, w.to)));
  const revenue = Number(r?.revenue ?? 0);
  const validOrders = r?.valid ?? 0;
  const visitors = v?.n ?? 0;
  return {
    placed: r?.placed ?? 0,
    validOrders,
    lost: r?.lost ?? 0,
    revenue,
    aov: validOrders ? Math.round(revenue / validOrders) : 0,
    visitors,
    conversion: visitors ? Math.round((validOrders / visitors) * 10000) / 100 : null,
  };
}

async function newCustomers(w: Window) {
  const [r] = await db.select({ n: count() }).from(customers).where(inWindow(customers.createdAt, w));
  return r?.n ?? 0;
}

async function dailySeries(range: ResolvedRange) {
  const day = cairoDayOf(orders.createdAt);
  const rows = await db
    .select({ day, orders: sql<number>`count(*)::int`, revenue: sql<number>`coalesce(sum(${orders.totalMinor}),0)::bigint::float8` })
    .from(orders)
    .where(and(inWindow(orders.createdAt, range), valid))
    .groupBy(day);
  const byDay = new Map(rows.map((r) => [r.day, r]));
  // Fill empty days with zeros and group into 1- or 7-day buckets so the chart never has gaps.
  const out: { day: string; orders: number; revenue: number }[] = [];
  range.days.forEach((d, i) => {
    const r = byDay.get(d);
    const b = Math.floor(i / range.step);
    out[b] ??= { day: d, orders: 0, revenue: 0 };
    out[b]!.orders += r?.orders ?? 0;
    out[b]!.revenue += Number(r?.revenue ?? 0);
  });
  return out;
}

async function topProducts(range: ResolvedRange) {
  return db
    .select({
      slug: orderItems.slug, nameAr: sql<string>`max(${orderItems.nameAr})`, nameEn: sql<string>`max(${orderItems.nameEn})`,
      units: sql<number>`sum(${orderItems.quantity})::int`, revenue: sql<number>`sum(${orderItems.lineTotalMinor})::bigint::float8`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(and(inWindow(orders.createdAt, range), valid))
    .groupBy(orderItems.slug)
    .orderBy(desc(sql`sum(${orderItems.quantity})`), desc(sql`sum(${orderItems.lineTotalMinor})`))
    .limit(5);
}

async function topCategories(range: ResolvedRange) {
  return db
    .select({ id: categories.id, nameAr: categories.nameAr, nameEn: categories.nameEn, units: sql<number>`sum(${orderItems.quantity})::int`, revenue: sql<number>`sum(${orderItems.lineTotalMinor})::bigint::float8` })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .innerJoin(products, eq(products.id, orderItems.productId))
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .where(and(inWindow(orders.createdAt, range), valid))
    .groupBy(categories.id, categories.nameAr, categories.nameEn)
    .orderBy(desc(sql`sum(${orderItems.lineTotalMinor})`))
    .limit(5);
}

async function stockHealth() {
  const base = and(eq(products.status, "published"));
  const [[c], rows] = await Promise.all([
    db
      .select({
        low: sql<number>`count(*) filter (where ${productVariants.stock} > 0 and ${productVariants.stock} <= ${LOW_STOCK_THRESHOLD})::int`,
        out: sql<number>`count(*) filter (where ${productVariants.stock} = 0)::int`,
        units: sql<number>`coalesce(sum(${productVariants.stock}),0)::int`,
      })
      .from(productVariants).innerJoin(products, eq(products.id, productVariants.productId)).where(base),
    db
      .select({ productId: products.id, slug: products.slug, nameAr: products.nameAr, nameEn: products.nameEn, size: productVariants.size, colorAr: productVariants.colorNameAr, colorEn: productVariants.colorNameEn, stock: productVariants.stock })
      .from(productVariants).innerJoin(products, eq(products.id, productVariants.productId))
      .where(and(base, sql`${productVariants.stock} <= ${LOW_STOCK_THRESHOLD}`))
      .orderBy(asc(productVariants.stock), asc(products.nameEn)).limit(60),
  ]);
  const grouped = new Map<string, { slug: string; nameAr: string; nameEn: string; variants: { size: string; colorAr: string; colorEn: string; stock: number }[] }>();
  for (const r of rows) {
    const g = grouped.get(r.productId) ?? { slug: r.slug, nameAr: r.nameAr, nameEn: r.nameEn, variants: [] };
    g.variants.push({ size: r.size, colorAr: r.colorAr, colorEn: r.colorEn, stock: r.stock });
    grouped.set(r.productId, g);
  }
  return { lowVariants: c?.low ?? 0, outVariants: c?.out ?? 0, units: c?.units ?? 0, products: [...grouped.values()].slice(0, 6) };
}

const recentOrders = () =>
  db.select({ id: orders.id, seq: orders.seq, name: orders.name, totalMinor: orders.totalMinor, status: orders.status, paymentStatus: orders.paymentStatus, createdAt: orders.createdAt }).from(orders).orderBy(desc(orders.createdAt)).limit(8)
    .then((rows) => rows.map((r) => ({ ...r, number: formatOrderNumber(r.seq) })));

const recentCustomers = () =>
  db.select({ id: customers.id, name: customers.name, email: customers.email, createdAt: customers.createdAt, orders: sql<number>`(select count(*)::int from "order" o where o.customer_id = ${customers.id})` }).from(customers).orderBy(desc(customers.createdAt)).limit(5);

async function attention() {
  const [r] = await db
    .select({
      pending: sql<number>`count(*) filter (where ${orders.status} = 'pending')::int`,
      failed: sql<number>`count(*) filter (where ${orders.paymentStatus} = 'failed' and ${orders.status} not in ('cancelled','returned'))::int`,
    })
    .from(orders);
  return { pending: r?.pending ?? 0, failedPayments: r?.failed ?? 0 };
}

async function catalogCounts() {
  const [r] = await db.select({ published: sql<number>`count(*) filter (where ${products.status} = 'published')::int`, draft: sql<number>`count(*) filter (where ${products.status} = 'draft')::int`, archived: sql<number>`count(*) filter (where ${products.status} = 'archived')::int` }).from(products);
  const [c] = await db.select({ n: count() }).from(customers);
  return { published: r?.published ?? 0, draft: r?.draft ?? 0, archived: r?.archived ?? 0, customers: c?.n ?? 0 };
}

export type Dashboard = Awaited<ReturnType<typeof getDashboard>>;

/**
 * Everything the overview shows. Each block is queried only if this staff member may see it
 * (a Content Manager gets no revenue; Inventory sees stock but not customers), so the restriction
 * holds at the data layer and not just in the UI.
 */
export async function getDashboard(admin: AdminSessionUser, range: ResolvedRange) {
  const sales = can(admin, "orders:view");
  const cust = can(admin, "customers:view");
  const prod = can(admin, "products:view");
  const inv = can(admin, "inventory:view") || prod;
  const prev = { from: range.prevFrom, to: range.prevTo };

  const [cur, before, series, tp, tc, ro, att, newC, newCPrev, rc, stock, counts] = await Promise.all([
    sales ? salesTotals(range) : null,
    sales ? salesTotals(prev) : null,
    sales ? dailySeries(range) : null,
    sales && prod ? topProducts(range) : null,
    sales && prod ? topCategories(range) : null,
    sales ? recentOrders() : null,
    sales ? attention() : null,
    cust ? newCustomers(range) : null,
    cust ? newCustomers(prev) : null,
    cust ? recentCustomers() : null,
    inv ? stockHealth() : null,
    prod || cust ? catalogCounts() : null,
  ]);

  return {
    range: { key: range.key, fromDay: range.fromDay, toDay: range.toDay, step: range.step },
    sales: cur && before && {
      ...cur,
      delta: { revenue: deltaPercent(cur.revenue, before.revenue), orders: deltaPercent(cur.validOrders, before.validOrders), aov: deltaPercent(cur.aov, before.aov), visitors: deltaPercent(cur.visitors, before.visitors) },
      conversionBefore: before.conversion,
    },
    series, topProducts: tp, topCategories: tc, recentOrders: ro, attention: att,
    customers: cust && counts ? { total: counts.customers, newInRange: newC ?? 0, newDelta: deltaPercent(newC ?? 0, newCPrev ?? 0), recent: rc ?? [] } : null,
    stock,
    catalog: prod && counts ? { published: counts.published, draft: counts.draft, archived: counts.archived } : null,
  };
}

export async function recordVisit(visitorId: string, path: string) {
  await db.insert(storefrontVisits).values({ visitorId, path: path.slice(0, 200) });
}
