/**
 * Delivery configuration. Kept in one place so Phase 10 can move the numbers to admin-managed site settings
 * without touching the checkout or the order service.
 */
export const DELIVERY_METHODS = [
  { id: "standard", priceMinor: 6000, minDays: 2, maxDays: 5 },
  { id: "express", priceMinor: 12000, minDays: 1, maxDays: 2 },
] as const;

export type DeliveryMethodId = (typeof DELIVERY_METHODS)[number]["id"];
export const DELIVERY_IDS = DELIVERY_METHODS.map((m) => m.id) as unknown as readonly [DeliveryMethodId, ...DeliveryMethodId[]];

/** Standard delivery is free above this order value (after discounts). */
export const FREE_SHIPPING_THRESHOLD_MINOR = 300000;

export function shippingCost(method: DeliveryMethodId, afterDiscountMinor: number, firstOrder: boolean) {
  const m = DELIVERY_METHODS.find((d) => d.id === method) ?? DELIVERY_METHODS[0];
  if (m.id === "standard" && (firstOrder || afterDiscountMinor >= FREE_SHIPPING_THRESHOLD_MINOR)) return 0;
  return m.priceMinor;
}
