export type PaymentContext = { orderId: string; orderNumber: string; totalMinor: number; customerEmail: string; locale: "ar" | "en" };

export type PaymentInitiation = {
  paymentStatus: "pending" | "paid";
  /** Provider-side id (charge, session, wallet transaction…) stored on the order for reconciliation. */
  reference?: string;
  /** For redirect-based providers: where to send the customer to complete payment. */
  redirectUrl?: string;
};

/**
 * Every payment method is a provider implementing this contract and registered in ./registry.ts.
 * Nothing in checkout or order placement knows about a specific gateway.
 * initiate() runs inside the order transaction: keep it fast, and make it safe to retry.
 */
export interface PaymentProvider {
  readonly id: string;
  readonly kind: "cod" | "card" | "wallet";
  /** Disabled providers are listed as "coming soon" and can never be used to place an order. */
  isEnabled(): boolean;
  initiate(ctx: PaymentContext): Promise<PaymentInitiation>;
}
