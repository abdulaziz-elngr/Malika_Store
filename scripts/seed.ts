import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../src/db/client";
import { runMigrations } from "../src/db/migrate";
import { addresses, categories, collections, coupons, customers, inventoryMovements, notifications, orderEvents, orders, productCollections, productImages, productVariants, products, wishlistItems } from "../src/db/schema";
import { seedHistory } from "./seed-history";
import { hashPassword } from "../src/server/auth/password";
import { placeOrder } from "../src/server/services/orders";
import { createAdminUser } from "../src/server/services/admin-auth";
import { syncRbac } from "../src/server/services/rbac";
import { SYSTEM_ROLES, type SystemRoleKey } from "../src/lib/permissions";

type Tone = "wine" | "copper" | "cream" | "sage";
const COLORS = {
  wine: { ar: "عنابي", en: "Wine", hex: "#67251B", tone: "wine" as Tone },
  cream: { ar: "كريمي", en: "Cream", hex: "#EEE2D2", tone: "cream" as Tone },
  copper: { ar: "نحاسي", en: "Copper", hex: "#B88870", tone: "copper" as Tone },
  sage: { ar: "أخضر باهت", en: "Sage", hex: "#8A9A82", tone: "sage" as Tone },
  black: { ar: "أسود", en: "Black", hex: "#1E1512", tone: "wine" as Tone },
  navy: { ar: "كحلي", en: "Navy", hex: "#26304A", tone: "sage" as Tone },
};
type ColorKey = keyof typeof COLORS;

const cats = [
  { slug: "dresses", ar: "فساتين", en: "Dresses", tone: "wine" },
  { slug: "abayas", ar: "عبايات", en: "Abayas", tone: "copper" },
  { slug: "tops", ar: "بلوزات وقمصان", en: "Tops & Shirts", tone: "cream" },
  { slug: "bottoms", ar: "بناطيل وتنانير", en: "Trousers & Skirts", tone: "sage" },
  { slug: "knitwear", ar: "تريكو", en: "Knitwear", tone: "copper" },
  { slug: "outerwear", ar: "معاطف وجاكيتات", en: "Outerwear", tone: "wine" },
  { slug: "accessories", ar: "إكسسوارات", en: "Accessories", tone: "cream" },
] as const;

const cols = [
  { slug: "autumn-winter-2026", ar: "خريف · شتاء 2026", en: "Autumn · Winter 2026", dAr: "ألوان الخريف الدافئة بقصّات انسيابية.", dEn: "Warm autumn tones in fluid, considered cuts.", tone: "wine" },
  { slug: "essentials", ar: "الأساسيات", en: "The Essentials", dAr: "قطع أساسية تدوم موسماً بعد موسم.", dEn: "Foundations for a wardrobe that lasts season after season.", tone: "cream" },
  { slug: "evening-edit", ar: "إطلالات السهرة", en: "The Evening Edit", dAr: "فخامة هادئة لمساءاتكِ.", dEn: "Quiet luxury for your evenings.", tone: "copper" },
] as const;

type P = {
  slug: string; sku: string; ar: string; en: string; sAr: string; sEn: string; mAr: string; mEn: string;
  cat: (typeof cats)[number]["slug"]; gender: "women" | "men" | "unisex"; price: number; sale?: number;
  colors: ColorKey[]; sizes: string[]; cols: string[]; flags?: { featured?: boolean; isNew?: boolean; best?: boolean }; sold: number; outOfStock?: boolean;
};
const S = ["XS", "S", "M", "L", "XL"], ONE = ["One size"], N = ["38", "40", "42", "44", "46"];

