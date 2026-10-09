export type CartItem = { variantId: string; quantity: number };

export const MAX_LINE_QTY = 10;

export type CartLine = {
  variantId: string;
  productId: string;
  sku: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  size: string;
  colorNameAr: string;
  colorNameEn: string;
  colorHex: string;
  imageUrl: string | null;
  tone: string;
  unitPriceMinor: number;
  originalPriceMinor: number;
  stock: number;
  quantity: number; // already clamped to stock and MAX_LINE_QTY
  lineTotalMinor: number;
  issue: "out_of_stock" | "reduced" | null;
};

export type CouponStatus =
  | { ok: true; code: string; discountMinor: number }
  | { ok: false; code: string; reason: "not_found" | "inactive" | "not_started" | "expired" | "min_order" | "usage_limit" | "customer_limit" | "no_eligible_items"; minOrderMinor?: number };

export type CartPricing = {
  lines: CartLine[];
  missing: string[]; // variant ids that no longer exist
  subtotalMinor: number;
  discountMinor: number;
  shippingMinor: number | null; // null until a delivery method is chosen
  shippingOptions: Record<string, number> | null; // cost of every delivery method for this cart (null for an empty cart)
  totalMinor: number;
  coupon: CouponStatus | null;
  freeShippingRemainingMinor: number;
  hasIssues: boolean;
};
