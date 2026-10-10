"use server";

import { revalidatePath } from "next/cache";
import type { PaymentSettings } from "@/lib/payments";
import { fieldErrors } from "@/lib/validation/checkout";
import { MAX_ORDER_ALERT_EMAILS, brandFormSchema, lowStockSchema, orderAlertEmailSchema, paymentSettingsSchema, roleFormSchema, seoFormSchema, shippingSettingsSchema, staffCreateSchema, staffPasswordSchema, staffUpdateSchema, themeContrastIssues, themeFormSchema } from "@/lib/validation/admin-system";
import { authorize } from "@/server/auth/rbac";
import { createRole, createStaff, deleteRole, deleteStaff, resetStaffPassword, updateRole, updateStaff } from "@/server/services/admin-staff";
import { getOrderAlertSettings, setSetting, type BrandSettings, type OrderAlertSettings, type SeoSettings, type ShippingSettings, type ThemeSettings } from "@/server/services/settings";
import { rateLimit } from "@/server/auth/rate-limit";
import { isMailConfigured } from "@/server/services/mailer";
import { sendOrderAlertTest } from "@/server/services/order-alerts";
import { db } from "@/db/client";
import { recordAudit } from "@/server/services/audit";
import type { ActionState } from "./types";

const str = (fd: FormData, k: string) => (typeof fd.get(k) === "string" ? (fd.get(k) as string) : "");

/* ───────── staff ───────── */

const staffError = (code: string): ActionState => {
  if (code === "emailTaken") return { errors: { email: "duplicate" } };
  if (code === "role") return { errors: { roleKey: "invalid" } };
  if (code === "selfRole") return { errors: { form: "selfRole" } };
  if (code === "selfActive") return { errors: { form: "selfActive" } };
  if (code === "self") return { errors: { form: "selfDelete" } };
  if (code === "lastSuper") return { errors: { form: "lastSuper" } };
  if (code === "not_found") return { errors: { form: "notFound" } };
  return { errors: { form: "invalid" } };
};

const revalidateStaff = () => {
  revalidatePath("/[locale]/admin/users", "page");
  revalidatePath("/[locale]/admin/roles", "page");
};

