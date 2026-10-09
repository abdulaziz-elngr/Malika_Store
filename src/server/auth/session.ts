import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, lt } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { db } from "@/db/client";
import { customerSessions, customers } from "@/db/schema";

const COOKIE = "malika_session";
const MAX_AGE = 60 * 60 * 24 * 30;
const hash = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createSession(customerId: string) {
  const token = randomBytes(32).toString("base64url");
  await db.delete(customerSessions).where(lt(customerSessions.expiresAt, new Date())); // housekeeping
  const h = await headers();
  await db.insert(customerSessions).values({
    customerId,
    tokenHash: hash(token),
    expiresAt: new Date(Date.now() + MAX_AGE * 1000),
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: h.get("user-agent")?.slice(0, 200) ?? null,
  });
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: MAX_AGE });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db.delete(customerSessions).where(eq(customerSessions.tokenHash, hash(token)));
  jar.delete(COOKIE);
}

/** Drops every session of a customer, e.g. after a password change. */
export async function destroyAllSessions(customerId: string) {
  await db.delete(customerSessions).where(eq(customerSessions.customerId, customerId));
}

export type SessionCustomer = { id: string; email: string; name: string; phone: string | null };

/** The signed-in customer for this request, or null. Memoised per request. */
export const getCustomer = cache(async (): Promise<SessionCustomer | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const [row] = await db
    .select({ id: customers.id, email: customers.email, name: customers.name, phone: customers.phone })
    .from(customerSessions)
    .innerJoin(customers, eq(customers.id, customerSessions.customerId))
    .where(and(eq(customerSessions.tokenHash, hash(token)), gt(customerSessions.expiresAt, new Date())))
    .limit(1);
  return row ?? null;
});
