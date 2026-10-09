import { asc, eq, sql } from "drizzle-orm";
import { db } from "../src/db/client";
import { couponUsages, coupons, customers, orderEvents, orderItems, orders, productImages, productVariants, storefrontVisits } from "../src/db/schema";
import { shippingCost } from "../src/lib/shipping";
import { hashPassword } from "../src/server/auth/password";

/** Deterministic PRNG so the demo data is identical on every run. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = ["نورهان", "مريم", "هدى", "ياسمين", "سلمى", "دينا", "رنا", "ليلى", "آية", "جميلة", "منى", "فاطمة", "هبة", "إيمان", "نادين", "سارة", "شيماء", "رحاب", "علا", "ريم"];
const LAST = ["حسن", "إبراهيم", "عبد الله", "السيد", "فؤاد", "مصطفى", "صلاح", "الشريف", "رمضان", "كامل", "عزت", "نصر"];
const EN: Record<string, string> = { نورهان: "nourhan", مريم: "mariam", هدى: "hoda", ياسمين: "yasmine", سلمى: "salma", دينا: "dina", رنا: "rana", ليلى: "layla", آية: "aya", جميلة: "gamila", منى: "mona", فاطمة: "fatma", هبة: "heba", إيمان: "eman", نادين: "nadine", سارة: "sara", شيماء: "shaimaa", رحاب: "rehab", علا: "ola", ريم: "reem" };
const PLACES: [string, string[], number][] = [
  ["cairo", ["مدينة نصر", "المعادي", "التجمع الخامس", "الزمالك", "مصر الجديدة", "شبرا"], 34],
  ["giza", ["الدقي", "المهندسين", "الشيخ زايد", "6 أكتوبر", "فيصل"], 20],
  ["alexandria", ["سموحة", "ستانلي", "المنتزه", "سيدي بشر"], 12],
  ["dakahlia", ["المنصورة"], 6], ["sharqia", ["الزقازيق", "العاشر من رمضان"], 6], ["gharbia", ["طنطا"], 4],
  ["qalyubia", ["بنها", "شبرا الخيمة"], 6], ["monufia", ["شبين الكوم"], 3], ["port-said", ["بورسعيد"], 3], ["minya", ["المنيا"], 3], ["asyut", ["أسيوط"], 3],
];

export async function seedHistory(opts: { welcomeCouponId: string; days?: number }) {
  const rnd = mulberry32(2026);
  const pickOne = <T,>(a: readonly T[]) => a[Math.floor(rnd() * a.length)]!;
  const weighted = () => { let r = rnd() * PLACES.reduce((s, p) => s + p[2], 0); for (const p of PLACES) if ((r -= p[2]) < 0) return p; return PLACES[0]!; };
  const DAY = 86_400_000, now = Date.now(), span = opts.days ?? 150;

  // Catalogue snapshot used to build believable baskets.
  const prods = await db.query.products.findMany({ with: { variants: { orderBy: [asc(productVariants.sortOrder)] }, images: { orderBy: [asc(productImages.sortOrder)] } } });
  const sellable = prods.filter((p) => p.variants.length);
  const bestBias = sellable.flatMap((p) => Array(1 + Math.round(p.soldCount / 30)).fill(p) as typeof sellable);

  // Customers: sign-ups spread across the period (earlier days more likely, as a base grows).
  const hash = await hashPassword(`seed-${rnd()}-Aa1`);
  const custRows = Array.from({ length: 38 }, (_, i) => {
    const first = FIRST[i % FIRST.length]!, last = LAST[(i * 7) % LAST.length]!;
    const created = now - Math.floor((1 - Math.pow(rnd(), 1.6)) * span * DAY) - DAY / 2;
    return { email: `${EN[first]}.${i + 1}@example.com`, name: `${first} ${last}`, phone: `01${pickOne(["0", "1", "2", "5"])}${String(Math.floor(rnd() * 1e8)).padStart(8, "0")}`, passwordHash: hash, createdAt: new Date(created), updatedAt: new Date(created) };
  }).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const custs = await db.insert(customers).values(custRows).returning();

  // Orders, oldest first so order numbers rise with time.
  const used = new Set<string>();
  const dailyOrders: { when: number; customer: (typeof custs)[number] }[] = [];
  for (let d = span; d >= 1; d--) {
    const dayStart = now - d * DAY;
    const dow = new Date(dayStart).getUTCDay(); // 4 = Thu, 5 = Fri
    const trend = 0.9 + 2.6 * (1 - d / span);
    const lambda = trend * (dow === 4 || dow === 5 ? 1.35 : dow === 0 ? 0.8 : 1);
    let n = 0; for (let L = Math.exp(-lambda), p = 1; (p *= rnd()) > L;) n++;
    for (let i = 0; i < n; i++) {
      const when = dayStart + Math.floor((0.35 + rnd() * 0.65) * DAY * 0.9);
      const eligible = custs.filter((c) => c.createdAt.getTime() <= when);
      if (!eligible.length) continue;
      dailyOrders.push({ when, customer: rnd() < 0.62 ? pickOne(eligible.slice(-Math.max(5, eligible.length))) : pickOne(eligible) });
    }
  }
  dailyOrders.sort((a, b) => a.when - b.when);

  let created = 0;
  const events: (typeof orderEvents.$inferInsert)[] = [];
  const usages: (typeof couponUsages.$inferInsert)[] = [];
  for (const o of dailyOrders) {
    const age = (now - o.when) / DAY;
    const lines = Array.from({ length: rnd() < 0.62 ? 1 : rnd() < 0.8 ? 2 : 3 }, () => {
      const p = pickOne(bestBias), v = pickOne(p.variants);
      const img = p.images.find((i) => i.colorHex === v.colorHex) ?? p.images[0];
      const unit = v.priceMinor ?? (p.salePriceMinor != null && p.salePriceMinor < p.priceMinor ? p.salePriceMinor : p.priceMinor);
      return { p, v, img, unit, qty: rnd() < 0.86 ? 1 : 2 };
    });
    const subtotal = lines.reduce((s, l) => s + l.unit * l.qty, 0);
    const firstOrder = !used.has(o.customer.id);
    used.add(o.customer.id);
    const welcome = firstOrder && rnd() < 0.4;
    const discount = welcome ? Math.min(Math.floor(subtotal * 0.1), 50000) : 0;
    const delivery = rnd() < 0.18 ? "express" : "standard";
    const shipping = shippingCost(delivery, subtotal - discount, firstOrder);
    const total = subtotal - discount + shipping;

    const r = rnd();
    const status = age > 14 ? (r < 0.84 ? "delivered" : r < 0.91 ? "cancelled" : "returned")
      : age > 7 ? (r < 0.62 ? "delivered" : r < 0.82 ? "shipped" : r < 0.9 ? "preparing" : "cancelled")
      : age > 2.5 ? (r < 0.15 ? "delivered" : r < 0.45 ? "shipped" : r < 0.72 ? "preparing" : r < 0.9 ? "confirmed" : "cancelled")
      : (r < 0.4 ? "pending" : r < 0.68 ? "confirmed" : r < 0.88 ? "preparing" : "cancelled");
    const path = ["pending", "confirmed", "preparing", "shipped", "delivered"] as const;
    const reached = status === "cancelled" ? ["pending"] : status === "returned" ? [...path] : path.slice(0, path.indexOf(status as (typeof path)[number]) + 1);
    const where = weighted();
    const lastAt = o.when + (reached.length - 1) * 7 * 3_600_000 + (status === "returned" ? 4 * DAY : status === "cancelled" ? 5 * 3_600_000 : 0);

    const [row] = await db.insert(orders).values({
      customerId: o.customer.id, email: o.customer.email, name: o.customer.name, phone: o.customer.phone!, governorate: where[0], city: pickOne(where[1]), line1: `${Math.floor(rnd() * 90) + 1} شارع ${pickOne(["النيل", "الجمهورية", "التحرير", "الحرية", "سعد زغلول", "9"])}`,
      deliveryMethod: delivery, paymentMethod: "cod", paymentStatus: status === "delivered" ? "paid" : status === "returned" ? "refunded" : "pending",
      status, subtotalMinor: subtotal, shippingMinor: shipping, discountMinor: discount, totalMinor: total,
      couponCode: welcome ? "WELCOME10" : null, couponId: welcome ? opts.welcomeCouponId : null, locale: rnd() < 0.8 ? "ar" : "en",
      createdAt: new Date(o.when), updatedAt: new Date(lastAt),
    }).returning({ id: orders.id });

    await db.insert(orderItems).values(lines.map((l) => ({
      orderId: row!.id, productId: l.p.id, variantId: l.v.id, slug: l.p.slug, nameAr: l.p.nameAr, nameEn: l.p.nameEn, sku: l.v.sku, size: l.v.size,
      colorNameAr: l.v.colorNameAr, colorNameEn: l.v.colorNameEn, colorHex: l.v.colorHex, imageUrl: l.img?.url ?? null, tone: l.img?.tone ?? "wine",
      unitPriceMinor: l.unit, quantity: l.qty, lineTotalMinor: l.unit * l.qty,
    })));
    reached.forEach((s, i) => events.push({ orderId: row!.id, status: s as (typeof path)[number], createdAt: new Date(o.when + i * 7 * 3_600_000) }));
    if (status === "cancelled") events.push({ orderId: row!.id, status: "cancelled", note: "Cancelled at the customer's request", createdAt: new Date(lastAt) });
    if (status === "returned") events.push({ orderId: row!.id, status: "returned", note: "Returned within 14 days", createdAt: new Date(lastAt) });
    if (welcome) usages.push({ couponId: opts.welcomeCouponId, orderId: row!.id, customerId: o.customer.id, email: o.customer.email, discountMinor: discount, createdAt: new Date(o.when) });
    created++;
  }
  for (let i = 0; i < events.length; i += 500) await db.insert(orderEvents).values(events.slice(i, i + 500));
  if (usages.length) {
    await db.insert(couponUsages).values(usages);
    await db.update(coupons).set({ usedCount: usages.length }).where(eq(coupons.id, opts.welcomeCouponId));
  }

  // Storefront sessions: roughly 2–4 % of visitors order, so the conversion rate is realistic.
  const perDay = new Map<number, number>();
  for (const o of dailyOrders) perDay.set(Math.floor(o.when / DAY), (perDay.get(Math.floor(o.when / DAY)) ?? 0) + 1);
  const visits: (typeof storefrontVisits.$inferInsert)[] = [];
  for (let d = span; d >= 0; d--) {
    const dayIdx = Math.floor((now - d * DAY) / DAY);
    const n = Math.round(((perDay.get(dayIdx) ?? 1) * (26 + rnd() * 20)) * (d === 0 ? 0.4 : 1));
    for (let i = 0; i < n; i++) visits.push({ visitorId: `seed${dayIdx}x${i}`.padEnd(14, "0"), path: pickOne(["/", "/shop", "/women", "/collections", "/products/vesper-satin-midi-dress"]), createdAt: new Date(dayIdx * DAY + Math.floor(rnd() * DAY)) });
  }
  for (let i = 0; i < visits.length; i += 1000) await db.insert(storefrontVisits).values(visits.slice(i, i + 1000));

  // Sold counters follow the generated history (relative ranking is what the storefront uses).
  await db.execute(sql`update product p set sold_count = p.sold_count + coalesce((select sum(i.quantity) from order_item i join "order" o on o.id = i.order_id where i.product_id = p.id and o.status not in ('cancelled','returned')), 0)`);
  console.log(`History: ${custs.length} customers, ${created} orders, ${visits.length} storefront sessions over ${span} days.`);
}
