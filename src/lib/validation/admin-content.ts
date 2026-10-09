import { z } from "zod";
import { optionalMoneyInput } from "./admin-catalog";

/** Admin content forms: coupons, banners, CMS pages, navigation and homepage sections. */

const text = (min = 1, max = 200) => z.string().trim().min(min, "required").max(max, "tooLong");
const optional = (max = 500) => z.string().trim().max(max, "tooLong");
const uuid = z.uuid();
const flag = z.enum(["true", "false"]).transform((v) => v === "true");

/* ───────── coupon ───────── */

export const couponFormSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3, "required")
      .max(30, "tooLong")
      .regex(/^[A-Za-z0-9_-]+$/, "codeFormat")
      .transform((v) => v.toUpperCase()),
    type: z.enum(["percent", "fixed"]),
    /** Percent (1–100) or EGP for a fixed discount; converted to its stored unit below. */
    value: z.string().trim().transform((v, ctx) => {
      const n = Number(v.replace(/[^\d.]/g, ""));
      if (!Number.isFinite(n) || n <= 0 || n > 1_000_000) {
        ctx.addIssue({ code: "custom", message: "money" });
        return 0;
      }
      return n;
    }),
    descriptionAr: optional(300),
    descriptionEn: optional(300),
    minOrderMinor: optionalMoneyInput,
    maxDiscountMinor: optionalMoneyInput,
    startsAt: z.string().trim(),
    expiresAt: z.string().trim(),
    usageLimit: z.string().trim().transform((v, ctx) => {
      if (!v) return null;
      const n = Number(v);
      if (!Number.isInteger(n) || n < 1 || n > 1_000_000) {
        ctx.addIssue({ code: "custom", message: "number" });
        return null;
      }
      return n;
    }),
    perCustomerLimit: z.string().trim().transform((v, ctx) => {
      if (!v) return null;
      const n = Number(v);
      if (!Number.isInteger(n) || n < 1 || n > 10_000) {
        ctx.addIssue({ code: "custom", message: "number" });
        return null;
      }
      return n;
    }),
    active: flag,
    productIds: z.array(uuid),
    categoryIds: z.array(uuid),
    collectionIds: z.array(uuid),
  })
  .superRefine((c, ctx) => {
    if (c.type === "percent" && (c.value < 1 || c.value > 100 || !Number.isInteger(c.value))) ctx.addIssue({ code: "custom", path: ["value"], message: "percentRange" });
    if (c.type === "fixed" && c.value < 1) ctx.addIssue({ code: "custom", path: ["value"], message: "money" });
    if (c.startsAt && c.expiresAt && new Date(c.expiresAt) <= new Date(c.startsAt)) ctx.addIssue({ code: "custom", path: ["expiresAt"], message: "dateOrder" });
  })
  .transform((c) => ({ ...c, value: c.type === "fixed" ? Math.round(c.value * 100) : Math.round(c.value) }));

/* ───────── banner ───────── */

export const bannerFormSchema = z
  .object({
    titleAr: text(2, 120),
    titleEn: text(2, 120),
    bodyAr: optional(300),
    bodyEn: optional(300),
    imageUrl: z.string().trim().max(500, "tooLong"),
    mobileImageUrl: z.string().trim().max(500, "tooLong"),
    ctaLabelAr: optional(60),
    ctaLabelEn: optional(60),
    href: z.string().trim().max(300, "tooLong"),
    position: z.enum(["home", "promo", "strip", "campaign"]),
    tone: z.enum(["wine", "copper", "cream", "sage"]),
    startsAt: z.string().trim(),
    endsAt: z.string().trim(),
    visible: flag,
    sortOrder: z.string().trim().transform((v, ctx) => {
      const n = Number(v || "0");
      if (!Number.isInteger(n) || n < 0 || n > 9999) {
        ctx.addIssue({ code: "custom", message: "number" });
        return 0;
      }
      return n;
    }),
  })
  .superRefine((b, ctx) => {
    if (b.startsAt && b.endsAt && new Date(b.endsAt) <= new Date(b.startsAt)) ctx.addIssue({ code: "custom", path: ["endsAt"], message: "dateOrder" });
    if (b.ctaLabelAr && !b.href) ctx.addIssue({ code: "custom", path: ["href"], message: "required" });
  });

/* ───────── CMS page ───────── */

export const pageFormSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1, "required")
    .max(80, "tooLong")
    .regex(/^[a-z0-9-]+$/, "slug")
    .refine((s) => !["shop", "cart", "checkout", "admin", "account", "products", "collections", "search"].includes(s), "slugReserved"),
  titleAr: text(2, 120),
  titleEn: text(2, 120),
  bodyAr: z.string().max(60_000, "tooLong"),
  bodyEn: z.string().max(60_000, "tooLong"),
  visible: flag,
  seoTitleAr: optional(70),
  seoTitleEn: optional(70),
  seoDescriptionAr: optional(200),
  seoDescriptionEn: optional(200),
});

/* ───────── navigation ───────── */

export const navItemFormSchema = z.object({
  menu: z.enum(["header", "footer"]),
  labelAr: text(1, 60),
  labelEn: text(1, 60),
  href: z
    .string()
    .trim()
    .min(1, "required")
    .max(300, "tooLong")
    .regex(/^(\/|#|https?:\/\/)/, "hrefFormat"),
  visible: flag,
});

/* ───────── homepage section config ───────── */

/**
 * The section editor posts plain scalars (bilingual copy, image URLs, links, layout choices)
 * plus optional string lists; anything else is rejected so jsonb never accumulates junk.
 */
export const sectionConfigSchema = z
  .object({
    eyebrowAr: optional(60),
    eyebrowEn: optional(60),
    titleAr: optional(160),
    titleEn: optional(160),
    bodyAr: optional(600),
    bodyEn: optional(600),
    image: optional(500),
    mobileImage: optional(500),
    secondaryImage: optional(500),
    videoUrl: optional(500),
    ctaLabelAr: optional(60),
    ctaLabelEn: optional(60),
    ctaHref: optional(300),
    secondaryCtaHref: optional(300),
    tone: optional(20),
    animation: optional(20),
    layout: optional(20),
    align: optional(20),
    height: optional(20),
    overlay: optional(10),
    countdownTo: optional(40),
    badge: optional(10),
    count: optional(10),
    itemsAr: z.array(z.string().trim().max(200, "tooLong")).max(12),
    itemsEn: z.array(z.string().trim().max(200, "tooLong")).max(12),
    href: optional(300),
  })
  .partial()
  .transform((obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== "")));
