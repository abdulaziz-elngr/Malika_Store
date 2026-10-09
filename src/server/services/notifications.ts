import { and, desc, eq, isNull, count } from "drizzle-orm";
import { db, type Executor } from "@/db/client";
import { notifications } from "@/db/schema";

export async function notifyCustomer(ex: Executor, n: { customerId: string; kind: string; titleAr: string; titleEn: string; bodyAr?: string; bodyEn?: string; href?: string }) {
  await ex.insert(notifications).values({ audience: "customer", ...n });
}

export const listCustomerNotifications = (customerId: string) =>
  db.select().from(notifications).where(and(eq(notifications.customerId, customerId), eq(notifications.audience, "customer"))).orderBy(desc(notifications.createdAt)).limit(50);

export async function unreadCount(customerId: string) {
  const [{ n } = { n: 0 }] = await db.select({ n: count() }).from(notifications).where(and(eq(notifications.customerId, customerId), isNull(notifications.readAt)));
  return n;
}

export const markAllRead = (customerId: string) => db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.customerId, customerId), isNull(notifications.readAt)));
