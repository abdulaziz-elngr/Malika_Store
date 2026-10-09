import { z } from "zod";
import { ALL_PERMISSIONS, type PermissionKey } from "@/lib/permissions";
import { adminPasswordSchema } from "./admin";

/** Admin system forms: staff accounts, roles, theme, SEO and site settings. */

const optional = (max = 500) => z.string().trim().max(max, "tooLong");
const flag = z.enum(["true", "false"]).transform((v) => v === "true");
const email = z.string().trim().toLowerCase().min(1, "required").max(160, "tooLong").pipe(z.email("email"));
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "hex");

/* ───────── staff ───────── */

export const staffCreateSchema = z.object({
  name: z.string().trim().min(2, "required").max(80, "tooLong"),
  email,
  password: adminPasswordSchema,
  roleKey: z.string().min(1, "required"),
  active: flag,
});

export const staffUpdateSchema = z.object({
  name: z.string().trim().min(2, "required").max(80, "tooLong"),
  email,
  roleKey: z.string().min(1, "required"),
  active: flag,
});

export const staffPasswordSchema = z.object({ password: adminPasswordSchema });

/* ───────── roles ───────── */

export const roleFormSchema = z.object({
  key: z
    .string()
    .trim()
    .min(2, "required")
    .max(40, "tooLong")
    .regex(/^[a-z][a-z0-9_]*$/, "keyFormat"),
  nameAr: z.string().trim().min(2, "required").max(60, "tooLong"),
  nameEn: z.string().trim().min(2, "required").max(60, "tooLong"),
  permissionKeys: z
    .array(z.string().max(80))
    .max(400)
    .transform((keys) => keys.filter((k) => (ALL_PERMISSIONS as string[]).includes(k)) as PermissionKey[]),
});

/* ───────── theme ───────── */

export const themeFormSchema = z.object({
  bg: hex, surface: hex, fg: hex, muted: hex, line: hex, brand: hex, brandContrast: hex, accent: hex,
  darkBg: hex, darkSurface: hex, darkFg: hex, darkMuted: hex, darkLine: hex, darkBrand: hex, darkBrandContrast: hex, darkAccent: hex,
  radius: z.string().trim().transform((v, ctx) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0 || n > 16) {
      ctx.addIssue({ code: "custom", message: "number" });
      return 2;
    }
    return Math.round(n * 10) / 10;
  }),
});

export type ThemeFormInput = z.input<typeof themeFormSchema>;

/** WCAG relative luminance of a #rrggbb colour. */
function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    .map((c) => c as number) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contrast ratio between two colours (1–21). */
export function contrastRatio(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

export type ContrastIssue = { pair: "fgOnBg" | "mutedOnBg" | "brandText" | "darkFgOnBg" | "darkBrandText"; ratio: number };

const MIN_TEXT = 4.5;

/** The theme editor may recolour the site, but never below readable contrast. */
export function themeContrastIssues(t: z.infer<typeof themeFormSchema>): ContrastIssue[] {
  const out: ContrastIssue[] = [];
  const check = (pair: ContrastIssue["pair"], a: string, b: string) => {
    const ratio = contrastRatio(a, b);
    if (ratio < MIN_TEXT) out.push({ pair, ratio: Math.round(ratio * 100) / 100 });
  };
  check("fgOnBg", t.fg, t.bg);
  check("mutedOnBg", t.muted, t.bg);
  check("brandText", t.brandContrast, t.brand);
  check("darkFgOnBg", t.darkFg, t.darkBg);
  check("darkBrandText", t.darkBrandContrast, t.darkBrand);
  return out;
}

/* ───────── SEO ───────── */

export const seoFormSchema = z.object({
  titleAr: z.string().trim().min(1, "required").max(70, "tooLong"),
  titleEn: z.string().trim().min(1, "required").max(70, "tooLong"),
  descriptionAr: z.string().trim().min(1, "required").max(200, "tooLong"),
  descriptionEn: z.string().trim().min(1, "required").max(200, "tooLong"),
  ogImage: optional(500),
  robots: flag,
  instagram: optional(200),
  tiktok: optional(200),
  facebook: optional(200),
  x: optional(200),
});

/* ───────── site settings ───────── */

export const shippingSettingsSchema = z
  .object({
    standardMinor: z.string().trim(),
    expressMinor: z.string().trim(),
    freeThresholdMinor: z.string().trim(),
    standardMinDays: z.string().trim(),
    standardMaxDays: z.string().trim(),
    expressMinDays: z.string().trim(),
    expressMaxDays: z.string().trim(),
  })
  .superRefine((s, ctx) => {
    const num = (v: string, max: number) => {
      const n = Number(v);
      return Number.isFinite(n) && n >= 0 && n <= max ? Math.round(n) : NaN;
    };
    // Prices/threshold are entered in EGP and stored in piastres.
    const price = { standardMinor: num(s.standardMinor.replace(/[^\d.]/g, ""), 100_000), expressMinor: num(s.expressMinor.replace(/[^\d.]/g, ""), 100_000), freeThresholdMinor: num(s.freeThresholdMinor.replace(/[^\d.]/g, ""), 1_000_000) };
    for (const [k, v] of Object.entries(price)) {
      if (Number.isNaN(v) || v <= 0) ctx.addIssue({ code: "custom", path: [k], message: k === "freeThresholdMinor" ? "number" : "money" });
    }
    const days = { standardMinDays: num(s.standardMinDays, 60), standardMaxDays: num(s.standardMaxDays, 60), expressMinDays: num(s.expressMinDays, 60), expressMaxDays: num(s.expressMaxDays, 60) };
    for (const [k, v] of Object.entries(days)) {
      if (Number.isNaN(v) || v < 0) ctx.addIssue({ code: "custom", path: [k], message: "number" });
    }
    if (!Number.isNaN(days.standardMinDays) && !Number.isNaN(days.standardMaxDays) && days.standardMaxDays < days.standardMinDays) ctx.addIssue({ code: "custom", path: ["standardMaxDays"], message: "dateOrder" });
    if (!Number.isNaN(days.expressMinDays) && !Number.isNaN(days.expressMaxDays) && days.expressMaxDays < days.expressMinDays) ctx.addIssue({ code: "custom", path: ["expressMaxDays"], message: "dateOrder" });
  })
  .transform((s) => {
    const egp = (v: string) => Math.round(Number(v.replace(/[^\d.]/g, "")) * 100);
    return {
      standardMinor: egp(s.standardMinor),
      expressMinor: egp(s.expressMinor),
      freeThresholdMinor: egp(s.freeThresholdMinor),
      standardMinDays: Number(s.standardMinDays),
      standardMaxDays: Number(s.standardMaxDays),
      expressMinDays: Number(s.expressMinDays),
      expressMaxDays: Number(s.expressMaxDays),
    };
  });

export const lowStockSchema = z.object({
  threshold: z.string().trim().transform((v, ctx) => {
    const n = Number(v);
    if (!Number.isInteger(n) || n < 1 || n > 1000) {
      ctx.addIssue({ code: "custom", message: "number" });
      return 5;
    }
    return n;
  }),
});
