import type { BadgeTone } from "@/components/admin/primitives";

/** Badge tones for the four payment states — shared by the list, the detail header and the controls. */
export const PAYMENT_TONE: Record<string, BadgeTone> = { pending: "copper", paid: "sage", failed: "brand", refunded: "neutral" };

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

/** Every order status, in the order the lifecycle progresses. Mirrors ORDER_TRANSITIONS keys. */
export const ORDER_STATUSES = ["pending", "confirmed", "preparing", "shipped", "delivered", "cancelled", "returned"] as const;

export const PAYMENT_STATUSES: PaymentStatus[] = ["pending", "paid", "failed", "refunded"];
