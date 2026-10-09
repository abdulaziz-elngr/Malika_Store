import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import type { PermissionKey } from "@/lib/permissions";
import { getAdmin, type AdminSessionUser } from "./admin-session";

export class ForbiddenError extends Error {
  constructor(public permission: string) {
    super(`Missing permission: ${permission}`);
  }
}
export class UnauthenticatedError extends Error {}

export const can = (admin: AdminSessionUser | null, key: PermissionKey) => !!admin && (admin.isSuper || admin.permissions.has(key));

/** For admin pages: sends visitors to the sign-in page, and signed-in staff without the permission to the "forbidden" page. */
export async function requirePermission(key: PermissionKey) {
  const [admin, locale] = await Promise.all([getAdmin(), getLocale()]);
  if (!admin) redirect({ href: "/admin/login", locale });
  if (!can(admin, key)) redirect({ href: "/admin/forbidden", locale });
  return admin!;
}

/**
 * For server actions and route handlers: throws instead of redirecting.
 * Every mutation must call this itself — hiding a button in the UI is never the security boundary.
 */
export async function authorize(key: PermissionKey) {
  const admin = await getAdmin();
  if (!admin) throw new UnauthenticatedError();
  if (!can(admin, key)) throw new ForbiddenError(key);
  return admin;
}
