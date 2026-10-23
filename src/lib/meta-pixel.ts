import type { CartLine, CartPricing } from "@/lib/cart-types";

export type MetaEvent = "PageView" | "ViewContent" | "Search" | "AddToCart" | "AddToWishlist" | "InitiateCheckout" | "AddPaymentInfo" | "Purchase" | "Contact" | "CompleteRegistration" | "Lead";
export type MetaData = Record<string, unknown>;
declare global {
  interface Window { dataLayer?: Record<string, unknown>[]; }
}

/** Google Tag Manager container. Tags (Meta Pixel, Google Ads, GA4...) are configured inside GTM, not in code. */
export const GTM_ID = "GTM-N5NWWDJZ";

const purchases = new Set<string>();

/** Analytics failures must never interrupt cart or checkout. Events are pushed to the GTM dataLayer. */
export function trackMeta(event: MetaEvent, data: MetaData = {}, eventId?: string) {
  try {
    if (typeof window === "undefined") return false;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(eventId ? { ...data, event, event_id: eventId } : { ...data, event });
    return true;
  } catch { return false; }
}

export function trackOnceMeta(event: MetaEvent, id: string, data: MetaData) {
  const key = "malika.meta." + event + "." + id;
  if (purchases.has(key)) return;
  try { if (localStorage.getItem(key)) return; } catch { /* storage optional */ }
  if (!trackMeta(event, data, event.toLowerCase() + "_" + id)) return;
  purchases.add(key);
  try { localStorage.setItem(key, "1"); } catch { /* in-memory fallback */ }
}

export function trackPurchase(orderId: string, data: MetaData) {
  trackOnceMeta("Purchase", orderId, data);
}

export function metaItems(lines: Pick<CartLine, "productId" | "quantity" | "unitPriceMinor">[]) {
  const buyable = lines.filter((line) => line.quantity > 0);
  return {
    content_type: "product",
    content_ids: [...new Set(buyable.map((line) => line.productId))],
    contents: buyable.map((line) => ({ id: line.productId, quantity: line.quantity, item_price: line.unitPriceMinor / 100 })),
    num_items: buyable.reduce((sum, line) => sum + line.quantity, 0),
    currency: "EGP",
  };
}

/** Only count the quantity actually accepted by the pricing server. */
export function acceptedAddition(line: CartLine | undefined, before: number, requested: number) {
  return Math.min(requested, Math.max(0, (line?.quantity ?? 0) - before));
}

export function metaCart(pricing: CartPricing) {
  return { ...metaItems(pricing.lines), value: pricing.totalMinor / 100 };
}
