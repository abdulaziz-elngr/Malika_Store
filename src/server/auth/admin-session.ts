import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { cache } from "react";
import { db } from "@/db/client";
import { adminSessions, adminUsers, permissions, rolePermissions, roles } from "@/db/schema";
import { requestInfo } from "./request-info";

export const ADMIN_COOKIE = "malika_admin";
const ABSOLUTE_MS = 8 * 60 * 60_000; // a session never lives longer than a working day
const IDLE_MS = 2 * 60 * 60_000; // …and ends after two idle hours
const TOUCH_MS = 5 * 60_000;
const hash = (t: string) => createHash("sha256").update(t).digest("hex");

export type AdminSessionUser = {
  id: string;
  email: string;
  name: string;
  role: { id: string; key: string; nameAr: string; nameEn: string };
  isSuper: boolean;
  permissions: ReadonlySet<string>;
};

export async function createAdminSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const info = await requestInfo();
  await db.insert(adminSessions).values({ userId, tokenHash: hash(token), expiresAt: new Date(Date.now() + ABSOLUTE_MS), ...info });
  // SameSite=Strict: the admin cookie is never sent on cross-site requests, which blocks CSRF at the browser level.
  (await cookies()).set(ADMIN_COOKIE, token, { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: ABSOLUTE_MS / 1000 });
}

export async function destroyAdminSession() {
  const jar = await cookies();
  const token = jar.get(ADMIN_COOKIE)?.value;
  if (token) await db.delete(adminSessions).where(eq(adminSessions.tokenHash, hash(token)));
  jar.delete(ADMIN_COOKIE);
}

export async function destroyAllAdminSessions(userId: string) {
  await db.delete(adminSessions).where(eq(adminSessions.userId, userId));
}

/** The signed-in staff member for this request, with their permissions, or null. Memoised per request. */
export const getAdmin = cache(async (): Promise<AdminSessionUser | null> => {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  const now = Date.now();
  const [s] = await db
    .select({ sid: adminSessions.id, lastSeenAt: adminSessions.lastSeenAt, u: adminUsers, r: roles })
    .from(adminSessions)
    .innerJoin(adminUsers, eq(adminUsers.id, adminSessions.userId))
    .innerJoin(roles, eq(roles.id, adminUsers.roleId))
    .where(and(eq(adminSessions.tokenHash, hash(token)), gt(adminSessions.expiresAt, new Date(now)), gt(adminSessions.lastSeenAt, new Date(now - IDLE_MS)), eq(adminUsers.active, true)))
    .limit(1);
  if (!s) return null;
  if (now - s.lastSeenAt.getTime() > TOUCH_MS) await db.update(adminSessions).set({ lastSeenAt: new Date(now) }).where(eq(adminSessions.id, s.sid));
  const perms = await db.select({ key: permissions.key }).from(rolePermissions).innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId)).where(eq(rolePermissions.roleId, s.r.id));
  return {
    id: s.u.id, email: s.u.email, name: s.u.name,
    role: { id: s.r.id, key: s.r.key, nameAr: s.r.nameAr, nameEn: s.r.nameEn },
    isSuper: s.r.key === "super_admin",
    permissions: new Set(perms.map((p) => p.key)),
  };
});
