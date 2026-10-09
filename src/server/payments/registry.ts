import type { PaymentProvider } from "./types";

const cashOnDelivery: PaymentProvider = {
  id: "cod",
  kind: "cod",
  isEnabled: () => true,
  // Cash is collected by the courier; the order stays "pending" until it is marked paid on delivery.
  async initiate() {
    return { paymentStatus: "pending" };
  },
};

/** Placeholder slots for gateways. They stay disabled until a real provider replaces them. */
const unconfigured = (id: string, kind: "card" | "wallet"): PaymentProvider => ({
  id,
  kind,
  isEnabled: () => false,
  async initiate() {
    throw new Error(`Payment provider "${id}" is not configured.`);
  },
});

/** To add a gateway: implement PaymentProvider in its own file and replace the matching entry here. */
const providers: PaymentProvider[] = [cashOnDelivery, unconfigured("card", "card"), unconfigured("wallet", "wallet")];

export const listPaymentProviders = () => providers.map((p) => ({ id: p.id, kind: p.kind, enabled: p.isEnabled() }));
export const getPaymentProvider = (id: string) => providers.find((p) => p.id === id && p.isEnabled()) ?? null;
