import { pick, type Loc } from "@/lib/localize";
import type { couponRestrictionOptions } from "@/server/services/admin-sales";
import type { RestrictionOptions } from "./types";

/** Labels the restriction pickers show, resolved into the active language on the server. */
export function toRestrictionOptions(raw: Awaited<ReturnType<typeof couponRestrictionOptions>>, loc: Loc): RestrictionOptions {
  return {
    products: raw.products.map((p) => ({ id: p.id, label: pick(loc, p.nameAr, p.nameEn) })),
    categories: raw.categories.map((c) => ({ id: c.id, label: c.nameEn })),
    collections: raw.collections.map((c) => ({ id: c.id, label: c.nameEn })),
  };
}
