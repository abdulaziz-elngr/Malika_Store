/**
 * Delivery configuration. Kept in one place so the numbers can later move to admin-managed site settings
 * without touching the checkout or the order service.
 *
 * There is a single, standard delivery method. (Historic orders may still carry the old "express" id;
 * it is only ever displayed, never offered.)
 */
export const DELIVERY_METHODS = [{ id: "standard", priceMinor: 11000, minDays: 2, maxDays: 5 }] as const;

export type DeliveryMethodId = (typeof DELIVERY_METHODS)[number]["id"];
export const DELIVERY_IDS = DELIVERY_METHODS.map((m) => m.id) as unknown as readonly [DeliveryMethodId, ...DeliveryMethodId[]];

export type ShippingConfig = { standardMinor: number };

/** One flat fee for every governorate and every order size (admin-set in Settings → Shipping). */
export function shippingCost(method: DeliveryMethodId, cfg?: ShippingConfig) {
  const m = DELIVERY_METHODS.find((d) => d.id === method) ?? DELIVERY_METHODS[0];
  return cfg?.standardMinor ?? m.priceMinor;
}
