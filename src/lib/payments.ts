/**
 * Payment rules shared by the storefront (what to show) and the server (what to trust).
 *
 * Methods:
 *  - cod      Cash on delivery: the courier collects the full total. Nothing is paid up-front.
 *  - wallet   Mobile-wallet transfer (Vodafone Cash, Orange Cash…) of the full amount.
 *  - instapay InstaPay transfer of the full amount.
 *
 * Transfers are manual: the customer pays to a number the store publishes, then uploads the receipt and the
 * number they sent it from. Staff verify the receipt and mark the order paid from the dashboard.
 */
export const PAYMENT_METHOD_IDS = ["cod", "wallet", "instapay"] as const;
export type PaymentMethodId = (typeof PAYMENT_METHOD_IDS)[number];
export type TransferChannel = "wallet" | "instapay";

/** Managed from Admin → Settings → Payments. Amounts are piastres. */
export type PaymentSettings = {
  /** Wallet numbers customers can pay to, one entry per line in the dashboard (free text, e.g. "01012345678 — Vodafone Cash"). */
  walletAccounts: string[];
  /** InstaPay addresses/numbers customers can pay to. */
  instapayAccounts: string[];
};

export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = { walletAccounts: [], instapayAccounts: [] };

export const MAX_ACCOUNTS_PER_CHANNEL = 10;

export const channelAccounts = (s: PaymentSettings, channel: TransferChannel) => (channel === "wallet" ? s.walletAccounts : s.instapayAccounts);

export type PaymentMethodOption = { id: PaymentMethodId; enabled: boolean };
export const listPaymentMethods = (s: PaymentSettings): PaymentMethodOption[] =>
  PAYMENT_METHOD_IDS.map((id) => ({ id, enabled: id === "cod" || channelAccounts(s, id).length > 0 }));

export type PaymentPlan = {
  /** What the customer transfers now (the full total for wallet / InstaPay, nothing for COD). */
  prepaidMinor: number;
  /** What is left to pay (the courier collects this in cash). */
  dueMinor: number;
  /** True when a receipt + sender number are required. */
  needsTransfer: boolean;
  /** The channels the transfer may go through. */
  channels: TransferChannel[];
};

export function paymentPlan(method: string, totalMinor: number, s: PaymentSettings): PaymentPlan {
  if ((method === "wallet" || method === "instapay") && channelAccounts(s, method).length > 0) {
    return { prepaidMinor: totalMinor, dueMinor: 0, needsTransfer: true, channels: [method] };
  }
  return { prepaidMinor: 0, dueMinor: totalMinor, needsTransfer: false, channels: [] };
}
