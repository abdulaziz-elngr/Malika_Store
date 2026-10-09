import { count, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { adminSessions, adminUsers, permissions, rolePermissions, roles } from "@/db/schema";
import { ALL_PERMISSIONS, SYSTEM_ROLES, type PermissionKey } from "@/lib/permissions";
import { hashPassword } from "@/server/auth/password";
import type { AdminSessionUser } from "@/server/auth/admin-session";
import { recordAudit } from "./audit";

/* ───────── staff accounts ───────── */

export const listStaffAdmin = async () => {
  const rows = await db
    .select({ u: adminUsers, roleKey: roles.key, roleNameEn: roles.nameEn, roleNameAr: roles.nameAr })
    .from(adminUsers)
    .innerJoin(roles, eq(roles.id, adminUsers.roleId))
    .orderBy(adminUsers.createdAt);
  return rows;
};

export const getStaffAdmin = (id: string) =>
  db.query.adminUsers.findFirst({ where: eq(adminUsers.id, id), with: { role: true } });

export type StaffInput = { name: string; email: string; password: string; roleKey: string; active: boolean };

/** Kills every live session of a user (deactivation, password reset, role change, deletion). */
const revokeSessions = (userId: string) => db.delete(adminSessions).where(eq(adminSessions.userId, userId));

export async function createStaff(actor: AdminSessionUser, input: StaffInput) {
  const email = input.email.trim().toLowerCase();
  const [existing] = await db.select({ id: adminUsers.id }).from(adminUsers).where(eq(adminUsers.email, email)).limit(1);
  if (existing) return { ok: false as const, code: "emailTaken" as const };
  const [role] = await db.select({ id: roles.id }).from(roles).where(eq(roles.key, input.roleKey)).limit(1);
  if (!role) return { ok: false as const, code: "role" as const };

  const [row] = await db
    .insert(adminUsers)
    .values({ name: input.name.trim(), email, passwordHash: await hashPassword(input.password), roleId: role.id, active: input.active })
    .returning({ id: adminUsers.id });

  await recordAudit(null, actor, {
    action: "staff.create",
    entity: "admin_user",
    entityId: row!.id,
    summary: `Created staff account ${email} (${input.roleKey})`,
    after: { name: input.name, email, roleKey: input.roleKey, active: input.active },
  });
  return { ok: true as const, id: row!.id };
}

export async function updateStaff(actor: AdminSessionUser, id: string, patch: { name?: string; email?: string; roleKey?: string; active?: boolean }) {
  const before = await getStaffAdmin(id);
  if (!before) return { ok: false as const, code: "not_found" as const };

  // A person may not lift their own privileges or lock themselves out.
  if (actor.id === id && patch.roleKey && patch.roleKey !== before.role.key) return { ok: false as const, code: "selfRole" as const };
  if (actor.id === id && patch.active === false) return { ok: false as const, code: "selfActive" as const };

  const values: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.name) values.name = patch.name.trim();
  if (patch.email) {
    const email = patch.email.trim().toLowerCase();
    if (email !== before.email) {
      const [dupe] = await db.select({ id: adminUsers.id }).from(adminUsers).where(eq(adminUsers.email, email)).limit(1);
      if (dupe) return { ok: false as const, code: "emailTaken" as const };
    }
    values.email = email;
  }
  if (patch.roleKey) {
    const [role] = await db.select({ id: roles.id }).from(roles).where(eq(roles.key, patch.roleKey)).limit(1);
    if (!role) return { ok: false as const, code: "role" as const };
    values.roleId = role.id;
  }
  if (patch.active !== undefined) values.active = patch.active;

  await db.update(adminUsers).set(values).where(eq(adminUsers.id, id));
  // Losing access or changing role must end existing sessions — otherwise an old cookie outlives the change.
  if (patch.active === false || patch.roleKey) await revokeSessions(id);

  await recordAudit(null, actor, {
    action: "staff.update",
    entity: "admin_user",
    entityId: id,
    summary: `Updated staff account ${before.email}`,
    before: { name: before.name, email: before.email, roleKey: before.role.key, active: before.active },
    after: { name: patch.name ?? before.name, email: patch.email ?? before.email, roleKey: patch.roleKey ?? before.role.key, active: patch.active ?? before.active },
  });
  return { ok: true as const };
}

export async function resetStaffPassword(actor: AdminSessionUser, id: string, password: string) {
  const before = await getStaffAdmin(id);
  if (!before) return false;
  await db.update(adminUsers).set({ passwordHash: await hashPassword(password), failedAttempts: 0, lockedUntil: null, updatedAt: new Date() }).where(eq(adminUsers.id, id));
  await revokeSessions(id); // a password change must not leave old sessions valid
  await recordAudit(null, actor, { action: "staff.password", entity: "admin_user", entityId: id, summary: `Reset password for ${before.email}`, after: { password: "[redacted]" } });
  return true;
}

export async function deleteStaff(actor: AdminSessionUser, id: string) {
  if (actor.id === id) return { ok: false as const, code: "self" as const };
  const before = await getStaffAdmin(id);
  if (!before) return { ok: false as const, code: "not_found" as const };

  // Never remove the last super admin — that would brick the installation.
  if (before.role.key === "super_admin") {
    const [{ n } = { n: 0 }] = await db
      .select({ n: count() })
      .from(adminUsers)
      .innerJoin(roles, eq(roles.id, adminUsers.roleId))
      .where(eq(roles.key, "super_admin"));
    if (n <= 1) return { ok: false as const, code: "lastSuper" as const };
  }

  await db.delete(adminUsers).where(eq(adminUsers.id, id));
  await recordAudit(null, actor, { action: "staff.delete", entity: "admin_user", entityId: id, summary: `Deleted staff account ${before.email}`, before: { name: before.name, email: before.email, roleKey: before.role.key } });
  return { ok: true as const };
}

