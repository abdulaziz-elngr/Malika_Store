import type { DeliveryMethodId } from "@/lib/shipping";

export type CheckoutForm = {
  name: string;
  email: string;
  phone: string;
  governorate: string;
  city: string;
  line1: string;
  line2: string;
  notes: string;
  deliveryMethod: DeliveryMethodId;
  paymentMethod: string;
  saveAddress: boolean;
};

export type SavedAddress = { id: string; label: string | null; recipient: string; phone: string; governorate: string; city: string; line1: string; line2: string | null; notes: string | null; isDefault: boolean };
export type PaymentMethodOption = { id: string; kind: "cod" | "card" | "wallet"; enabled: boolean };
export const STEPS = ["info", "address", "delivery", "payment", "review"] as const;
export type StepKey = (typeof STEPS)[number];
