import { and, desc, eq, gte, sql } from "drizzle-orm";
import type { z } from "zod";
import { db } from "@/db/client";
import { addresses, couponUsages, coupons, customers, inventoryMovements, orderEvents, orderItems, orders, productVariants } from "@/db/schema";
import type { checkoutSchema } from "@/lib/validation/checkout";
import { paymentPlan } from "@/lib/payments";
import { normalizePhone } from "@/lib/validation/checkout";
import { unsign } from "@/server/auth/secret";
import { getPaymentProvider } from "@/server/payments/registry";
import type { SessionCustomer } from "@/server/auth/session";
import { priceCart } from "./cart";
import { notifyCustomer } from "./notifications";
import { getPaymentSettings } from "./settings";

export const formatOrderNumber = (seq: number) => `MLK-${seq}`;
export const parseOrderNumber = (n: string) => {
  const m = /^MLK-(\d{4,9})$/i.exec(n.trim());
  return m ? Number(m[1]) : null;
};

export type PlaceOrderResult =
  | { ok: true; number: string; redirectUrl?: string }
  | { ok: false; code: "stock" | "coupon" | "payment" | "proof" | "empty"; errors?: Record<string, string> };

class Abort extends Error {
  constructor(
    public code: Extract<PlaceOrderResult, { ok: false }>["code"],
    public errors?: Record<string, string>,
  ) {
    super(code);
  }
}

