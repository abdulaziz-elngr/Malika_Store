import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { orderItems, orders, reviews } from "@/db/schema";

export const REVIEW_BODY_MAX = 1500;

export type PublicReview = { id: string; name: string; rating: number; body: string; createdAt: Date };

/** Approved reviews for the storefront, newest first. */
export async function getApprovedReviews(productId: string, limit = 30): Promise<PublicReview[]> {
  return db
    .select({ id: reviews.id, name: reviews.name, rating: reviews.rating, body: reviews.body, createdAt: reviews.createdAt })
    .from(reviews)
    .where(and(eq(reviews.productId, productId), eq(reviews.status, "approved")))
    .orderBy(desc(reviews.createdAt))
    .limit(limit);
}

export async function getRatingSummary(productId: string) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int`, avg: sql<number>`coalesce(avg(${reviews.rating}), 0)::float` })
    .from(reviews)
    .where(and(eq(reviews.productId, productId), eq(reviews.status, "approved")));
  return { count: row?.count ?? 0, average: row?.avg ?? 0 };
}

/** The customer's own review of a product (any status), if any. */
export async function getCustomerReview(customerId: string, productId: string) {
  const [row] = await db.select().from(reviews).where(and(eq(reviews.customerId, customerId), eq(reviews.productId, productId))).limit(1);
  return row ?? null;
}

/** A customer may review a product only after an order of theirs containing it has been delivered. */
export async function hasReceivedProduct(customerId: string, productId: string) {
  const [row] = await db
    .select({ one: sql<number>`1` })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(and(eq(orders.customerId, customerId), eq(orders.status, "delivered"), eq(orderItems.productId, productId)))
    .limit(1);
  return !!row;
}

/** Product ids from the given list that the customer has already reviewed → their review status. */
export async function getReviewStatusByProduct(customerId: string, productIds: string[]) {
  const map = new Map<string, "pending" | "approved" | "rejected">();
  if (!productIds.length) return map;
  const rows = await db.select({ productId: reviews.productId, status: reviews.status }).from(reviews).where(eq(reviews.customerId, customerId));
  const wanted = new Set(productIds);
  for (const r of rows) if (wanted.has(r.productId)) map.set(r.productId, r.status);
  return map;
}

export type SubmitReviewResult = { ok: true; status: "pending" | "approved" } | { ok: false; code: "notEligible" };

/**
 * Creates or updates the customer's review. Eligibility is re-checked here (never trust the client).
 * New and edited reviews go to moderation; an edit of an approved review is re-queued so edits can't bypass it.
 */
export async function submitReview(customer: { id: string; name: string; email: string }, productId: string, input: { rating: number; body: string }): Promise<SubmitReviewResult> {
  if (!(await hasReceivedProduct(customer.id, productId))) return { ok: false, code: "notEligible" };
  const existing = await getCustomerReview(customer.id, productId);
  if (existing) {
    await db.update(reviews).set({ rating: input.rating, body: input.body, status: "pending", featured: false, updatedAt: new Date() }).where(eq(reviews.id, existing.id));
  } else {
    await db
      .insert(reviews)
      .values({ productId, customerId: customer.id, name: customer.name, email: customer.email, rating: input.rating, body: input.body, status: "pending" })
      .onConflictDoNothing();
  }
  return { ok: true, status: "pending" };
}
