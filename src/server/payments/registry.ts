import { channelAccounts, type PaymentSettings } from "@/lib/payments";
import type { PaymentProvider } from "./types";

// Cash on delivery: the courier collects the balance, so the order stays "pending" until it is marked paid on delivery.
const cashOnDelivery: PaymentProvider = {
  id: "cod",
  isEnabled: () => true,
  async initiate() {
    return { paymentStatus: "pending" };
  },
};

/**
 * Manual transfer (wallet / InstaPay). Available only once the store has published at least one account to pay to.
 * The order stays "pending" until staff have checked the receipt and marked it paid in the dashboard.
 */
const transfer = (id: "wallet" | "instapay"): PaymentProvider => ({
  id,
  isEnabled: (s: PaymentSettings) => channelAccounts(s, id).length > 0,
  async initiate() {
    return { paymentStatus: "pending" };
  },
});

/** To add a gateway: implement PaymentProvider in its own file and register it here. */
const providers: PaymentProvider[] = [cashOnDelivery, transfer("wallet"), transfer("instapay")];

export const getPaymentProvider = (id: string, settings: PaymentSettings) => providers.find((p) => p.id === id && p.isEnabled(settings)) ?? null;