/* ───────── roles ───────── */

export const listRolesAdmin = async () => {
  const rows = await db
    // Written out as "role"."id" — ${roles.id} would render bare inside the field list and bind to admin_user.id.
    .select({ r: roles, permCount: count(rolePermissions.permissionId), userCount: sql<number>`(select count(*)::int from admin_user u where u.role_id = "role"."id")` })
    .from(roles)
    .leftJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
    .groupBy(roles.id)
    .orderBy(sql`${roles.isSystem} desc`, roles.nameEn);
  return rows;
};

export async function getRoleAdmin(id: string) {
  const role = await db.query.roles.findFirst({ where: eq(roles.id, id) });
  if (!role) return null;
  const keys = await db.select({ key: permissions.key }).from(rolePermissions).innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId)).where(eq(rolePermissions.roleId, id));
  return { role, permissionKeys: keys.map((k) => k.key as PermissionKey) };
}

export type RoleInput = { nameAr: string; nameEn: string; permissionKeys: PermissionKey[] };

/** super_admin always holds every permission, so its set is never written from the UI. */
const effectiveKeys = (roleKey: string, keys: PermissionKey[]) => {
  const valid = new Set<string>(ALL_PERMISSIONS);
  const cleaned = [...new Set(keys)].filter((k) => valid.has(k));
  return roleKey === "super_admin" ? ALL_PERMISSIONS : cleaned;
};

async function writeRolePermissions(roleId: string, keys: PermissionKey[]) {
  await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
  if (!keys.length) return;
  const rows = await db.select({ id: permissions.id, key: permissions.key }).from(permissions);
  const idOf = new Map(rows.map((p) => [p.key, p.id]));
  const values = keys.map((k) => ({ roleId, permissionId: idOf.get(k)! })).filter((v) => v.permissionId);
  if (values.length) await db.insert(rolePermissions).values(values).onConflictDoNothing();
}

export async function createRole(actor: AdminSessionUser, input: RoleInput & { key: string }) {
  const [existing] = await db.select({ id: roles.id }).from(roles).where(eq(roles.key, input.key)).limit(1);
  if (existing) return { ok: false as const, code: "keyTaken" as const };
  const [row] = await db.insert(roles).values({ key: input.key, nameAr: input.nameAr, nameEn: input.nameEn, isSystem: false }).returning({ id: roles.id });
  await writeRolePermissions(row!.id, effectiveKeys(input.key, input.permissionKeys));
  await recordAudit(null, actor, { action: "role.create", entity: "role", entityId: row!.id, summary: `Created role ${input.nameEn}`, after: { key: input.key, nameEn: input.nameEn, permissions: input.permissionKeys.length } });
  return { ok: true as const, id: row!.id };
}

export async function updateRole(actor: AdminSessionUser, id: string, input: RoleInput) {
  const before = await getRoleAdmin(id);
  if (!before) return { ok: false as const, code: "not_found" as const };
  if (before.role.key === "super_admin") return { ok: false as const, code: "locked" as const };

  await db.update(roles).set({ nameAr: input.nameAr, nameEn: input.nameEn, updatedAt: new Date() }).where(eq(roles.id, id));
  await writeRolePermissions(id, effectiveKeys(before.role.key, input.permissionKeys));

  const removed = before.permissionKeys.filter((k) => !input.permissionKeys.includes(k));
  await recordAudit(null, actor, {
    action: "role.update",
    entity: "role",
    entityId: id,
    summary: `Updated role ${before.role.nameEn} (${input.permissionKeys.length} permissions)`,
    before: { nameEn: before.role.nameEn, nameAr: before.role.nameAr, permissions: before.permissionKeys },
    after: { nameEn: input.nameEn, nameAr: input.nameAr, permissions: input.permissionKeys, removed },
  });
  return { ok: true as const };
}

export async function deleteRole(actor: AdminSessionUser, id: string) {
  const before = await db.query.roles.findFirst({ where: eq(roles.id, id) });
  if (!before) return { ok: false as const, code: "not_found" as const };
  if (before.isSystem) return { ok: false as const, code: "system" as const };

  const [{ n } = { n: 0 }] = await db.select({ n: count() }).from(adminUsers).where(eq(adminUsers.roleId, id));
  if (n > 0) return { ok: false as const, code: "inUse" as const };

  await db.delete(roles).where(eq(roles.id, id));
  await recordAudit(null, actor, { action: "role.delete", entity: "role", entityId: id, summary: `Deleted role ${before.nameEn}`, before: { key: before.key, nameEn: before.nameEn } });
  return { ok: true as const };
}

/** Everything the roles editor needs in one call: known roles, permission catalogue, preset sets. */
export async function roleEditorData() {
  const perms = await db.select().from(permissions).orderBy(permissions.resource, permissions.action);
  return {
    permissions: perms.length ? perms : ALL_PERMISSIONS.map((key) => ({ id: key, key, resource: key.split(":")[0]!, action: key.split(":")[1]! })),
    presets: SYSTEM_ROLES,
  };
}

/** Role options for the staff form (key + bilingual label). */
export const roleOptions = () => db.select({ key: roles.key, nameAr: roles.nameAr, nameEn: roles.nameEn, isSystem: roles.isSystem }).from(roles).orderBy(roles.nameEn);