const list: P[] = [
  { slug: "vesper-satin-midi-dress", sku: "MLK-DR-001", ar: "فستان ميدي فيسبر ساتان", en: "Vesper Satin Midi Dress", sAr: "فستان ميدي ساتان بقصّة مائلة وخصر ناعم.", sEn: "A bias-cut satin midi with a softly defined waist.", mAr: "٩٥٪ ساتان فيسكوز، ٥٪ إيلاستان", mEn: "95% viscose satin, 5% elastane", cat: "dresses", gender: "women", price: 3200, colors: ["wine", "cream"], sizes: S, cols: ["autumn-winter-2026", "evening-edit"], flags: { featured: true, isNew: true }, sold: 64 },
  { slug: "noor-open-abaya", sku: "MLK-AB-001", ar: "عباية نور المفتوحة", en: "Noor Open Abaya", sAr: "عباية مفتوحة بقماش كريب منسدل وأكمام واسعة.", sEn: "An open abaya in fluid crepe with generous sleeves.", mAr: "١٠٠٪ كريب بوليستر مُعاد تدويره", mEn: "100% recycled polyester crepe", cat: "abayas", gender: "women", price: 4200, sale: 3400, colors: ["black", "wine", "sage"], sizes: S, cols: ["essentials"], flags: { featured: true, best: true }, sold: 142 },
  { slug: "layla-silk-blouse", sku: "MLK-TP-001", ar: "بلوزة ليلى الحريرية", en: "Layla Silk Blouse", sAr: "بلوزة حرير بياقة ناعمة وأزرار مخفية.", sEn: "A silk blouse with a soft collar and concealed buttons.", mAr: "١٠٠٪ حرير طبيعي", mEn: "100% mulberry silk", cat: "tops", gender: "women", price: 1850, colors: ["cream", "wine"], sizes: S, cols: ["essentials", "autumn-winter-2026"], flags: { best: true }, sold: 118 },
  { slug: "soraya-wide-leg-trousers", sku: "MLK-BT-001", ar: "بنطلون سرايا واسع", en: "Soraya Wide-Leg Trousers", sAr: "بنطلون واسع بخصر مرتفع وطيّات أمامية.", sEn: "High-waisted wide-leg trousers with front pleats.", mAr: "٧٠٪ صوف، ٣٠٪ فيسكوز", mEn: "70% wool, 30% viscose", cat: "bottoms", gender: "women", price: 2100, colors: ["black", "cream", "navy"], sizes: S, cols: ["essentials"], sold: 87 },
  { slug: "amira-wool-coat", sku: "MLK-OW-001", ar: "معطف أميرة الصوفي", en: "Amira Wool Coat", sAr: "معطف طويل من الصوف بقصّة مستقيمة وياقة عريضة.", sEn: "A long wool coat with a clean line and wide collar.", mAr: "٨٠٪ صوف، ٢٠٪ كاشمير", mEn: "80% wool, 20% cashmere", cat: "outerwear", gender: "women", price: 6800, colors: ["copper", "black"], sizes: S, cols: ["autumn-winter-2026"], flags: { featured: true, isNew: true }, sold: 41 },
  { slug: "dalia-knit-cardigan", sku: "MLK-KN-001", ar: "كارديغان داليا", en: "Dalia Knit Cardigan", sAr: "كارديغان تريكو ناعم بنسيج مضلّع.", sEn: "A soft ribbed-knit cardigan with an easy drape.", mAr: "٦٠٪ ميرينو، ٤٠٪ قطن", mEn: "60% merino, 40% cotton", cat: "knitwear", gender: "women", price: 2400, sale: 1900, colors: ["cream", "sage", "wine"], sizes: S, cols: ["autumn-winter-2026"], flags: { best: true }, sold: 96 },
  { slug: "zahra-pleated-skirt", sku: "MLK-BT-002", ar: "تنورة زهرة بليسيه", en: "Zahra Pleated Skirt", sAr: "تنورة طويلة بليسيه دقيق تتحرك مع كل خطوة.", sEn: "A long knife-pleated skirt that moves with every step.", mAr: "١٠٠٪ بوليستر ساتان", mEn: "100% satin polyester", cat: "bottoms", gender: "women", price: 1700, colors: ["wine", "sage"], sizes: S, cols: ["autumn-winter-2026"], flags: { isNew: true }, sold: 52 },
  { slug: "rania-evening-gown", sku: "MLK-DR-002", ar: "فستان سهرة رانيا", en: "Rania Evening Gown", sAr: "فستان سهرة طويل بظهر مفتوح وذيل خفيف.", sEn: "A floor-length gown with an open back and a soft train.", mAr: "٨٠٪ كريب ساتان، ٢٠٪ تول", mEn: "80% satin crepe, 20% tulle", cat: "dresses", gender: "women", price: 7500, colors: ["wine", "black"], sizes: S, cols: ["evening-edit"], flags: { featured: true, isNew: true }, sold: 23 },
  { slug: "hana-cape-blazer", sku: "MLK-OW-002", ar: "بليزر هنا بكيب", en: "Hana Cape Blazer", sAr: "بليزر مفصّل بكيب مدمج وأكتاف ناعمة.", sEn: "A tailored blazer with an integrated cape and soft shoulders.", mAr: "٧٥٪ صوف، ٢٥٪ بوليستر", mEn: "75% wool, 25% polyester", cat: "outerwear", gender: "women", price: 4900, colors: ["cream", "black"], sizes: S, cols: ["autumn-winter-2026", "essentials"], sold: 38 },
  { slug: "karim-oxford-shirt", sku: "MLK-TP-101", ar: "قميص كريم أكسفورد", en: "Karim Oxford Shirt", sAr: "قميص أكسفورد قطني بقصّة مريحة.", sEn: "A cotton Oxford shirt with a relaxed, clean fit.", mAr: "١٠٠٪ قطن مصري", mEn: "100% Egyptian cotton", cat: "tops", gender: "men", price: 1650, colors: ["cream", "navy"], sizes: S, cols: ["essentials"], flags: { best: true }, sold: 101 },
  { slug: "omar-merino-sweater", sku: "MLK-KN-101", ar: "سترة عمر ميرينو", en: "Omar Merino Sweater", sAr: "سترة ميرينو برقبة دائرية ونسيج ناعم.", sEn: "A merino crew-neck sweater with a refined hand-feel.", mAr: "١٠٠٪ صوف ميرينو", mEn: "100% merino wool", cat: "knitwear", gender: "men", price: 2800, colors: ["wine", "navy", "sage"], sizes: S, cols: ["autumn-winter-2026"], flags: { isNew: true }, sold: 59 },
  { slug: "youssef-tailored-trousers", sku: "MLK-BT-101", ar: "بنطلون يوسف المفصّل", en: "Youssef Tailored Trousers", sAr: "بنطلون مفصّل بطيّة واحدة وقصّة مستقيمة.", sEn: "Tailored single-pleat trousers with a straight leg.", mAr: "٧٠٪ صوف، ٣٠٪ فيسكوز", mEn: "70% wool, 30% viscose", cat: "bottoms", gender: "men", price: 2300, colors: ["black", "navy"], sizes: N, cols: ["essentials"], sold: 70 },
  { slug: "adam-overcoat", sku: "MLK-OW-101", ar: "معطف آدم الطويل", en: "Adam Overcoat", sAr: "معطف طويل بقصّة مستقيمة وبطانة حريرية.", sEn: "A long overcoat with a straight cut and a silk lining.", mAr: "٩٠٪ صوف، ١٠٪ كاشمير", mEn: "90% wool, 10% cashmere", cat: "outerwear", gender: "men", price: 7200, sale: 5900, colors: ["copper", "black"], sizes: S, cols: ["autumn-winter-2026"], sold: 33 },
  { slug: "nadia-silk-scarf", sku: "MLK-AC-001", ar: "وشاح نادية الحريري", en: "Nadia Silk Scarf", sAr: "وشاح حرير بحواف مطوية يدوياً.", sEn: "A silk scarf with hand-rolled edges.", mAr: "١٠٠٪ حرير", mEn: "100% silk twill", cat: "accessories", gender: "unisex", price: 950, colors: ["wine", "copper", "sage"], sizes: ONE, cols: ["essentials", "evening-edit"], flags: { best: true }, sold: 130 },
  { slug: "maya-leather-belt", sku: "MLK-AC-002", ar: "حزام مايا الجلدي", en: "Maya Leather Belt", sAr: "حزام جلد ناعم بإبزيم نحاسي مطفي.", sEn: "A supple leather belt with a brushed copper buckle.", mAr: "جلد طبيعي، إبزيم نحاسي", mEn: "Full-grain leather, brushed copper buckle", cat: "accessories", gender: "unisex", price: 1100, colors: ["black", "wine"], sizes: ONE, cols: ["essentials"], sold: 27, outOfStock: true },
];

