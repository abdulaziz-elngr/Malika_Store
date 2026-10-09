import { and, count, eq, or } from "drizzle-orm";
import type { Executor } from "@/db/client";
import { couponUsages, coupons } from "@/db/schema";
import type { CouponStatus } from "@/lib/cart-types";

export type CouponLine = { productId: string; categoryId: string | null; collectionIds: string[]; lineTotalMinor: number };
type Fail = Extract<CouponStatus, { ok: false }>["reason"];

export async function evaluateCoupon(
  ex: Executor,
  input: { code: string; lines: CouponLine[]; subtotalMinor: number; customerId?: string | null; email?: string | null },
): Promise<{ status: CouponStatus; couponId: string | null }> {
  const code = input.code.trim().toUpperCase();
  const fail = (reason: Fail, extra?: { minOrderMinor?: number }): { status: CouponStatus; couponId: null } => ({ status: { ok: false, code, reason, ...extra }, couponId: null });

  const [c] = await ex.select().from(coupons).where(eq(coupons.code, code)).limit(1);
  if (!c) return fail("not_found");
  const now = new Date();
  if (!c.active) return fail("inactive");
  if (c.startsAt && c.startsAt > now) return fail("not_started");
  if (c.expiresAt && c.expiresAt < now) return fail("expired");
  if (c.usageLimit != null && c.usedCount >= c.usageLimit) return fail("usage_limit");
  if (c.minOrderMinor != null && input.subtotalMinor < c.minOrderMinor) return fail("min_order", { minOrderMinor: c.minOrderMinor });

  if (c.perCustomerLimit != null && (input.customerId || input.email)) {
    const who = [input.customerId ? eq(couponUsages.customerId, input.customerId) : undefined, input.email ? eq(couponUsages.email, input.email.toLowerCase()) : undefined].filter((x) => !!x);
    const [{ n } = { n: 0 }] = await ex.select({ n: count() }).from(couponUsages).where(and(eq(couponUsages.couponId, c.id), or(...who)));
    if (n >= c.perCustomerLimit) return fail("customer_limit");
  }

  const restricted = c.productIds.length + c.categoryIds.length + c.collectionIds.length > 0;
  const eligible = input.lines
    .filter((l) => !restricted || c.productIds.includes(l.productId) || (l.categoryId != null && c.categoryIds.includes(l.categoryId)) || l.collectionIds.some((id) => c.collectionIds.includes(id)))
    .reduce((sum, l) => sum + l.lineTotalMinor, 0);
  if (eligible <= 0) return fail("no_eligible_items");

  let discount = c.type === "percent" ? Math.floor((eligible * Math.min(c.value, 100)) / 100) : Math.min(c.value, eligible);
  if (c.maxDiscountMinor != null) discount = Math.min(discount, c.maxDiscountMinor);
  discount = Math.min(discount, input.subtotalMinor);
  return { status: { ok: true, code, discountMinor: discount }, couponId: c.id };
}
