import { sql } from "drizzle-orm";
import { db } from "../src/db/client";
import { addDays, cairoDay, dayStart, deltaPercent, resolveRange } from "../src/lib/date-range";
import { SYSTEM_ROLES, type SystemRoleKey } from "../src/lib/permissions";
import type { AdminSessionUser } from "../src/server/auth/admin-session";
import { getDashboard, recordVisit } from "../src/server/services/analytics";
import { listAuditLogs, recordAudit } from "../src/server/services/audit";

let failed = 0;
const check = (name: string, ok: boolean, extra?: unknown) => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  → " + JSON.stringify(extra)}`); if (!ok) failed++; };
const staff = (key: SystemRoleKey): AdminSessionUser => ({ id: "x", email: `${key}@t`, name: key, role: { id: "r", key, nameAr: key, nameEn: key }, isSuper: key === "super_admin", permissions: new Set(SYSTEM_ROLES[key].permissions) });
const raw = async <T,>(q: ReturnType<typeof sql>) => ((await db.execute(q)).rows[0] as T);

async function main() {
  // ── date ranges (pure) ──
  const now = new Date("2026-10-08T10:00:00Z"); // Thursday
  const r7 = resolveRange("7d", undefined, now), r30 = resolveRange("30d", undefined, now);
  check("today in Cairo is 2026-10-08", cairoDay(now) === "2026-10-08");
  check("7d = 7 calendar days ending today", r7.days.length === 7 && r7.fromDay === "2026-10-02" && r7.toDay === "2026-10-08", r7.days);
  check("30d = 30 days, previous period is the 30 days before", r30.days.length === 30 && r30.prevTo.getTime() === r30.from.getTime() && (r30.to.getTime() - r30.from.getTime()) / 864e5 > 29.9, [r30.fromDay]);
  check("yesterday is a single day", resolveRange("yesterday", undefined, now).fromDay === "2026-10-07");
  const lm = resolveRange("last_month", undefined, now);
  check("last month = Sep 1–30", lm.fromDay === "2026-09-01" && lm.toDay === "2026-09-30" && lm.days.length === 30, [lm.fromDay, lm.toDay]);
  const mo = resolveRange("month", undefined, now);
  check("this month = Oct 1 → today", mo.fromDay === "2026-10-01" && mo.days.length === 8);
  const yr = resolveRange("year", undefined, now);
  check("this year uses weekly buckets", yr.fromDay === "2026-01-01" && yr.step === 7 && yr.days.length === 281);
  check("valid custom range is honoured", resolveRange("custom", { from: "2026-09-10", to: "2026-09-12" }, now).days.length === 3);
  for (const [name, c] of [["reversed", { from: "2026-09-12", to: "2026-09-10" }], ["future", { from: "2026-10-01", to: "2026-12-31" }], ["garbage", { from: "x'; drop", to: "y" }], ["too long", { from: "2024-01-01", to: "2026-10-01" }]] as const)
    check(`invalid custom range (${name}) falls back to 30d`, resolveRange("custom", c, now).key === "30d");
  check("unknown range key falls back to 30d", resolveRange("; drop table", undefined, now).key === "30d");
  // Egypt switches to summer time on the last Friday of April: that day starts at 00:00 +02 and ends +03 (23 h long).
  const dst = (dayStart("2026-04-25").getTime() - dayStart("2026-04-24").getTime()) / 36e5;
  check("Cairo daylight-saving day is 23 h long (2026-04-24 → 25)", dst === 23 || dst === 24, dst);
  check("addDays crosses month ends", addDays("2026-02-28", 1) === "2026-03-01" && addDays("2026-01-01", -1) === "2025-12-31");
  check("deltaPercent handles zero baseline", deltaPercent(5, 0) === null && deltaPercent(150, 100) === 50 && deltaPercent(50, 100) === -50);

  // ── analytics vs independent SQL ──
  const range = resolveRange("30d");
  const d = await getDashboard(staff("super_admin"), range);
  const win = sql`created_at >= ${range.from.toISOString()}::timestamptz and created_at < ${range.to.toISOString()}::timestamptz`;
  const o = await raw<{ n: number; rev: string; lost: number }>(sql`select count(*) filter (where status not in ('cancelled','returned'))::int n, coalesce(sum(total_minor) filter (where status not in ('cancelled','returned')),0)::text rev, count(*) filter (where status in ('cancelled','returned'))::int lost from "order" where ${win}`);
  check("orders in range match raw SQL", d.sales!.validOrders === o.n && d.sales!.lost === o.lost, [d.sales!.validOrders, o.n]);
  check("revenue matches raw SQL and excludes cancelled/returned", d.sales!.revenue === Number(o.rev) && d.sales!.revenue > 0, [d.sales!.revenue, o.rev]);
  check("average order value = revenue / valid orders", d.sales!.aov === Math.round(Number(o.rev) / o.n));
  check("chart has one point per day and sums to the totals", d.series!.length === 30 && d.series!.reduce((s, p) => s + p.orders, 0) === o.n && d.series!.reduce((s, p) => s + p.revenue, 0) === Number(o.rev));
  const yearly = await getDashboard(staff("super_admin"), resolveRange("year"));
  check("yearly chart uses weekly buckets that still sum to the total", yearly.series!.length === Math.ceil(resolveRange("year").days.length / 7) && yearly.series!.reduce((s, p) => s + p.orders, 0) === yearly.sales!.validOrders);
  const v = await raw<{ n: number }>(sql`select count(distinct visitor_id)::int n from storefront_visit where ${win}`);
  check("visitors match; conversion = orders / visitors", d.sales!.visitors === v.n && d.sales!.conversion === Math.round((o.n / v.n) * 10000) / 100, [d.sales!.conversion]);
  check("conversion rate is plausible (1–8 %)", d.sales!.conversion! > 1 && d.sales!.conversion! < 8, d.sales!.conversion);
  const tp = await raw<{ slug: string; u: number }>(sql`select i.slug, sum(i.quantity)::int u from order_item i join "order" o on o.id = i.order_id where o.status not in ('cancelled','returned') and o.created_at >= ${range.from.toISOString()}::timestamptz and o.created_at < ${range.to.toISOString()}::timestamptz group by i.slug order by u desc, i.slug limit 1`);
  check("top product matches raw SQL", d.topProducts![0]!.slug === tp.slug && d.topProducts![0]!.units === tp.u, [d.topProducts![0], tp]);
  check("top products are sorted by units, max 5", d.topProducts!.length === 5 && d.topProducts!.every((p, i, a) => i === 0 || a[i - 1]!.units >= p.units));
  check("top categories sorted by revenue", d.topCategories!.length > 0 && d.topCategories!.every((c, i, a) => i === 0 || Number(a[i - 1]!.revenue) >= Number(c.revenue)));
  const st = await raw<{ low: number; out: number }>(sql`select count(*) filter (where v.stock > 0 and v.stock <= 5)::int low, count(*) filter (where v.stock = 0)::int out from product_variant v join product p on p.id = v.product_id where p.status = 'published'`);
  check("low-stock and sold-out counts match raw SQL", d.stock!.lowVariants === st.low && d.stock!.outVariants === st.out, [d.stock, st]);
  check("low-stock list is ordered by lowest stock", d.stock!.products.length > 0 && d.stock!.products[0]!.variants[0]!.stock <= 5);
  const pend = await raw<{ n: number }>(sql`select count(*)::int n from "order" where status = 'pending'`);
  check("pending orders count matches", d.attention!.pending === pend.n);
  check("recent orders are newest first with MLK numbers", d.recentOrders!.length === 8 && d.recentOrders!.every((x, i, a) => i === 0 || a[i - 1]!.createdAt >= x.createdAt) && /^MLK-\d+$/.test(d.recentOrders![0]!.number));
  check("period-over-period change is computed", typeof d.sales!.delta.revenue === "number");
  const old = await getDashboard(staff("super_admin"), resolveRange("custom", { from: "2020-01-01", to: "2020-01-05" }));
  check("a valid custom range before any data is honoured and empty", old.range.key === "custom" && old.sales!.revenue === 0 && old.sales!.validOrders === 0 && old.series!.length === 5);
  const quiet = resolveRange("yesterday", undefined, new Date("2020-06-01T10:00:00Z"));
  const q = await getDashboard(staff("super_admin"), quiet);
  check("period with no sales is all zeros (no NaN, no crash)", q.sales!.revenue === 0 && q.sales!.aov === 0 && q.sales!.conversion === null && q.series!.every((p) => p.orders === 0 && p.revenue === 0) && q.topProducts!.length === 0);

  // ── RBAC at the data layer ──
  const content = await getDashboard(staff("content_manager"), range);
  check("content manager receives NO sales or customer data", content.sales === null && content.series === null && content.recentOrders === null && content.topProducts === null && content.customers === null && content.attention === null);
  check("content manager still gets catalogue counts", content.catalog !== null && content.catalog.published > 0);
  const inv = await getDashboard(staff("inventory_manager"), range);
  check("inventory manager sees stock + orders but not customers", inv.stock !== null && inv.sales !== null && inv.customers === null);
  const sup = await getDashboard(staff("customer_support"), range);
  check("customer support sees orders and customers", sup.sales !== null && sup.customers !== null && sup.customers.recent.length === 5);
  const mkt = await getDashboard(staff("marketing_manager"), range);
  check("marketing manager has no order figures (no orders:view)", mkt.sales === null && mkt.customers !== null);

  // ── visits + audit ──
  const before = (await raw<{ n: number }>(sql`select count(*)::int n from storefront_visit`)).n;
  await recordVisit("verify0123456789", "/shop");
  check("recordVisit stores a session", (await raw<{ n: number }>(sql`select count(*)::int n from storefront_visit`)).n === before + 1);
  for (let i = 0; i < 30; i++) await recordAudit(null, null, { action: "verify.test", entity: "verify", summary: `${i === 0 ? "100% test_entry" : "bulk entry"} ${i}`, before: { price: 100 + i, passwordHash: "secret" }, after: { price: 120 + i } });
  const a = await listAuditLogs({ page: 1 }), a2 = await listAuditLogs({ page: 2 });
  check("audit list is paged at 25, newest first", a.rows.length === 25 && a2.rows.length >= 5 && a.pages >= 2 && a.rows.every((x, i, arr) => i === 0 || arr[i - 1]!.createdAt >= x.createdAt) && a.rows[0]!.id !== a2.rows[0]!.id);
  check("audit snapshots keep changed values but redact secrets", JSON.stringify(a.rows[0]!.before).includes("[redacted]") && !JSON.stringify(a.rows[0]!.before).includes("secret"));
  const esc = await listAuditLogs({ q: "100%", page: 1 });
  check("audit search escapes % and _ (literal match only)", esc.total === 1, esc.total);
  check("audit entity filter works", (await listAuditLogs({ entity: "admin_user", page: 1 })).rows.every((r) => r.entity === "admin_user"));
  const inj = await listAuditLogs({ q: "'; drop table audit_log; --", page: 1 });
  check("SQL-looking search is harmless", inj.total === 0);

  await db.execute(sql`delete from audit_log where action = 'verify.test'`);
  await db.execute(sql`delete from storefront_visit where visitor_id = 'verify0123456789'`);
  console.log(failed ? `\n${failed} check(s) FAILED` : "\nAll dashboard checks passed.");
  process.exit(failed ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
