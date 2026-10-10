import { eq, sql } from "drizzle-orm";
import { db } from "../src/db/client";
import { productVariants, products, orders } from "../src/db/schema";
import { priceCart } from "../src/server/services/cart";
import { sign } from "../src/server/auth/secret";
import { getOrderForGuest, placeOrder } from "../src/server/services/orders";
import { setSetting } from "../src/server/services/settings";

let failed = 0;
const check = (name: string, ok: boolean, extra?: unknown) => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  → " + JSON.stringify(extra)}`); if (!ok) failed++; };

async function variant(slug: string, color: string, size?: string) {
  const [r] = await db.select({ id: productVariants.id, stock: productVariants.stock }).from(productVariants).innerJoin(products, eq(products.id, productVariants.productId))
    .where(sql`${products.slug} = ${slug} and ${productVariants.colorNameEn} = ${color} ${size ? sql`and ${productVariants.size} = ${size}` : sql``} and ${productVariants.stock} > 0`).limit(1);
  return r!;
}
const base = { name: "Test Guest", email: "guest@example.com", phone: "01155555555", governorate: "giza", city: "Dokki", line1: "5 Test Street", line2: "", notes: "", paymentMethod: "cod", senderPhone: "", receiptToken: "", saveAddress: false };

async function main() {
  const blouse = await variant("layla-silk-blouse", "Wine"); // 1850 EGP
  const coat = await variant("amira-wool-coat", "Black"); // 6800 EGP, AW26 + outerwear
  const scarf = await variant("nadia-silk-scarf", "Copper"); // 950 EGP

  let p = await priceCart({ items: [{ variantId: blouse.id, quantity: 2 }] });
  check("subtotal = 2 × 1850", p.subtotalMinor === 370000, p.subtotalMinor);
  check("no shipping until a method is picked", p.shippingMinor === null);

  p = await priceCart({ items: [{ variantId: scarf.id, quantity: 1 }], deliveryMethod: "standard", phone: "01099999999" });
  check("first order is NOT free any more → 60 EGP shipping", p.shippingMinor === 6000, p.shippingMinor);
  p = await priceCart({ items: [{ variantId: scarf.id, quantity: 1 }], deliveryMethod: "standard", phone: "01012345678" });
  check("small cart → 60 EGP shipping", p.shippingMinor === 6000, p.shippingMinor);
  p = await priceCart({ items: [{ variantId: blouse.id, quantity: 2 }], deliveryMethod: "standard", phone: "01012345678" });
  check("≥ 3000 EGP → free shipping", p.shippingMinor === 0, p.shippingMinor);
  check("only one delivery option is quoted", Object.keys(p.shippingOptions ?? {}).join() === "standard", p.shippingOptions);

  p = await priceCart({ items: [{ variantId: blouse.id, quantity: 1 }], coupon: "welcome10" });
  check("WELCOME10 (case-insensitive) = 10% of 1850", p.coupon?.ok === true && p.discountMinor === 18500, p.coupon);
  p = await priceCart({ items: [{ variantId: coat.id, quantity: 1 }], coupon: "WELCOME10" });
  check("WELCOME10 capped at 500 EGP", p.discountMinor === 50000, p.discountMinor);
  p = await priceCart({ items: [{ variantId: scarf.id, quantity: 1 }], coupon: "MALIKA200" });
  check("MALIKA200 rejected below minimum order", p.coupon?.ok === false && p.coupon.reason === "min_order", p.coupon);
  p = await priceCart({ items: [{ variantId: blouse.id, quantity: 1 }, { variantId: scarf.id, quantity: 1 }], coupon: "AW26" });
  check("AW26 only discounts collection items (blouse 15% of 1850)", p.discountMinor === 27750, p.discountMinor);
  p = await priceCart({ items: [{ variantId: scarf.id, quantity: 1 }], coupon: "OUTERWEAR5" });
  check("OUTERWEAR5 → no eligible items for a scarf", p.coupon?.ok === false && p.coupon.reason === "no_eligible_items", p.coupon);
  p = await priceCart({ items: [{ variantId: blouse.id, quantity: 1 }], coupon: "OLDSALE" });
  check("expired coupon rejected", p.coupon?.ok === false && p.coupon.reason === "expired", p.coupon);
  p = await priceCart({ items: [{ variantId: blouse.id, quantity: 1 }], coupon: "NOPE" });
  check("unknown coupon rejected", p.coupon?.ok === false && p.coupon.reason === "not_found", p.coupon);

  p = await priceCart({ items: [{ variantId: scarf.id, quantity: 999 }, { variantId: "00000000-0000-4000-8000-000000000000", quantity: 1 }] });
  check("quantity clamped to stock/10, unknown variant reported missing", p.lines[0]!.quantity <= 10 && p.lines[0]!.quantity === Math.min(10, scarf.stock) && p.missing.length === 1, { q: p.lines[0]?.quantity, m: p.missing });

  // ── order placement ──
  const before = (await variant("zahra-pleated-skirt", "Wine", "M")).stock;
  const skirt = await variant("zahra-pleated-skirt", "Wine", "M");
  const r1 = await placeOrder({ ...base, deliveryMethod: "standard", coupon: "WELCOME10", items: [{ variantId: skirt.id, quantity: 2 }] }, null, "en");
  check("guest order placed", r1.ok, r1);
  const [{ stock: after } = { stock: -1 }] = await db.select({ stock: productVariants.stock }).from(productVariants).where(eq(productVariants.id, skirt.id));
  check("stock decremented by 2", after === before - 2, { before, after });
  if (r1.ok) {
    const o = await getOrderForGuest(r1.number, "01155555555");
    check("guest tracking with correct phone", !!o && o.items.length === 1 && o.events[0]?.status === "pending", o);
    check("order totals add up", !!o && o.totalMinor === o.subtotalMinor - o.discountMinor + o.shippingMinor, o && { s: o.subtotalMinor, d: o.discountMinor, sh: o.shippingMinor, t: o.totalMinor });
    check("first order pays normal shipping (no free first delivery)", !!o && o.shippingMinor === (o.subtotalMinor - o.discountMinor >= 300000 ? 0 : 6000), o?.shippingMinor);
    check("plain cash order: nothing prepaid, no receipt", !!o && o.prepaidMinor === 0 && o.paymentProofUrl === null, o && { p: o.prepaidMinor, u: o.paymentProofUrl });
    check("guest tracking with wrong phone → null", (await getOrderForGuest(r1.number, "01000000000")) === null);
  }

  // per-customer coupon limit: same email cannot reuse WELCOME10
  const r2 = await placeOrder({ ...base, deliveryMethod: "standard", coupon: "WELCOME10", items: [{ variantId: blouse.id, quantity: 1 }] }, null, "en");
  check("WELCOME10 blocked on second use by same email", !r2.ok && r2.code === "coupon", r2);

  // last-unit protection
  const scarf2 = await variant("maya-leather-belt", "Black").catch(() => null);
  void scarf2;
  const [lastUnit] = await db.update(productVariants).set({ stock: 1 }).where(eq(productVariants.id, coat.id)).returning();
  const a = await placeOrder({ ...base, email: "a@example.com", phone: "01011111111", deliveryMethod: "standard", coupon: "", items: [{ variantId: lastUnit!.id, quantity: 1 }] }, null, "en");
  const b = await placeOrder({ ...base, email: "b@example.com", phone: "01022222222", deliveryMethod: "standard", coupon: "", items: [{ variantId: lastUnit!.id, quantity: 1 }] }, null, "en");
  check("last unit: first buyer succeeds, second gets stock error", a.ok && !b.ok && b.code === "stock", { a, b });
  const [{ stock: s0 } = { stock: -1 }] = await db.select({ stock: productVariants.stock }).from(productVariants).where(eq(productVariants.id, lastUnit!.id));
  check("stock never negative", s0 === 0, s0);

  const c = await placeOrder({ ...base, paymentMethod: "card", deliveryMethod: "standard", coupon: "", items: [{ variantId: blouse.id, quantity: 1 }] }, null, "en");
  check("disabled payment provider rejected", !c.ok && c.code === "payment", c);
  // ── wallet / InstaPay / cash-on-delivery deposit ──
  const proof = sign("/uploads/receipts/2026-01-01/test.jpg");
  const pay = { ...base, deliveryMethod: "standard" as const, coupon: "", items: [{ variantId: blouse.id, quantity: 1 }] };
  const w0 = await placeOrder({ ...pay, paymentMethod: "wallet", transferChannel: "wallet", senderPhone: "01033333333", receiptToken: proof }, null, "en");
  check("wallet rejected while no wallet number is configured", !w0.ok && w0.code === "payment", w0);

  await setSetting(db, "payments", { walletAccounts: ["01012345678 — Vodafone Cash"], instapayAccounts: [], depositMinor: 20000 });
  const noProof = await placeOrder({ ...pay, paymentMethod: "cod" }, null, "en");
  check("COD with a deposit needs the receipt + sender number", !noProof.ok && noProof.code === "proof", noProof);
  const forged = await placeOrder({ ...pay, paymentMethod: "cod", transferChannel: "wallet", senderPhone: "01033333333", receiptToken: "/uploads/receipts/evil.jpg.AAAA" }, null, "en");
  check("unsigned receipt URL rejected", !forged.ok && forged.code === "proof", forged);
  const badChannel = await placeOrder({ ...pay, paymentMethod: "cod", transferChannel: "instapay", senderPhone: "01033333333", receiptToken: proof }, null, "en");
  check("InstaPay channel rejected when no InstaPay account exists", !badChannel.ok && badChannel.code === "proof", badChannel);
  const dep = await placeOrder({ ...pay, paymentMethod: "cod", transferChannel: "wallet", senderPhone: "01033333333", receiptToken: proof }, null, "en");
  check("COD + deposit + receipt placed", dep.ok, dep);
  if (dep.ok) {
    const [o] = await db.select().from(orders).where(eq(orders.seq, Number(dep.number.slice(4)))).limit(1);
    check("deposit = 200 EGP, stored with channel, sender and receipt", o?.prepaidMinor === 20000 && o.transferChannel === "wallet" && o.senderPhone === "01033333333" && o.paymentProofUrl === "/uploads/receipts/2026-01-01/test.jpg" && o.paymentStatus === "pending", o);
    check("order total stays the full amount (deposit is deducted from what is collected)", !!o && o.totalMinor === o.subtotalMinor - o.discountMinor + o.shippingMinor && o.totalMinor - o.prepaidMinor === o.totalMinor - 20000, o?.totalMinor);
  }
  const wal = await placeOrder({ ...pay, paymentMethod: "wallet", transferChannel: "wallet", senderPhone: "01033333333", receiptToken: proof }, null, "en");
  check("wallet order placed", wal.ok, wal);
  if (wal.ok) {
    const [o] = await db.select().from(orders).where(eq(orders.seq, Number(wal.number.slice(4)))).limit(1);
    check("wallet order prepays the full total", !!o && o.prepaidMinor === o.totalMinor && o.paymentStatus === "pending", o && { p: o.prepaidMinor, t: o.totalMinor });
  }
  await setSetting(db, "payments", { walletAccounts: [], instapayAccounts: [], depositMinor: 0 });
  const off = await placeOrder({ ...pay, paymentMethod: "cod" }, null, "en");
  check("deposit off → plain COD needs no receipt", off.ok, off);

  const count = (await db.select().from(orders)).length;
  console.log(`orders in DB: ${count}`);
  console.log(failed ? `\n${failed} FAILED` : "\nAll checks passed.");
  process.exit(failed ? 1 : 0);
}
main();
