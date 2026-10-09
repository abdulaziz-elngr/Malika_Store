import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/db/client";
import { addresses, customers, products, wishlistItems } from "@/db/schema";
import { hashPassword, verifyPassword } from "@/server/auth/password";

// Verified against when the email is unknown, so response time does not reveal which emails have accounts.
const DUMMY_HASH = "scrypt$AAAAAAAAAAAAAAAAAAAAAA==$" + "A".repeat(86) + "==";

export async function registerCustomer(d: { name: string; email: string; phone: string; password: string }) {
  const [existing] = await db.select({ id: customers.id }).from(customers).where(eq(customers.email, d.email)).limit(1);
  if (existing) return { ok: false as const, code: "emailTaken" as const };
  const [row] = await db.insert(customers).values({ name: d.name, email: d.email, phone: d.phone, passwordHash: await hashPassword(d.password) }).returning({ id: customers.id });
  return { ok: true as const, id: row!.id };
}

export async function authenticate(email: string, password: string) {
  const [c] = await db.select().from(customers).where(eq(customers.email, email)).limit(1);
  const valid = await verifyPassword(password, c?.passwordHash ?? DUMMY_HASH);
  if (!c || !valid) return null;
  await db.update(customers).set({ lastLoginAt: new Date() }).where(eq(customers.id, c.id));
  return c;
}

export async function updateProfile(id: string, d: { name: string; phone: string }) {
  await db.update(customers).set({ name: d.name, phone: d.phone, updatedAt: new Date() }).where(eq(customers.id, id));
}

export async function changePassword(id: string, current: string, next: string) {
  const [c] = await db.select({ hash: customers.passwordHash }).from(customers).where(eq(customers.id, id)).limit(1);
  if (!c || !(await verifyPassword(current, c.hash))) return false;
  await db.update(customers).set({ passwordHash: await hashPassword(next), updatedAt: new Date() }).where(eq(customers.id, id));
  return true;
}

/* ───────── addresses ───────── */
export const listAddresses = (customerId: string) => db.select().from(addresses).where(eq(addresses.customerId, customerId)).orderBy(desc(addresses.isDefault), desc(addresses.createdAt));

type AddressInput = { label?: string; recipient: string; phone: string; governorate: string; city: string; line1: string; line2?: string; notes?: string; isDefault?: boolean };

export async function saveAddress(customerId: string, d: AddressInput, id?: string) {
  const values = { label: d.label || null, recipient: d.recipient, phone: d.phone, governorate: d.governorate, city: d.city, line1: d.line1, line2: d.line2 || null, notes: d.notes || null };
  await db.transaction(async (tx) => {
    const n = (await tx.select({ id: addresses.id }).from(addresses).where(eq(addresses.customerId, customerId))).length;
    const makeDefault = !!d.isDefault || (!id && n === 0);
    let savedId = id;
    if (id) {
      const res = await tx.update(addresses).set({ ...values, updatedAt: new Date() }).where(and(eq(addresses.id, id), eq(addresses.customerId, customerId))).returning({ id: addresses.id });
      if (!res.length) return;
    } else {
      const [row] = await tx.insert(addresses).values({ customerId, ...values, isDefault: false }).returning({ id: addresses.id });
      savedId = row!.id;
    }
    if (makeDefault && savedId) {
      await tx.update(addresses).set({ isDefault: false }).where(and(eq(addresses.customerId, customerId), ne(addresses.id, savedId)));
      await tx.update(addresses).set({ isDefault: true }).where(eq(addresses.id, savedId));
    }
  });
}

export async function deleteAddress(customerId: string, id: string) {
  await db.delete(addresses).where(and(eq(addresses.id, id), eq(addresses.customerId, customerId)));
}

/* ───────── wishlist ───────── */
export async function getWishlistIds(customerId: string) {
  const rows = await db.select({ id: wishlistItems.productId }).from(wishlistItems).where(eq(wishlistItems.customerId, customerId)).orderBy(desc(wishlistItems.createdAt));
  return rows.map((r) => r.id);
}

/** Adds products to the wishlist, silently skipping ids that are not real products. */
export async function addToWishlist(customerId: string, productIds: string[]) {
  if (!productIds.length) return;
  const real = await db.select({ id: products.id }).from(products).where(inArray(products.id, productIds));
  if (!real.length) return;
  await db.insert(wishlistItems).values(real.map((p) => ({ customerId, productId: p.id }))).onConflictDoNothing();
}

export async function removeFromWishlist(customerId: string, productId: string) {
  await db.delete(wishlistItems).where(and(eq(wishlistItems.customerId, customerId), eq(wishlistItems.productId, productId)));
}
