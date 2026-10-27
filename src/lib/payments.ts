/**
 * Payment rules shared by the storefront (what to show) and the server (what to trust).
 *
 * Methods:
 *  - cod      Cash on delivery. Plain cash by default. If the store switches the deposit ON (Admin → Settings →
 *             Payments), the customer first transfers it (wallet or InstaPay) and it is deducted from what the
 *             courier collects.
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
  /**
   * Master switch for the cash-on-delivery deposit. OFF = plain cash on delivery with no deposit at all.
   * Optional so settings saved before the switch existed keep working: when it was never saved, the deposit is
   * considered on only if an amount had been set.
   */
  depositEnabled?: boolean;
  /** Deposit amount (piastres) asked up-front when the deposit switch is on. Kept even while the switch is off. */
  depositMinor: number;
};

export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = { walletAccounts: [], instapayAccounts: [], depositMinor: 0 };

export const MAX_ACCOUNTS_PER_CHANNEL = 10;

/** Is the cash-on-delivery deposit switched on? Legacy settings (no switch saved) are on when an amount is set. */
export const isDepositEnabled = (s: PaymentSettings) => (s.depositEnabled ?? s.depositMinor > 0) && s.depositMinor > 0;

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
    // No deposit unless the store switched it on, and only when there is somewhere to send it.
    const deposit = isDepositEnabled(s) && channels.length ? Math.min(Math.max(0, s.depositMinor), totalMinor) : 0;
    return { prepaidMinor: deposit, dueMinor: totalMinor - deposit, needsTransfer: deposit > 0, channels: deposit > 0 ? channels : [] };
  }
  if ((method === "wallet" || method === "instapay") && channelAccounts(s, method).length > 0) {
    return { prepaidMinor: totalMinor, dueMinor: 0, needsTransfer: true, channels: [method] };
  }
  return { prepaidMinor: 0, dueMinor: totalMinor, needsTransfer: false, channels: [] };
}
