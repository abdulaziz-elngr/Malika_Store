/**
 * Delivery configuration. Kept in one place so the numbers can later move to admin-managed site settings
 * without touching the checkout or the order service.
 *
 * There is a single, standard delivery method. (Historic orders may still carry the old "express" id;
 * it is only ever displayed, never offered.)
 */
export const DELIVERY_METHODS = [{ id: "standard", priceMinor: 6000, minDays: 2, maxDays: 5 }] as const;

export type DeliveryMethodId = (typeof DELIVERY_METHODS)[number]["id"];
export const DELIVERY_IDS = DELIVERY_METHODS.map((m) => m.id) as unknown as readonly [DeliveryMethodId, ...DeliveryMethodId[]];

/** Delivery is free above this order value (after discounts). */
export const FREE_SHIPPING_THRESHOLD_MINOR = 300000;

export function shippingCost(method: DeliveryMethodId, afterDiscountMinor: number) {
  const m = DELIVERY_METHODS.find((d) => d.id === method) ?? DELIVERY_METHODS[0];
  return afterDiscountMinor >= FREE_SHIPPING_THRESHOLD_MINOR ? 0 : m.priceMinor;
}