const care = {
  ar: "يُغسل جافاً أو على الدورة الرقيقة. يُكوى على حرارة منخفضة. يُحفظ بعيداً عن الرطوبة.",
  en: "Dry clean or gentle cycle. Iron on low heat. Store away from moisture.",
};

export const DEMO_ADMIN_PASSWORD = "Malika#Admin2026";

/** One demo staff account per system role (admin-<role>@malika.test) so permissions can be tried immediately. */
async function seedStaff() {
  await syncRbac();
  for (const key of Object.keys(SYSTEM_ROLES) as SystemRoleKey[]) {
    const res = await createAdminUser({ email: `${key.replace(/_/g, "-")}@malika.test`, name: SYSTEM_ROLES[key].nameEn, password: DEMO_ADMIN_PASSWORD, roleKey: key });
    if (!res.ok) throw new Error(`Demo staff ${key} failed: ${JSON.stringify(res)}`);
  }
  console.log(`Demo staff: <role>@malika.test / ${DEMO_ADMIN_PASSWORD}  (e.g. super-admin@malika.test)`);
}

export const DEMO_CUSTOMER = { email: "demo@malika.test", password: "Malika#2026" };

async function seedCommerce(catId: Record<string, string>, colId: Record<string, string>) {
  const day = 86_400_000;
  const couponRows = await db.insert(coupons).values([
    { code: "WELCOME10", type: "percent", value: 10, maxDiscountMinor: 50000, perCustomerLimit: 1, descriptionAr: "خصم ١٠٪ على أول طلب", descriptionEn: "10% off your first order" },
    { code: "MALIKA200", type: "fixed", value: 20000, minOrderMinor: 150000, descriptionAr: "خصم ٢٠٠ ج.م على الطلبات فوق ١٥٠٠ ج.م", descriptionEn: "EGP 200 off orders over EGP 1,500" },
    { code: "AW26", type: "percent", value: 15, collectionIds: [colId["autumn-winter-2026"]!], expiresAt: new Date(Date.now() + 60 * day), descriptionAr: "١٥٪ على مجموعة خريف · شتاء ٢٠٢٦", descriptionEn: "15% off the Autumn · Winter 2026 collection" },
    { code: "OUTERWEAR5", type: "percent", value: 5, categoryIds: [catId["outerwear"]!], usageLimit: 100, descriptionAr: "٥٪ على المعاطف والجاكيتات", descriptionEn: "5% off outerwear" },
    { code: "OLDSALE", type: "percent", value: 30, expiresAt: new Date(Date.now() - 10 * day), descriptionAr: "انتهت", descriptionEn: "Expired" },
  ]).returning();
  await seedHistory({ welcomeCouponId: couponRows.find((c) => c.code === "WELCOME10")!.id });

  const [demo] = await db.insert(customers).values({ email: DEMO_CUSTOMER.email, name: "سارة محمود", phone: "01012345678", passwordHash: await hashPassword(DEMO_CUSTOMER.password) }).returning();
  await db.insert(addresses).values({ customerId: demo!.id, label: "المنزل", recipient: "سارة محمود", phone: "01012345678", governorate: "cairo", city: "مدينة نصر", line1: "١٢ شارع عباس العقاد، الدور الثالث", isDefault: true });

  const variantFor = async (slug: string, color: string) => {
    const [r] = await db.select({ id: productVariants.id }).from(productVariants).innerJoin(products, eq(products.id, productVariants.productId)).where(and(eq(products.slug, slug), eq(productVariants.colorNameEn, color), sql`${productVariants.stock} > 3`)).limit(1);
    return r!.id;
  };
  const wish = await db.select({ id: products.id }).from(products).where(inArray(products.slug, ["amira-wool-coat", "rania-evening-gown"]));
  await db.insert(wishlistItems).values(wish.map((p) => ({ customerId: demo!.id, productId: p.id })));

  const customer = { id: demo!.id, email: demo!.email, name: demo!.name, phone: demo!.phone };
  const base = { name: demo!.name, email: demo!.email, phone: "01012345678", governorate: "cairo", city: "مدينة نصر", line1: "١٢ شارع عباس العقاد، الدور الثالث", line2: "", notes: "", deliveryMethod: "standard" as const, paymentMethod: "cod", coupon: "", saveAddress: false };
  const o1 = await placeOrder({ ...base, coupon: "WELCOME10", items: [{ variantId: await variantFor("layla-silk-blouse", "Cream"), quantity: 1 }, { variantId: await variantFor("nadia-silk-scarf", "Wine"), quantity: 2 }] }, customer, "ar");
  const o2 = await placeOrder({ ...base, deliveryMethod: "express", items: [{ variantId: await variantFor("dalia-knit-cardigan", "Sage"), quantity: 1 }] }, customer, "ar");
  if (!o1.ok || !o2.ok) throw new Error("Demo orders failed: " + JSON.stringify([o1, o2]));

  // Walk the demo orders through their lifecycle, with believable dates.
  const advance = async (number: string, daysAgo: number, steps: ("confirmed" | "preparing" | "shipped" | "delivered")[]) => {
    const [o] = await db.select().from(orders).where(eq(orders.seq, Number(number.slice(4)))).limit(1);
    const start = Date.now() - daysAgo * day;
    await db.update(orders).set({ createdAt: new Date(start), updatedAt: new Date(start + steps.length * 6 * 3_600_000), status: steps.at(-1)!, paymentStatus: steps.at(-1) === "delivered" ? "paid" : "pending" }).where(eq(orders.id, o!.id));
    await db.update(orderEvents).set({ createdAt: new Date(start) }).where(eq(orderEvents.orderId, o!.id));
    await db.update(notifications).set({ createdAt: new Date(start) }).where(eq(notifications.href, `/account/orders/${number}`));
    await db.insert(orderEvents).values(steps.map((status, i) => ({ orderId: o!.id, status, createdAt: new Date(start + (i + 1) * 6 * 3_600_000) })));
  };
  await advance(o1.number, 21, ["confirmed", "preparing", "shipped", "delivered"]);
  await advance(o2.number, 2, ["confirmed", "preparing", "shipped"]);
  await db.insert(notifications).values({ customerId: demo!.id, kind: "order_shipped", href: `/account/orders/${o2.number}`, titleAr: `طلبكِ ${o2.number} في الطريق`, titleEn: `Your order ${o2.number} is on its way`, bodyAr: "سلّمناه لشركة الشحن وسيصلكِ خلال يومين.", bodyEn: "It has been handed to the courier and arrives within two days." });
  console.log(`Demo customer: ${DEMO_CUSTOMER.email} / ${DEMO_CUSTOMER.password}  (orders ${o1.number}, ${o2.number})`);
}

