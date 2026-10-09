import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { adminUsers, roles } from "@/db/schema";

export async function getAdminById(id: string) {
  const [u] = await db.select({ id: adminUsers.id, name: adminUsers.name, email: adminUsers.email, roleKey: roles.key }).from(adminUsers).innerJoin(roles, eq(roles.id, adminUsers.roleId)).where(eq(adminUsers.id, id)).limit(1);
  return u ?? null;
}