export async function createStaffAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await authorize("users:create");
  const parsed = staffCreateSchema.safeParse({
    name: str(fd, "name"),
    email: str(fd, "email"),
    password: str(fd, "password"),
    roleKey: str(fd, "roleKey"),
    active: str(fd, "active"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const res = await createStaff(admin, parsed.data);
  if (!res.ok) return staffError(res.code);
  revalidateStaff();
  return { ok: true, id: res.id };
}

export async function updateStaffAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await authorize("users:edit");
  const id = str(fd, "id");
  if (!id) return { errors: { form: "notFound" } };
  const parsed = staffUpdateSchema.safeParse({
    name: str(fd, "name"),
    email: str(fd, "email"),
    roleKey: str(fd, "roleKey"),
    active: str(fd, "active"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const res = await updateStaff(admin, id, parsed.data);
  if (!res.ok) return staffError(res.code);
  revalidateStaff();
  return { ok: true };
}

export async function resetStaffPasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await authorize("users:edit");
  const id = str(fd, "id");
  if (!id) return { errors: { form: "notFound" } };
  const parsed = staffPasswordSchema.safeParse({ password: str(fd, "password") });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const ok = await resetStaffPassword(admin, id, parsed.data.password);
  if (!ok) return { errors: { form: "notFound" } };
  revalidateStaff();
  return { ok: true };
}

export async function deleteStaffAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await authorize("users:delete");
  const res = await deleteStaff(admin, str(fd, "id"));
  if (!res.ok) return staffError(res.code);
  revalidateStaff();
  return { ok: true };
}

/* ───────── roles ───────── */

export async function createRoleAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await authorize("roles:create");
  const parsed = roleFormSchema.safeParse({
    key: str(fd, "key"),
    nameAr: str(fd, "nameAr"),
    nameEn: str(fd, "nameEn"),
    permissionKeys: safeArray(fd, "permissionKeys"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const res = await createRole(admin, parsed.data);
  if (!res.ok) return { errors: { key: "duplicate" } };
  revalidateStaff();
  return { ok: true, id: res.id };
}

export async function updateRoleAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await authorize("roles:edit");
  const id = str(fd, "id");
  if (!id) return { errors: { form: "notFound" } };
  const parsed = roleFormSchema.safeParse({
    key: str(fd, "key"),
    nameAr: str(fd, "nameAr"),
    nameEn: str(fd, "nameEn"),
    permissionKeys: safeArray(fd, "permissionKeys"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const res = await updateRole(admin, id, parsed.data);
  if (!res.ok) return { errors: { form: res.code === "locked" ? "roleLocked" : "notFound" } };
  revalidateStaff();
  return { ok: true };
}

export async function deleteRoleAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await authorize("roles:delete");
  const res = await deleteRole(admin, str(fd, "id"));
  if (!res.ok) {
    if (res.code === "inUse") return { errors: { form: "roleInUse" } };
    if (res.code === "system") return { errors: { form: "roleSystem" } };
    return { errors: { form: "notFound" } };
  }
  revalidateStaff();
  return { ok: true };
}

/** The permission matrix posts a JSON array (or repeated keys); both shapes land on the same list. */
function safeArray(fd: FormData, key: string): unknown[] {
  const all = fd.getAll(key).flatMap((v) => (typeof v === "string" && v.startsWith("[") ? JSON.parse(v) : [v]));
  return all.filter((v) => typeof v === "string");
}

/* ───────── theme ───────── */

export async function saveThemeAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await authorize("theme:manage_settings");
  const parsed = themeFormSchema.safeParse(Object.fromEntries(fd.entries()));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  // Contrast guard: recolouring is allowed, unreadable text is not.
  const issues = themeContrastIssues(parsed.data);
  if (issues.length) return { errors: { form: "contrast", ...Object.fromEntries(issues.map((i) => [i.pair, "contrast"])) } };

  const t = parsed.data;
  const theme: ThemeSettings = {
    light: { bg: t.bg, surface: t.surface, fg: t.fg, muted: t.muted, line: t.line, brand: t.brand, brandContrast: t.brandContrast, accent: t.accent },
    dark: { bg: t.darkBg, surface: t.darkSurface, fg: t.darkFg, muted: t.darkMuted, line: t.darkLine, brand: t.darkBrand, brandContrast: t.darkBrandContrast, accent: t.darkAccent },
    radius: t.radius,
  };
  await setSetting(db, "theme", theme, admin.id);
  await recordAudit(null, admin, { action: "theme.update", entity: "site_setting", entityId: "theme", summary: "Updated theme colours", after: { light: theme.light, dark: theme.dark, radius: theme.radius } });
  revalidatePath("/", "layout");
  return { ok: true };
}

/* ───────── brand (logo + favicon) ───────── */

export async function saveBrandAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await authorize("theme:manage_settings");
  const parsed = brandFormSchema.safeParse({ logoUrl: str(fd, "logoUrl"), logoDarkUrl: str(fd, "logoDarkUrl"), faviconUrl: str(fd, "faviconUrl") });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const brand: BrandSettings = parsed.data;
  await setSetting(db, "brand", brand, admin.id);
  await recordAudit(null, admin, { action: "brand.update", entity: "site_setting", entityId: "brand", summary: "Updated logo and favicon", after: brand });
  revalidatePath("/", "layout");
  return { ok: true };
}

/* ───────── SEO ───────── */

export async function saveSeoAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await authorize("seo:manage_settings");
  const parsed = seoFormSchema.safeParse({
    titleAr: str(fd, "titleAr"),
    titleEn: str(fd, "titleEn"),
    descriptionAr: str(fd, "descriptionAr"),
    descriptionEn: str(fd, "descriptionEn"),
    ogImage: str(fd, "ogImage"),
    robots: str(fd, "robots"),
    instagram: str(fd, "instagram"),
    tiktok: str(fd, "tiktok"),
    facebook: str(fd, "facebook"),
    x: str(fd, "x"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const { instagram, tiktok, facebook, x, ...rest } = parsed.data;
  const seo: SeoSettings = { ...rest, social: { instagram, tiktok, facebook, x } };
  await setSetting(db, "seo", seo, admin.id);
  await recordAudit(null, admin, { action: "seo.update", entity: "site_setting", entityId: "seo", summary: "Updated SEO settings", after: { titleEn: seo.titleEn, robots: seo.robots } });
  revalidatePath("/", "layout");
  return { ok: true };
}

/* ───────── site settings ───────── */

export async function saveShippingAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await authorize("settings:manage_settings");
  const parsed = shippingSettingsSchema.safeParse({
    standardMinor: str(fd, "standard"),
    freeThresholdMinor: str(fd, "freeThreshold"),
    standardMinDays: str(fd, "standardMinDays"),
    standardMaxDays: str(fd, "standardMaxDays"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const shipping: ShippingSettings = parsed.data;
  await setSetting(db, "shipping", shipping, admin.id);
  await recordAudit(null, admin, { action: "settings.shipping", entity: "site_setting", entityId: "shipping", summary: "Updated delivery rate & window", after: { ...shipping } });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function savePaymentsAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await authorize("settings:manage_settings");
  const parsed = paymentSettingsSchema.safeParse({ walletAccounts: str(fd, "walletAccounts"), instapayAccounts: str(fd, "instapayAccounts"), deposit: str(fd, "deposit") });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const payments: PaymentSettings = parsed.data;
  await setSetting(db, "payments", payments, admin.id);
  await recordAudit(null, admin, {
    action: "settings.payments",
    entity: "site_setting",
    entityId: "payments",
    summary: `Updated payment accounts (wallet ${payments.walletAccounts.length}, InstaPay ${payments.instapayAccounts.length}) and COD deposit`,
    after: { walletAccounts: payments.walletAccounts, instapayAccounts: payments.instapayAccounts, depositMinor: payments.depositMinor },
  });
  // Checkout reads these live, and the order screens show the amounts.
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function saveLowStockAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await authorize("settings:manage_settings");
  const parsed = lowStockSchema.safeParse({ threshold: str(fd, "threshold") });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  await setSetting(db, "lowStockThreshold", parsed.data.threshold, admin.id);
  await recordAudit(null, admin, { action: "settings.lowStock", entity: "site_setting", entityId: "lowStockThreshold", summary: `Low-stock threshold → ${parsed.data.threshold}`, after: { threshold: parsed.data.threshold } });
  revalidatePath("/[locale]/admin/inventory", "page");
  return { ok: true };
}

/* ───────── new-order email alerts ───────── */

const revalidateAlerts = () => revalidatePath("/[locale]/admin/settings", "page");

async function saveOrderAlerts(admin: Awaited<ReturnType<typeof authorize>>, next: OrderAlertSettings, summary: string) {
  await setSetting(db, "orderAlerts", next, admin.id);
  await recordAudit(null, admin, { action: "settings.orderAlerts", entity: "site_setting", entityId: "orderAlerts", summary, after: { enabled: next.enabled, emails: next.emails } });
  revalidateAlerts();
}

export async function addOrderAlertEmailAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await authorize("settings:manage_settings");
  const parsed = orderAlertEmailSchema.safeParse({ email: str(fd, "email") });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const current = await getOrderAlertSettings();
  if (current.emails.includes(parsed.data.email)) return { errors: { email: "duplicate" } };
  if (current.emails.length >= MAX_ORDER_ALERT_EMAILS) return { errors: { form: "limit" } };

  await saveOrderAlerts(admin, { ...current, emails: [...current.emails, parsed.data.email] }, `Added order alert email ${parsed.data.email}`);
  return { ok: true };
}

export async function removeOrderAlertEmailAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await authorize("settings:manage_settings");
  const email = str(fd, "email").trim().toLowerCase();
  const current = await getOrderAlertSettings();
  if (!current.emails.includes(email)) return { errors: { form: "notFound" } };

  await saveOrderAlerts(admin, { ...current, emails: current.emails.filter((e) => e !== email) }, `Removed order alert email ${email}`);
  return { ok: true };
}

export async function toggleOrderAlertsAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await authorize("settings:manage_settings");
  const enabled = str(fd, "enabled") === "true";
  const current = await getOrderAlertSettings();
  if (current.enabled === enabled) return { ok: true };

  await saveOrderAlerts(admin, { ...current, enabled }, `New-order email alerts ${enabled ? "enabled" : "disabled"}`);
  return { ok: true };
}

export async function sendTestOrderAlertAction(): Promise<ActionState> {
  await authorize("settings:manage_settings");
  if (!(await rateLimit("order-alert-test", 5, 10 * 60_000))) return { errors: { form: "rateLimited" } };
  if (!isMailConfigured()) return { errors: { form: "notConfigured" } };

  const { emails } = await getOrderAlertSettings();
  if (!emails.length) return { errors: { form: "noRecipients" } };

  const res = await sendOrderAlertTest(emails);
  return res.ok ? { ok: true } : { errors: { form: "sendFailed" } };
}
