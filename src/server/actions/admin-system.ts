"use server";

import { revalidatePath } from "next/cache";
import { fieldErrors } from "@/lib/validation/checkout";
import { brandFormSchema, lowStockSchema, roleFormSchema, seoFormSchema, shippingSettingsSchema, staffCreateSchema, staffPasswordSchema, staffUpdateSchema, themeContrastIssues, themeFormSchema } from "@/lib/validation/admin-system";
import { authorize } from "@/server/auth/rbac";
import { createRole, createStaff, deleteRole, deleteStaff, resetStaffPassword, updateRole, updateStaff } from "@/server/services/admin-staff";
import { setSetting, type BrandSettings, type SeoSettings, type ShippingSettings, type ThemeSettings } from "@/server/services/settings";
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
    expressMinor: str(fd, "express"),
    freeThresholdMinor: str(fd, "freeThreshold"),
    standardMinDays: str(fd, "standardMinDays"),
    standardMaxDays: str(fd, "standardMaxDays"),
    expressMinDays: str(fd, "expressMinDays"),
    expressMaxDays: str(fd, "expressMaxDays"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const shipping: ShippingSettings = parsed.data;
  await setSetting(db, "shipping", shipping, admin.id);
  await recordAudit(null, admin, { action: "settings.shipping", entity: "site_setting", entityId: "shipping", summary: "Updated shipping rates & windows", after: { ...shipping } });
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
