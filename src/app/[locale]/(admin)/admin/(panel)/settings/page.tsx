import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/admin/primitives";
import type { Locale } from "@/i18n/routing";
import { LowStockCard } from "@/features/admin/settings/low-stock-card";
import { ShippingCard } from "@/features/admin/settings/shipping-card";
import { can, requirePermission } from "@/server/auth/rbac";
import { getLowStockThreshold, getShippingSettings } from "@/server/services/settings";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Settings — MALIKA Admin" };

const egp = (minor: number) => String(minor / 100);

export default async function SettingsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  setRequestLocale((await params).locale);
  const admin = await requirePermission("settings:view");
  const [t, shipping, lowStock] = await Promise.all([getTranslations("admin.settings"), getShippingSettings(), getLowStockThreshold()]);
  const readOnly = !can(admin, "settings:manage_settings");

  return (
    <div className="space-y-8">
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("intro")} />
      {readOnly && <p className="border border-line px-4 py-3 text-sm text-muted">{t("readOnly")}</p>}
      <ShippingCard
        defaults={{
          standard: egp(shipping.standardMinor),
          express: egp(shipping.expressMinor),
          freeThreshold: egp(shipping.freeThresholdMinor),
          standardMinDays: String(shipping.standardMinDays),
          standardMaxDays: String(shipping.standardMaxDays),
          expressMinDays: String(shipping.expressMinDays),
          expressMaxDays: String(shipping.expressMaxDays),
        }}
        readOnly={readOnly}
      />
      <LowStockCard threshold={String(lowStock)} readOnly={readOnly} />
    </div>
  );
}
