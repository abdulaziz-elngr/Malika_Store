import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/admin/primitives";
import type { Locale } from "@/i18n/routing";
import { LowStockCard } from "@/features/admin/settings/low-stock-card";
import { OrderAlertsCard } from "@/features/admin/settings/order-alerts-card";
import { PaymentsCard } from "@/features/admin/settings/payments-card";
import { ShippingCard } from "@/features/admin/settings/shipping-card";
import { can, requirePermission } from "@/server/auth/rbac";
import { isMailConfigured } from "@/server/services/mailer";
import { getLowStockThreshold, getOrderAlertSettings, getPaymentSettings, getShippingSettings } from "@/server/services/settings";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Settings — MALIKA Admin" };

const egp = (minor: number) => String(minor / 100);

export default async function SettingsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  setRequestLocale((await params).locale);
  const admin = await requirePermission("settings:view");
  const [t, shipping, payments, lowStock, alerts] = await Promise.all([getTranslations("admin.settings"), getShippingSettings(), getPaymentSettings(), getLowStockThreshold(), getOrderAlertSettings()]);
  const readOnly = !can(admin, "settings:manage_settings");

  return (
    <div className="space-y-8">
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("intro")} />
      {readOnly && <p className="border border-line px-4 py-3 text-sm text-muted">{t("readOnly")}</p>}
      <ShippingCard
        defaults={{
          standard: egp(shipping.standardMinor),
          freeThreshold: egp(shipping.freeThresholdMinor),
          standardMinDays: String(shipping.standardMinDays),
          standardMaxDays: String(shipping.standardMaxDays),
        }}
        readOnly={readOnly}
      />
      <PaymentsCard
        defaults={{ walletAccounts: payments.walletAccounts.join("\n"), instapayAccounts: payments.instapayAccounts.join("\n"), deposit: payments.depositMinor > 0 ? egp(payments.depositMinor) : "" }}
        readOnly={readOnly}
      />
      <OrderAlertsCard emails={alerts.emails} enabled={alerts.enabled} mailReady={isMailConfigured()} readOnly={readOnly} />
      <LowStockCard threshold={String(lowStock)} readOnly={readOnly} />
    </div>
  );
}
