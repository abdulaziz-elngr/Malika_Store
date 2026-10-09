"use server";

import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { fieldErrors } from "@/lib/validation/checkout";
import { loginSchema, registerSchema } from "@/lib/validation/account";
import { rateLimit } from "@/server/auth/rate-limit";
import { createSession, destroySession } from "@/server/auth/session";
import { authenticate, registerCustomer } from "@/server/services/customers";
import { recordLogin } from "@/server/services/login-activity";
import type { ActionState } from "./types";

/** Only same-site relative paths are allowed as a post-login destination (prevents open redirects). */
function safeNext(raw: FormDataEntryValue | null) {
  const v = typeof raw === "string" ? raw : "";
  if (!v.startsWith("/") || v.startsWith("//") || v.includes("\\")) return "/account";
  return v.replace(/^\/(ar|en)(?=\/|$)/, "") || "/account";
}

const str = (fd: FormData, k: string) => (typeof fd.get(k) === "string" ? (fd.get(k) as string) : "");

export async function loginAction(_: ActionState, fd: FormData): Promise<ActionState> {
  if (!(await rateLimit("login", 8, 10 * 60_000))) {
    await recordLogin({ kind: "customer", email: str(fd, "email"), success: false, reason: "rate_limited" });
    return { errors: { form: "rateLimited" } };
  }
  const parsed = loginSchema.safeParse({ email: str(fd, "email"), password: str(fd, "password") });
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: { email: str(fd, "email") } };
  const customer = await authenticate(parsed.data.email, parsed.data.password);
  if (!customer) {
    await recordLogin({ kind: "customer", email: parsed.data.email, success: false, reason: "bad_credentials" });
    return { errors: { form: "badCredentials" }, values: { email: parsed.data.email } };
  }
  await recordLogin({ kind: "customer", email: customer.email, userId: customer.id, success: true });
  await createSession(customer.id);
  redirect({ href: safeNext(fd.get("next")), locale: await getLocale() });
  return { ok: true };
}

export async function registerAction(_: ActionState, fd: FormData): Promise<ActionState> {
  if (!(await rateLimit("register", 5, 60 * 60_000))) return { errors: { form: "rateLimited" } };
  const values = { name: str(fd, "name"), email: str(fd, "email"), phone: str(fd, "phone") };
  const parsed = registerSchema.safeParse({ ...values, password: str(fd, "password") });
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  const res = await registerCustomer(parsed.data);
  if (!res.ok) return { errors: { email: "emailTaken" }, values };
  await createSession(res.id);
  redirect({ href: safeNext(fd.get("next")), locale: await getLocale() });
  return { ok: true };
}

export async function logoutAction() {
  await destroySession();
  redirect({ href: "/", locale: await getLocale() });
}
