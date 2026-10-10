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

/** Fallback only: the live values come from Admin → Settings → Shipping (see getShippingSettings). */
export const FREE_SHIPPING_THRESHOLD_MINOR = 300000;

export type ShippingConfig = { standardMinor: number; freeThresholdMinor: number };

/** Delivery is free at/above the free threshold (after discounts); otherwise the admin-set standard fee. */
export function shippingCost(method: DeliveryMethodId, afterDiscountMinor: number, cfg?: ShippingConfig) {
  const m = DELIVERY_METHODS.find((d) => d.id === method) ?? DELIVERY_METHODS[0];
  const fee = cfg?.standardMinor ?? m.priceMinor;
  const threshold = cfg?.freeThresholdMinor ?? FREE_SHIPPING_THRESHOLD_MINOR;
  return afterDiscountMinor >= threshold ? 0 : fee;
}