export async function placeOrder(input: z.output<typeof checkoutSchema>, customer: SessionCustomer | null, locale: "ar" | "en"): Promise<PlaceOrderResult> {
  const paymentSettings = await getPaymentSettings();
  const provider = getPaymentProvider(input.paymentMethod, paymentSettings);
  if (!provider) return { ok: false, code: "payment" };

  try {
    return await db.transaction(async (tx) => {
      // 1. Re-price everything from the database: the client's numbers are never trusted.
      const priced = await priceCart(
        { items: input.items, coupon: input.coupon, deliveryMethod: input.deliveryMethod, phone: input.phone, customerId: customer?.id, email: input.email },
        tx,
      );
      const buyable = priced.lines.filter((l) => l.quantity > 0);
      // Nothing buyable: an empty request is "empty", but items that sold out or vanished meanwhile are a stock problem.
      if (!buyable.length) throw new Abort(priced.lines.length || priced.missing.length ? "stock" : "empty");
      // Anything out of stock, reduced or removed means the customer must review the cart first.
      if (priced.hasIssues || priced.lines.some((l) => l.issue)) throw new Abort("stock");
      if (input.coupon && !priced.coupon?.ok) throw new Abort("coupon");

      // 1b. Payment: the deposit / prepaid amount is derived from the server-side total, never from the browser.
      // When a transfer is required, the receipt and the number it was sent from must come with the order.
      const plan = paymentPlan(provider.id, priced.totalMinor, paymentSettings);
      let transfer: { channel: string; senderPhone: string; proofUrl: string } | null = null;
      if (plan.needsTransfer) {
        const errors: Record<string, string> = {};
        const channel = input.transferChannel && plan.channels.includes(input.transferChannel) ? input.transferChannel : null;
        const senderPhone = normalizePhone(input.senderPhone ?? "");
        const proofUrl = unsign(input.receiptToken || undefined);
        if (!channel) errors.transferChannel = "required";
        if (!senderPhone) errors.senderPhone = input.senderPhone ? "phone" : "required";
        if (!proofUrl) errors.receiptToken = "required";
        if (Object.keys(errors).length) throw new Abort("proof", errors);
        transfer = { channel: channel!, senderPhone: senderPhone!, proofUrl: proofUrl! };
      }

      // 2. Reserve stock atomically: the conditional update fails if someone else bought the last unit meanwhile.
      for (const l of buyable) {
        const res = await tx
          .update(productVariants)
          .set({ stock: sql`${productVariants.stock} - ${l.quantity}`, updatedAt: new Date() })
          .where(and(eq(productVariants.id, l.variantId), gte(productVariants.stock, l.quantity)))
          .returning({ id: productVariants.id });
        if (!res.length) throw new Abort("stock");
      }

      // 3. Consume the coupon, respecting its global usage limit under concurrency.
      if (priced.couponId) {
        const res = await tx
          .update(coupons)
          .set({ usedCount: sql`${coupons.usedCount} + 1`, updatedAt: new Date() })
          .where(and(eq(coupons.id, priced.couponId), sql`(${coupons.usageLimit} is null or ${coupons.usedCount} < ${coupons.usageLimit})`))
          .returning({ id: coupons.id });
        if (!res.length) throw new Abort("coupon");
      }

      // 4. The order, its items and the first timeline event.
      const [order] = await tx
        .insert(orders)
        .values({
          customerId: customer?.id ?? null,
          email: input.email, name: input.name, phone: input.phone,
          governorate: input.governorate, city: input.city, line1: input.line1, line2: input.line2 || null, notes: input.notes || null,
          deliveryMethod: input.deliveryMethod, paymentMethod: provider.id,
          prepaidMinor: plan.prepaidMinor, transferChannel: transfer?.channel ?? null, senderPhone: transfer?.senderPhone ?? null, paymentProofUrl: transfer?.proofUrl ?? null,
          subtotalMinor: priced.subtotalMinor, shippingMinor: priced.shippingMinor ?? 0, discountMinor: priced.discountMinor, totalMinor: priced.totalMinor,
          couponId: priced.couponId, couponCode: priced.couponId && priced.coupon?.ok ? priced.coupon.code : null,
          locale,
        })
        .returning();
      if (!order) throw new Error("Order insert failed");
      const number = formatOrderNumber(order.seq);

      await tx.insert(orderItems).values(
        buyable.map((l) => ({
          orderId: order.id, productId: l.productId, variantId: l.variantId, slug: l.slug,
          nameAr: l.nameAr, nameEn: l.nameEn, sku: l.sku, size: l.size,
          colorNameAr: l.colorNameAr, colorNameEn: l.colorNameEn, colorHex: l.colorHex, imageUrl: l.imageUrl, tone: l.tone,
          unitPriceMinor: l.unitPriceMinor, quantity: l.quantity, lineTotalMinor: l.lineTotalMinor,
        })),
      );
      await tx.insert(orderEvents).values({ orderId: order.id, status: "pending", note: "Order placed" });
      await tx.insert(inventoryMovements).values(buyable.map((l) => ({ variantId: l.variantId, delta: -l.quantity, reason: "sale", note: number })));
      if (priced.couponId) await tx.insert(couponUsages).values({ couponId: priced.couponId, orderId: order.id, customerId: customer?.id ?? null, email: input.email, discountMinor: priced.discountMinor });

      // 5. Payment: the provider decides the initial payment state (cash stays pending until delivery).
      const payment = await provider.initiate({ orderId: order.id, orderNumber: number, totalMinor: priced.totalMinor, prepaidMinor: plan.prepaidMinor, customerEmail: input.email, locale });
      if (payment.paymentStatus !== "pending" || payment.reference)
        await tx.update(orders).set({ paymentStatus: payment.paymentStatus, paymentReference: payment.reference ?? null }).where(eq(orders.id, order.id));

      // 6. Account niceties for signed-in customers.
      if (customer) {
        await notifyCustomer(tx, {
          customerId: customer.id, kind: "order_placed", href: `/account/orders/${number}`,
          titleAr: `استلمنا طلبكِ ${number}`, titleEn: `We've received your order ${number}`,
          bodyAr: "سنؤكد الطلب قريباً ونبلغكِ بكل خطوة.", bodyEn: "We'll confirm it shortly and keep you posted at every step.",
        });
        if (!customer.phone) await tx.update(customers).set({ phone: input.phone, updatedAt: new Date() }).where(eq(customers.id, customer.id));
        if (input.saveAddress) {
          const [{ n } = { n: 0 }] = await tx.select({ n: sql<number>`count(*)::int` }).from(addresses).where(eq(addresses.customerId, customer.id));
          await tx.insert(addresses).values({
            customerId: customer.id, recipient: input.name, phone: input.phone, governorate: input.governorate, city: input.city,
            line1: input.line1, line2: input.line2 || null, notes: input.notes || null, isDefault: n === 0,
          });
        }
      }
      return { ok: true as const, number, redirectUrl: payment.redirectUrl };
    });
  } catch (e) {
    if (e instanceof Abort) return { ok: false, code: e.code, errors: e.errors };
    throw e;
  }
}

const withDetails = { items: true, events: true } as const;

export async function getCustomerOrders(customerId: string) {
  return db.query.orders.findMany({ where: eq(orders.customerId, customerId), orderBy: [desc(orders.createdAt)], with: { items: true } });
}

export async function getOrderForCustomer(customerId: string, number: string) {
  const seq = parseOrderNumber(number);
  if (!seq) return null;
  return (await db.query.orders.findFirst({ where: and(eq(orders.seq, seq), eq(orders.customerId, customerId)), with: withDetails })) ?? null;
}

export async function getOrderByNumber(number: string) {
  const seq = parseOrderNumber(number);
  if (!seq) return null;
  return (await db.query.orders.findFirst({ where: eq(orders.seq, seq), with: withDetails })) ?? null;
}

/** Guest tracking: the order number alone is not enough, the phone used at checkout must match too. */
export async function getOrderForGuest(number: string, phone: string) {
  const order = await getOrderByNumber(number);
  return order && order.phone === phone ? order : null;
}

export type OrderDetails = NonNullable<Awaited<ReturnType<typeof getOrderByNumber>>>;
