/**
 * Payment rules shared by the storefront (what to show) and the server (what to trust).
 *
 * Methods:
 *  - cod      Cash on delivery. If the store sets a deposit, the customer first transfers it (wallet or InstaPay)
 *             and the deposit is deducted from what the courier collects.
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
  /** Deposit required up-front for cash-on-delivery orders. 0 turns the deposit off. */
  depositMinor: number;
};

export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = { walletAccounts: [], instapayAccounts: [], depositMinor: 0 };

export const MAX_ACCOUNTS_PER_CHANNEL = 10;

export const channelAccounts = (s: PaymentSettings, channel: TransferChannel) => (channel === "wallet" ? s.walletAccounts : s.instapayAccounts);
export const enabledChannels = (s: PaymentSettings): TransferChannel[] => (["wallet", "instapay"] as const).filter((c) => channelAccounts(s, c).length > 0);

export type PaymentMethodOption = { id: PaymentMethodId; enabled: boolean };
export const listPaymentMethods = (s: PaymentSettings): PaymentMethodOption[] =>
  PAYMENT_METHOD_IDS.map((id) => ({ id, enabled: id === "cod" || channelAccounts(s, id).length > 0 }));

export type PaymentPlan = {
  /** What the customer transfers now (the deposit for COD, the full total for wallet / InstaPay). */
  prepaidMinor: number;
  /** What is left to pay (the courier collects this in cash). */
  dueMinor: number;
  /** True when a receipt + sender number are required. */
  needsTransfer: boolean;
  /** The channels the transfer may go through. */
  channels: TransferChannel[];
};

export function paymentPlan(method: string, totalMinor: number, s: PaymentSettings): PaymentPlan {
  const channels = enabledChannels(s);
  if (method === "cod") {
    // A deposit only makes sense when there is somewhere to send it.
    const deposit = channels.length ? Math.min(Math.max(0, s.depositMinor), totalMinor) : 0;
    return { prepaidMinor: deposit, dueMinor: totalMinor - deposit, needsTransfer: deposit > 0, channels: deposit > 0 ? channels : [] };
  }
  if ((method === "wallet" || method === "instapay") && channelAccounts(s, method).length > 0) {
    return { prepaidMinor: totalMinor, dueMinor: 0, needsTransfer: true, channels: [method] };
  }
  return { prepaidMinor: 0, dueMinor: totalMinor, needsTransfer: false, channels: [] };
}
