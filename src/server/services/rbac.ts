import { eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { permissions, rolePermissions, roles } from "@/db/schema";
import { ALL_PERMISSIONS, SYSTEM_ROLES, type SystemRoleKey } from "@/lib/permissions";

/**
 * Idempotent: makes sure every permission row and every system role exists.
 * New system roles get their preset permissions; existing roles are never overwritten (an admin may have
 * customised them), except super_admin which always receives any newly added permission.
 */
export async function syncRbac() {
  await db.insert(permissions).values(ALL_PERMISSIONS.map((key) => ({ key, resource: key.split(":")[0]!, action: key.split(":")[1]! }))).onConflictDoNothing();
  const permRows = await db.select().from(permissions);
  const idOf = new Map(permRows.map((p) => [p.key, p.id]));

  for (const [key, def] of Object.entries(SYSTEM_ROLES) as [SystemRoleKey, (typeof SYSTEM_ROLES)[SystemRoleKey]][]) {
    const [existing] = await db.select().from(roles).where(eq(roles.key, key)).limit(1);
    let roleId = existing?.id;
    if (!roleId) {
      const [row] = await db.insert(roles).values({ key, nameAr: def.nameAr, nameEn: def.nameEn, isSystem: true }).returning({ id: roles.id });
      roleId = row!.id;
      await db.insert(rolePermissions).values(def.permissions.map((p) => ({ roleId: roleId!, permissionId: idOf.get(p)! }))).onConflictDoNothing();
    } else if (key === "super_admin") {
      await db.insert(rolePermissions).values(def.permissions.map((p) => ({ roleId: roleId!, permissionId: idOf.get(p)! }))).onConflictDoNothing();
    }
  }
}

export async function roleIdByKey(key: string) {
  const [r] = await db.select({ id: roles.id }).from(roles).where(eq(roles.key, key)).limit(1);
  return r?.id ?? null;
}

export async function permissionKeysForRole(roleId: string) {
  const rows = await db.select({ key: permissions.key }).from(rolePermissions).innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId)).where(eq(rolePermissions.roleId, roleId));
  return rows.map((r) => r.key);
}

export const listRoles = () => db.select().from(roles).orderBy(roles.nameEn);
export const rolesByIds = (ids: string[]) => (ids.length ? db.select().from(roles).where(inArray(roles.id, ids)) : Promise.resolve([]));
