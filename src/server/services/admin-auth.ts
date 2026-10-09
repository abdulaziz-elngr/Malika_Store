import { eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { adminUsers } from "@/db/schema";
import { createAdminSchema } from "@/lib/validation/admin";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { recordAudit } from "./audit";
import { recordLogin } from "./login-activity";
import { roleIdByKey } from "./rbac";

export const MAX_FAILED_ATTEMPTS = 5;
export const LOCK_MINUTES = 15;
const DUMMY_HASH = "scrypt$AAAAAAAAAAAAAAAAAAAAAA==$" + "A".repeat(86) + "==";

export type AdminLoginResult = { ok: true; userId: string } | { ok: false; reason: "bad_credentials" | "locked" | "inactive" };

/**
 * Checks credentials with an account lockout (5 failures → 15 minutes) and records every attempt.
 * The caller shows the same generic message for every failure so accounts cannot be enumerated.
 */
export async function loginAdmin(email: string, password: string): Promise<AdminLoginResult> {
  const [u] = await db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1);
  // Always run one password verification, so response time does not reveal whether the account exists.
  const valid = await verifyPassword(password, u?.passwordHash ?? DUMMY_HASH);

  if (!u) {
    await recordLogin({ kind: "admin", email, success: false, reason: "bad_credentials" });
    return { ok: false, reason: "bad_credentials" };
  }
  if (u.lockedUntil && u.lockedUntil > new Date()) {
    await recordLogin({ kind: "admin", email, userId: u.id, success: false, reason: "locked" });
    return { ok: false, reason: "locked" };
  }
  if (!valid) {
    const [row] = await db.update(adminUsers).set({ failedAttempts: sql`${adminUsers.failedAttempts} + 1`, updatedAt: new Date() }).where(eq(adminUsers.id, u.id)).returning({ n: adminUsers.failedAttempts });
    if ((row?.n ?? 0) >= MAX_FAILED_ATTEMPTS) await db.update(adminUsers).set({ lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000), failedAttempts: 0 }).where(eq(adminUsers.id, u.id));
    await recordLogin({ kind: "admin", email, userId: u.id, success: false, reason: "bad_credentials" });
    return { ok: false, reason: "bad_credentials" };
  }
  if (!u.active) {
    await recordLogin({ kind: "admin", email, userId: u.id, success: false, reason: "inactive" });
    return { ok: false, reason: "inactive" };
  }
  await db.update(adminUsers).set({ failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() }).where(eq(adminUsers.id, u.id));
  await recordLogin({ kind: "admin", email, userId: u.id, success: true });
  return { ok: true, userId: u.id };
}

/** Creates a staff account. Used by the bootstrap script now and by the users screen in a later phase. */
export async function createAdminUser(input: { name: string; email: string; password: string; roleKey: string }, actor?: { id: string; name: string; roleKey?: string | null } | null) {
  const parsed = createAdminSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, code: "invalid" as const, issues: parsed.error.issues.map((i) => i.message) };
  const roleId = await roleIdByKey(parsed.data.roleKey);
  if (!roleId) return { ok: false as const, code: "role_not_found" as const };
  const [dupe] = await db.select({ id: adminUsers.id }).from(adminUsers).where(eq(adminUsers.email, parsed.data.email)).limit(1);
  if (dupe) return { ok: false as const, code: "email_taken" as const };
  const [row] = await db.insert(adminUsers).values({ email: parsed.data.email, name: parsed.data.name, roleId, passwordHash: await hashPassword(parsed.data.password) }).returning({ id: adminUsers.id });
  await recordAudit(null, actor ?? null, { action: "user.create", entity: "admin_user", entityId: row!.id, summary: `Created staff account ${parsed.data.email} (${parsed.data.roleKey})`, after: { email: parsed.data.email, role: parsed.data.roleKey } });
  return { ok: true as const, id: row!.id };
}

export async function countSuperAdmins() {
  const rows = await db.execute(sql`select count(*)::int as n from admin_user u join role r on r.id = u.role_id where r.key = 'super_admin' and u.active`);
  return Number((rows.rows[0] as { n: number } | undefined)?.n ?? 0);
}
