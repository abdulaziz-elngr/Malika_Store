import { eq } from "drizzle-orm";
import { db } from "../src/db/client";
import { adminUsers, auditLogs, loginActivity, permissions, rolePermissions, roles } from "../src/db/schema";
import { ALL_PERMISSIONS, SYSTEM_ROLES, type SystemRoleKey } from "../src/lib/permissions";
import { createAdminUser, loginAdmin, LOCK_MINUTES, MAX_FAILED_ATTEMPTS } from "../src/server/services/admin-auth";
import { changedFields, recordAudit, redact } from "../src/server/services/audit";
import { permissionKeysForRole, syncRbac } from "../src/server/services/rbac";
import { hashPassword, verifyPassword } from "../src/server/auth/password";
import { sign, unsign } from "../src/server/auth/secret";

let failed = 0;
const check = (name: string, ok: boolean, extra?: unknown) => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  → " + JSON.stringify(extra)}`); if (!ok) failed++; };
const PW = "Malika#Admin2026";

async function main() {
  // ── RBAC catalogue ──
  const permCount = (await db.select().from(permissions)).length;
  check(`permission catalogue synced (${ALL_PERMISSIONS.length} rows)`, permCount === ALL_PERMISSIONS.length, permCount);
  for (const key of Object.keys(SYSTEM_ROLES) as SystemRoleKey[]) {
    const [r] = await db.select().from(roles).where(eq(roles.key, key));
    const keys = await permissionKeysForRole(r!.id);
    check(`role ${key}: ${keys.length} permissions match the preset`, !!r && r.isSystem && keys.length === new Set(SYSTEM_ROLES[key].permissions).size && SYSTEM_ROLES[key].permissions.every((p) => keys.includes(p)), keys.length);
  }
  const keysOf = async (k: string) => { const [r] = await db.select().from(roles).where(eq(roles.key, k)); return new Set(await permissionKeysForRole(r!.id)); };
  const support = await keysOf("customer_support"), inventory = await keysOf("inventory_manager"), content = await keysOf("content_manager"), admin = await keysOf("admin"), marketing = await keysOf("marketing_manager");
  check("customer support can edit orders but not delete or touch products", support.has("orders:edit") && !support.has("orders:delete") && !support.has("products:edit"));
  check("inventory manager edits inventory, only views products", inventory.has("inventory:edit") && inventory.has("products:view") && !inventory.has("products:edit") && !inventory.has("orders:edit"));
  check("content manager publishes pages & homepage but cannot see customers/orders", content.has("pages:publish") && content.has("homepage:edit") && !content.has("customers:view") && !content.has("orders:view"));
  check("marketing manager manages coupons, not inventory", marketing.has("coupons:create") && !marketing.has("inventory:view"));
  check("admin cannot manage roles or delete staff", !admin.has("roles:view") && !admin.has("users:delete") && admin.has("users:create"));
  check("nobody except super admin can manage roles", (await Promise.all((["manager","content_manager","marketing_manager","inventory_manager","customer_support"] as const).map(keysOf))).every((s) => ![...s].some((p) => p.startsWith("roles:"))));

  // idempotent sync must not overwrite a customised system role
  const [mgr] = await db.select().from(roles).where(eq(roles.key, "manager"));
  const [extra] = await db.select().from(permissions).where(eq(permissions.key, "users:delete"));
  await db.insert(rolePermissions).values({ roleId: mgr!.id, permissionId: extra!.id });
  await syncRbac();
  check("re-sync keeps customisations and creates no duplicates", (await keysOf("manager")).has("users:delete") && (await db.select().from(permissions)).length === ALL_PERMISSIONS.length);

  // ── login + lockout ──
  const ok = await loginAdmin("super-admin@malika.test", PW);
  check("valid staff login succeeds", ok.ok);
  const bad = await loginAdmin("super-admin@malika.test", "wrong-password");
  check("wrong password rejected", !bad.ok && bad.reason === "bad_credentials", bad);
  const ghost = await loginAdmin("nobody@malika.test", PW);
  check("unknown email rejected with the same reason", !ghost.ok && ghost.reason === "bad_credentials", ghost);

  const victim = "customer-support@malika.test";
  for (let i = 0; i < MAX_FAILED_ATTEMPTS; i++) await loginAdmin(victim, "nope-" + i);
  const locked = await loginAdmin(victim, PW);
  check(`account locks after ${MAX_FAILED_ATTEMPTS} failures — even the right password is refused`, !locked.ok && locked.reason === "locked", locked);
  const [u] = await db.select().from(adminUsers).where(eq(adminUsers.email, victim));
  const mins = u!.lockedUntil ? Math.round((u!.lockedUntil.getTime() - Date.now()) / 60000) : 0;
  check(`lock lasts about ${LOCK_MINUTES} minutes`, mins >= LOCK_MINUTES - 1 && mins <= LOCK_MINUTES, mins);
  await db.update(adminUsers).set({ lockedUntil: new Date(Date.now() - 1000) }).where(eq(adminUsers.id, u!.id));
  check("login works again once the lock expires", (await loginAdmin(victim, PW)).ok);

  await db.update(adminUsers).set({ active: false }).where(eq(adminUsers.email, "marketing-manager@malika.test"));
  const inactive = await loginAdmin("marketing-manager@malika.test", PW);
  check("deactivated staff cannot sign in", !inactive.ok && inactive.reason === "inactive", inactive);

  const acts = await db.select().from(loginActivity);
  check("every attempt is recorded in login activity", acts.filter((a) => a.kind === "admin").length === 11 && acts.some((a) => a.success) && acts.some((a) => a.reason === "locked"), acts.length);

  // ── staff creation rules ──
  check("weak staff password rejected", (await createAdminUser({ name: "X Y", email: "weak@malika.test", password: "short1A", roleKey: "admin" })).ok === false);
  check("duplicate staff email rejected", (await createAdminUser({ name: "Dup", email: "super-admin@malika.test", password: PW + "x", roleKey: "admin" })).ok === false);
  check("unknown role rejected", (await createAdminUser({ name: "Nope", email: "norole@malika.test", password: PW + "x", roleKey: "ghost" })).ok === false);

  // ── audit log ──
  const before = { price: 1850, name: "Layla", passwordHash: "x" }, after = { price: 1990, name: "Layla", passwordHash: "y" };
  const d = changedFields(before, after);
  check("audit diff keeps only changed fields", JSON.stringify(d) === JSON.stringify({ before: { price: 1850, passwordHash: "x" }, after: { price: 1990, passwordHash: "y" } }), d);
  check("secrets are redacted", JSON.stringify(redact({ a: { passwordHash: "s", token: "t", ok: 1 } })) === '{"a":{"passwordHash":"[redacted]","token":"[redacted]","ok":1}}');
  await recordAudit(null, { id: u!.id, name: "Test Admin", roleKey: "admin" }, { action: "product.update", entity: "product", entityId: "p1", summary: "Changed price 1850 → 1990", ...d });
  const [row] = await db.select().from(auditLogs).where(eq(auditLogs.action, "product.update"));
  check("audit row stores actor, entity and before/after", !!row && row.userName === "Test Admin" && (row.after as { passwordHash: string }).passwordHash === "[redacted]" && (row.before as { price: number }).price === 1850, row);
  const creates = await db.select().from(auditLogs).where(eq(auditLogs.action, "user.create"));
  check("staff creation was audited", creates.length >= 7, creates.length);

  // ── crypto helpers ──
  const h = await hashPassword("Same-Password-1");
  check("scrypt: salted, verifies, rejects wrong", h !== (await hashPassword("Same-Password-1")) && (await verifyPassword("Same-Password-1", h)) && !(await verifyPassword("other", h)));
  const s = sign("MLK-10291");
  check("signed cookie value verifies and detects tampering", unsign(s) === "MLK-10291" && unsign(s.replace("MLK-10291", "MLK-10292")) === null && unsign("x") === null && unsign(undefined) === null);

  console.log(failed ? `\n${failed} FAILED` : "\nAll checks passed.");
  process.exit(failed ? 1 : 0);
}
main();
