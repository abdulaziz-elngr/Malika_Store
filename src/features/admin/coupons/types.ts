export type CouponRow = {
  id: string;
  code: string;
  type: "percent" | "fixed";
  value: number;
  descriptionAr: string | null;
  descriptionEn: string | null;
  minOrderMinor: number | null;
  maxDiscountMinor: number | null;
  startsAt: Date | null;
  expiresAt: Date | null;
  usageLimit: number | null;
  perCustomerLimit: number | null;
  usedCount: number;
  active: boolean;
  productIds: string[];
  categoryIds: string[];
  collectionIds: string[];
  createdAt: Date;
};

export type RestrictionOption = { id: string; label: string };

export type RestrictionOptions = {
  products: RestrictionOption[];
  categories: RestrictionOption[];
  collections: RestrictionOption[];
};
