import { and, asc, eq, inArray } from "drizzle-orm";
import { db, type Executor } from "@/db/client";
import { productCollections, productImages, productVariants, products } from "@/db/schema";
import { MAX_LINE_QTY, type CartItem, type CartLine, type CartPricing } from "@/lib/cart-types";
import { unitPrice } from "@/lib/pricing";
import { DELIVERY_METHODS, FREE_SHIPPING_THRESHOLD_MINOR, shippingCost, type DeliveryMethodId } from "@/lib/shipping";
import { evaluateCoupon } from "./coupons";

export type PriceInput = {
  items: CartItem[];
  coupon?: string | null;
  deliveryMethod?: DeliveryMethodId | null;
  phone?: string | null;
  customerId?: string | null;
  email?: string | null;
};

/**
 * The single source of truth for money. The browser only sends variant ids and quantities;
 * prices, stock, coupon and shipping are always re-derived here (and again, inside a transaction, when the order is placed).
 */
export async function priceCart(input: PriceInput, ex: Executor = db): Promise<CartPricing & { couponId: string | null }> {
  const wanted = new Map<string, number>();
  for (const i of input.items) wanted.set(i.variantId, Math.min(MAX_LINE_QTY, (wanted.get(i.variantId) ?? 0) + Math.max(1, Math.floor(i.quantity))));
  const ids = [...wanted.keys()];

  const rows = ids.length
    ? await ex.select({ v: productVariants, p: products }).from(productVariants).innerJoin(products, eq(products.id, productVariants.productId)).where(and(inArray(productVariants.id, ids), eq(products.status, "published")))
    : [];
  const productIds = [...new Set(rows.map((r) => r.p.id))];
  const [images, pcs] = productIds.length
    ? await Promise.all([
        ex.select().from(productImages).where(inArray(productImages.productId, productIds)).orderBy(asc(productImages.sortOrder)),
        ex.select({ productId: productCollections.productId, collectionId: productCollections.collectionId }).from(productCollections).where(inArray(productCollections.productId, productIds)),
      ])
    : [[], []];

  const found = new Set(rows.map((r) => r.v.id));
  const missing = ids.filter((id) => !found.has(id));

  const lines: CartLine[] = [];
  for (const id of ids) {
    const r = rows.find((x) => x.v.id === id);
    if (!r) continue;
    const { v, p } = r;
    const own = images.filter((im) => im.productId === p.id);
    const img = own.find((im) => im.id === v.imageId) ?? own.find((im) => im.colorHex === v.colorHex) ?? own[0];
    const { price, original } = unitPrice(p, v);
    const asked = wanted.get(id)!;
    const quantity = Math.min(asked, v.stock);
    const issue: CartLine["issue"] = v.stock === 0 ? "out_of_stock" : quantity < asked ? "reduced" : null;
    lines.push({
      variantId: v.id, productId: p.id, sku: v.sku, slug: p.slug, nameAr: p.nameAr, nameEn: p.nameEn, size: v.size,
      colorNameAr: v.colorNameAr, colorNameEn: v.colorNameEn, colorHex: v.colorHex,
      imageUrl: img?.url ?? null, tone: img?.tone ?? "wine",
      unitPriceMinor: price, originalPriceMinor: original, stock: v.stock,
      quantity, lineTotalMinor: price * quantity, issue,
    });
  }

  const buyable = lines.filter((l) => l.quantity > 0);
  const subtotalMinor = buyable.reduce((s, l) => s + l.lineTotalMinor, 0);

  let coupon: CartPricing["coupon"] = null;
  let couponId: string | null = null;
  let discountMinor = 0;
  if (input.coupon?.trim() && buyable.length) {
    const res = await evaluateCoupon(ex, {
      code: input.coupon,
      subtotalMinor,
      customerId: input.customerId,
      email: input.email,
      lines: buyable.map((l) => {
        const p = rows.find((r) => r.p.id === l.productId)!.p;
        return { productId: l.productId, categoryId: p.categoryId, collectionIds: pcs.filter((c) => c.productId === l.productId).map((c) => c.collectionId), lineTotalMinor: l.lineTotalMinor };
      }),
    });
    coupon = res.status;
    if (res.status.ok) {
      discountMinor = res.status.discountMinor;
      couponId = res.couponId;
    }
  }

  const afterDiscount = subtotalMinor - discountMinor;
  let shippingMinor: number | null = null;
  let shippingOptions: Record<string, number> | null = null;
  if (buyable.length) {
    shippingOptions = Object.fromEntries(DELIVERY_METHODS.map((m) => [m.id, shippingCost(m.id, afterDiscount)]));
    if (input.deliveryMethod) shippingMinor = shippingOptions[input.deliveryMethod] ?? null;
  }

  return {
    lines, missing, subtotalMinor, discountMinor, shippingMinor, shippingOptions,
    totalMinor: afterDiscount + (shippingMinor ?? 0),
    coupon, couponId,
    freeShippingRemainingMinor: Math.max(0, FREE_SHIPPING_THRESHOLD_MINOR - afterDiscount),
    hasIssues: lines.some((l) => l.issue === "out_of_stock") || missing.length > 0,
  };
}
