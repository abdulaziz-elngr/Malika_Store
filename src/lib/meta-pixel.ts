import type { CartLine, CartPricing } from "@/lib/cart-types";

export const META_PIXEL_ID = "1806362550515023";
export type MetaEvent = "PageView" | "ViewContent" | "Search" | "AddToCart" | "AddToWishlist" | "InitiateCheckout" | "AddPaymentInfo" | "Purchase" | "Contact" | "CompleteRegistration" | "Lead";
export type MetaData = Record<string, unknown>;
type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[][];
  push?: Fbq;
  loaded: boolean;
  version: string;
};
declare global {
  interface Window { fbq?: Fbq; _fbq?: Fbq; }
}

let initialized = false;
const purchases = new Set<string>();

function pixel() {
  if (typeof window === "undefined") return;
  if (!window.fbq) {
    const queue = function (...args: unknown[]) {
      if (queue.callMethod) queue.callMethod(...args);
      else queue.queue.push(args);
    } as Fbq;
    queue.queue = [];
    queue.push = queue;
    queue.loaded = true;
    queue.version = "2.0";
    window.fbq = queue;
    window._fbq ??= queue;
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(script);
  }
  if (!initialized) {
    window.fbq("init", META_PIXEL_ID);
    initialized = true;
  }
  return window.fbq;
}

/** Analytics failures must never interrupt cart or checkout. */
export function trackMeta(event: MetaEvent, data: MetaData = {}, eventId?: string) {
  try {
    const fbq = pixel();
    if (!fbq) return false;
    if (eventId) fbq("track", event, data, { eventID: eventId });
    else fbq("track", event, data);
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