async function main() {
  await runMigrations();
  // Demo reset: wipes the catalogue and everything that references it (orders, customers, coupons).
  await db.execute(sql`truncate table storefront_visit, audit_log, login_activity, admin_session, admin_user, role_permission, permission, role, site_setting, notification, coupon_usage, order_event, order_item, "order", wishlist_item, address, customer_session, customer, coupon, inventory_movement, product_collection, product_variant, product_image, product, collection, category restart identity cascade`);

  const catRows = await db.insert(categories).values(cats.map((c, i) => ({ slug: c.slug, nameAr: c.ar, nameEn: c.en, tone: c.tone, sortOrder: i }))).returning();
  const colRows = await db.insert(collections).values(cols.map((c) => ({ slug: c.slug, nameAr: c.ar, nameEn: c.en, descriptionAr: c.dAr, descriptionEn: c.dEn, tone: c.tone }))).returning();
  const catId = Object.fromEntries(catRows.map((c) => [c.slug, c.id]));
  const colId = Object.fromEntries(colRows.map((c) => [c.slug, c.id]));

  let n = 0;
  for (const p of list) {
    const [row] = await db.insert(products).values({
      slug: p.slug, sku: p.sku, nameAr: p.ar, nameEn: p.en, shortAr: p.sAr, shortEn: p.sEn,
      descriptionAr: `${p.sAr} صُمّمت لتدوم، بتفاصيل نظيفة وتشطيب متقن.`, descriptionEn: `${p.sEn} Designed to last, with clean details and careful finishing.`,
      materialsAr: p.mAr, materialsEn: p.mEn, careAr: care.ar, careEn: care.en,
      priceMinor: p.price * 100, salePriceMinor: p.sale ? p.sale * 100 : null, costMinor: Math.round(p.price * 100 * 0.38),
      categoryId: catId[p.cat], gender: p.gender, status: "published", featured: !!p.flags?.featured, isNew: !!p.flags?.isNew, bestSeller: !!p.flags?.best,
      soldCount: p.sold, weightGrams: 400 + n * 40, tags: [p.cat, p.gender],
    }).returning();
    await db.insert(productCollections).values(p.cols.map((c, i) => ({ productId: row!.id, collectionId: colId[c]!, sortOrder: i })));

    const imgRows = await db.insert(productImages).values(
      p.colors.flatMap((c, ci) => [0, 1].map((k) => ({ productId: row!.id, tone: k === 0 ? COLORS[c].tone : COLORS[p.colors[(ci + 1) % p.colors.length]!].tone, colorHex: COLORS[c].hex, altAr: `${p.ar} — ${COLORS[c].ar}`, altEn: `${p.en} — ${COLORS[c].en}`, sortOrder: ci * 2 + k }))),
    ).returning();

    let v = 0;
    for (const [ci, c] of p.colors.entries()) {
      for (const [si, size] of p.sizes.entries()) {
        v++;
        const stock = p.outOfStock ? 0 : (n * 7 + ci * 5 + si * 3) % 11 === 0 ? 0 : 3 + ((n + ci + si * 2) % 9);
        const [variant] = await db.insert(productVariants).values({
          productId: row!.id, sku: `${p.sku}-${c.toUpperCase().slice(0, 3)}-${size.replace(/\s/g, "")}`, size,
          colorNameAr: COLORS[c].ar, colorNameEn: COLORS[c].en, colorHex: COLORS[c].hex, stock, imageId: imgRows[ci * 2]?.id, sortOrder: v,
        }).returning();
        if (stock > 0) await db.insert(inventoryMovements).values({ variantId: variant!.id, delta: stock, reason: "initial", note: "Opening stock" });
      }
    }
    n++;
  }
  await seedCommerce(catId, colId);
  await seedStaff();
  console.log(`Seeded ${cats.length} categories, ${cols.length} collections, ${list.length} products.`);
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
