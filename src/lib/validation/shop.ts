import { z } from "zod";

const list = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((v) => (v === undefined ? [] : (Array.isArray(v) ? v : v.split(",")).map((s) => s.trim()).filter(Boolean)));

const int = z.coerce.number().int().nonnegative().optional().catch(undefined);

export const shopQuerySchema = z.object({
  category: list,
  collection: list,
  size: list,
  color: list,
  gender: z.enum(["women", "men", "unisex"]).optional().catch(undefined),
  min: int,
  max: int,
  stock: z.enum(["in"]).optional().catch(undefined),
  sale: z.enum(["1"]).optional().catch(undefined),
  sort: z.enum(["featured", "newest", "best", "price_asc", "price_desc"]).catch("featured").default("featured"),
  q: z.string().trim().max(80).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(500).catch(1).default(1),
});

export type ShopQuery = z.infer<typeof shopQuerySchema>;
