"use server";

import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { adminLoginSchema } from "@/lib/validation/admin";
import { fieldErrors } from "@/lib/validation/checkout";
import { createAdminSession, destroyAdminSession, getAdmin } from "@/server/auth/admin-session";
import { rateLimit } from "@/server/auth/rate-limit";
import { recordAudit } from "@/server/services/audit";
import { loginAdmin } from "@/server/services/admin-auth";
import { recordLogin } from "@/server/services/login-activity";
import { getAdminById } from "@/server/services/admin-users";
import type { ActionState } from "./types";

const str = (fd: FormData, k: string) => (typeof fd.get(k) === "string" ? (fd.get(k) as string) : "");

export async function adminLoginAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const email = str(fd, "email");
  if (!(await rateLimit("admin-login", 10, 10 * 60_000))) {
    await recordLogin({ kind: "admin", email, success: false, reason: "rate_limited" });
    return { errors: { form: "rateLimited" }, values: { email } };
  }
  const parsed = adminLoginSchema.safeParse({ email, password: str(fd, "password") });
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: { email } };

  const res = await loginAdmin(parsed.data.email, parsed.data.password);
  // One message for every failure (wrong password, unknown email, locked, disabled): nothing to enumerate.
  if (!res.ok) return { errors: { form: "adminBadCredentials" }, values: { email } };

  await createAdminSession(res.userId);
  const u = await getAdminById(res.userId);
  await recordAudit(null, u ? { id: u.id, name: u.name, roleKey: u.roleKey } : null, { action: "auth.login", entity: "admin_user", entityId: res.userId, summary: `${parsed.data.email} signed in` });
  redirect({ href: "/admin", locale: await getLocale() });
  return { ok: true };
}

export async function adminLogoutAction() {
  const admin = await getAdmin();
  if (admin) await recordAudit(null, { id: admin.id, name: admin.name, roleKey: admin.role.key }, { action: "auth.logout", entity: "admin_user", entityId: admin.id, summary: `${admin.email} signed out` });
  await destroyAdminSession();
  redirect({ href: "/admin/login", locale: await getLocale() });
}
