import type { PaymentMethodOption, PaymentSettings, TransferChannel } from "@/lib/payments";
import type { DeliveryMethodId } from "@/lib/shipping";

export type CheckoutForm = {
  name: string;
  email: string;
  phone: string;
  phone2: string;
  governorate: string;
  city: string;
  line1: string;
  line2: string;
  notes: string;
  deliveryMethod: DeliveryMethodId;
  paymentMethod: string;
  /** Transfer details — only used when the chosen method needs a transfer (wallet / InstaPay). */
  transferChannel: TransferChannel | "";
  senderPhone: string;
  /** Signed token returned by /api/checkout/receipt; the preview URL is only for display. */
  receiptToken: string;
  receiptUrl: string;
  saveAddress: boolean;
};

export type SavedAddress = { id: string; label: string | null; recipient: string; phone: string; governorate: string; city: string; line1: string; line2: string | null; notes: string | null; isDefault: boolean };
export type { PaymentMethodOption, PaymentSettings };
export const STEPS = ["details", "review"] as const;
export type StepKey = (typeof STEPS)[number];
