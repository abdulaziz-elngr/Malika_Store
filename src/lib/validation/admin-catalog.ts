import { z } from "zod";

/**
 * Admin catalogue forms. Money arrives from the browser as EGP (e.g. "1850.50") and is stored
 * in piastres; validation messages are translation keys under the "validation" namespace.
 */

const text = (min = 1, max = 200) => z.string().trim().min(min, "required").max(max, "tooLong");
const optional = (max = 500) => z.string().trim().max(max, "tooLong");
const uuid = z.uuid();

/** "1850" | "1,850.50" → 185050 piastres. */
export const moneyInput = z.string().trim().transform((v, ctx) => {
  const n = Number(v.replace(/[^\d.]/g, ""));
  if (!Number.isFinite(n) || n <= 0 || n > 1_000_000) {
    ctx.addIssue({ code: "custom", message: "money" });
    return 0;
  }
  return Math.round(n * 100);
});

/** Empty input means "no value". */
export const optionalMoneyInput = z.string().trim().transform((v, ctx) => {
  if (!v) return null;
  const n = Number(v.replace(/[^\d.]/g, ""));
  if (!Number.isFinite(n) || n <= 0 || n > 1_000_000) {
    ctx.addIssue({ code: "custom", message: "money" });
    return null;
  }
  return Math.round(n * 100);
});

const intInput = (max: number) =>
  z.string().trim().transform((v, ctx) => {
    if (!v) return null;
    const n = Number(v);
    if (!Number.isInteger(n) || n < 0 || n > max) {
      ctx.addIssue({ code: "custom", message: "number" });
      return null;
    }
    return n;
  });

const flag = z.enum(["true", "false"]).transform((v) => v === "true");
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "hex");
const tone = z.enum(["wine", "copper", "cream", "sage"]);

/* ───────── product ───────── */

export const productImageInput = z.object({
  id: z.string().optional(),
  url: z.string().trim().max(500, "tooLong").nullable(),
  tone,
  altAr: optional(160),
  altEn: optional(160),
  colorHex: hex.nullable(),
});

export const productVariantInput = z.object({
  id: z.string().optional(),
  sku: text(1, 60),
  size: text(1, 20),
  colorNameAr: text(1, 60),
  colorNameEn: text(1, 60),
  colorHex: hex,
  priceMinor: z.number().int().min(0).max(100_000_000).nullable(),
  stock: z.number().int().min(0).max(99_999),
});

export const productFormSchema = z
  .object({
    nameAr: text(2, 160),
    nameEn: text(2, 160),
    sku: text(1, 60),
    slug: z.string().trim().max(90, "tooLong").regex(/^[a-z0-9-]*$/, "slug"),
    shortAr: optional(300),
    shortEn: optional(300),
    descriptionAr: optional(5000),
    descriptionEn: optional(5000),
    materialsAr: optional(600),
    materialsEn: optional(600),
    careAr: optional(600),
    careEn: optional(600),
    priceMinor: moneyInput,
    salePriceMinor: optionalMoneyInput,
    costMinor: optionalMoneyInput,
    categoryId: uuid.nullable(),
    gender: z.enum(["women", "men", "unisex"]),
    status: z.enum(["draft", "published", "archived"]),
    featured: flag,
    isNew: flag,
    bestSeller: flag,
    weightGrams: intInput(20_000),
    tags: z.array(z.string().trim().min(1, "required").max(40, "tooLong")).max(20),
    videoUrl: z.string().trim().max(300, "tooLong"),
    collectionIds: z.array(uuid),
    images: z.array(productImageInput).max(24),
    variants: z.array(productVariantInput).min(1, "variantsRequired").max(300),
    seoTitleAr: optional(70),
    seoTitleEn: optional(70),
    seoDescriptionAr: optional(200),
    seoDescriptionEn: optional(200),
  })
  .superRefine((p, ctx) => {
    if (p.salePriceMinor != null && p.salePriceMinor >= p.priceMinor) {
      ctx.addIssue({ code: "custom", path: ["salePriceMinor"], message: "saleBelowPrice" });
    }
    if (p.salePriceMinor != null && p.salePriceMinor <= 0) {
      ctx.addIssue({ code: "custom", path: ["salePriceMinor"], message: "money" });
    }
    const skus = new Set<string>();
    for (const [i, v] of p.variants.entries()) {
      const key = v.sku.trim().toLowerCase();
      if (skus.has(key)) ctx.addIssue({ code: "custom", path: ["variants", i, "sku"], message: "duplicateSku" });
      skus.add(key);
      if (p.variants.filter((x) => x.size === v.size && x.colorHex.toLowerCase() === v.colorHex.toLowerCase() && x.colorNameEn === v.colorNameEn).length > 1) {
        ctx.addIssue({ code: "custom", path: ["variants", i], message: "duplicateVariant" });
      }
    }
  });

export type ProductFormInput = z.input<typeof productFormSchema>;

/* ───────── stock adjustment ───────── */

export const stockAdjustSchema = z.object({
  variantId: uuid,
  /** Signed delta, or an absolute target when `mode` is "set". */
  mode: z.enum(["delta", "set"]),
  quantity: z.string().trim().transform((v, ctx) => {
    const n = Number(v);
    if (!Number.isInteger(n) || n < 0 || n > 99_999) {
      ctx.addIssue({ code: "custom", message: "number" });
      return 0;
    }
    return n;
  }),
  reason: z.enum(["initial", "return", "adjustment", "damage"]),
  note: optional(300),
});

/* ───────── category ───────── */

export const categoryFormSchema = z.object({
  nameAr: text(2, 80),
  nameEn: text(2, 80),
  slug: z.string().trim().max(80, "tooLong").regex(/^[a-z0-9-]*$/, "slug"),
  descriptionAr: optional(400),
  descriptionEn: optional(400),
  imageUrl: z.string().trim().max(500, "tooLong"),
  tone,
  parentId: uuid.nullable(),
  visible: flag,
  seoTitleAr: optional(70),
  seoTitleEn: optional(70),
  seoDescriptionAr: optional(200),
  seoDescriptionEn: optional(200),
});

/* ───────── collection ───────── */

export const collectionFormSchema = z.object({
  nameAr: text(2, 80),
  nameEn: text(2, 80),
  slug: z.string().trim().max(80, "tooLong").regex(/^[a-z0-9-]*$/, "slug"),
  descriptionAr: optional(400),
  descriptionEn: optional(400),
  coverUrl: z.string().trim().max(500, "tooLong"),
  bannerUrl: z.string().trim().max(500, "tooLong"),
  tone,
  startsAt: z.string().trim(),
  endsAt: z.string().trim(),
  visible: flag,
  productIds: z.array(uuid),
  seoTitleAr: optional(70),
  seoTitleEn: optional(70),
  seoDescriptionAr: optional(200),
  seoDescriptionEn: optional(200),
});
