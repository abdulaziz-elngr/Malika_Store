import { cache } from "react";
import { eq } from "drizzle-orm";
import { db, type Executor } from "@/db/client";
import { siteSettings } from "@/db/schema";
import { DEFAULT_PAYMENT_SETTINGS, type PaymentSettings } from "@/lib/payments";

/**
 * Typed access to the key/value site settings (theme, SEO, shipping…).
 * Reads are memoised per request; writes go through the admin settings screens and are audited by the caller.
 */
export type ThemeMode = { bg: string; surface: string; fg: string; muted: string; line: string; brand: string; brandContrast: string; accent: string };
export type ThemeSettings = { light: ThemeMode; dark: ThemeMode; radius: number };
export type BrandSettings = { logoUrl: string; logoDarkUrl: string; faviconUrl: string };
export type SocialLinks = { instagram: string; tiktok: string; facebook: string; x: string; whatsapp: string };
export type SeoSettings = { titleAr: string; titleEn: string; descriptionAr: string; descriptionEn: string; ogImage: string; robots: boolean; social: SocialLinks };
export type OrderAlertSettings = { enabled: boolean; emails: string[] };
export type ShippingSettings = { standardMinor: number; freeThresholdMinor: number; standardMinDays: number; standardMaxDays: number };

/** Defaults are the MALIKA identity: sampled from the logo, exactly what ships in globals.css. */
export const DEFAULT_THEME: ThemeSettings = {
  light: { bg: "#f7f0e6", surface: "#fcf9f4", fg: "#2a0f0b", muted: "#6b4a42", line: "#dccbb6", brand: "#67251b", brandContrast: "#fcf9f4", accent: "#8c6551" },
  dark: { bg: "#1b0f0c", surface: "#26150f", fg: "#f7f0e6", muted: "#c9b3a4", line: "#43271f", brand: "#e8c9b6", brandContrast: "#1b0f0c", accent: "#dcbfae" },
  radius: 2,
};

/** Empty strings mean "use the built-in MALIKA files in /public". */
export const DEFAULT_BRAND: BrandSettings = { logoUrl: "", logoDarkUrl: "", faviconUrl: "" };

export const DEFAULT_SEO: SeoSettings = {
  titleAr: "MALIKA — أناقة تُعاد صياغتها",
  titleEn: "MALIKA — Elegance, Reimagined",
  descriptionAr: "MALIKA دار أزياء فاخرة. اكتشفي قطعاً راقية وأنثوية مصممة بثقة هادئة.",
  descriptionEn: "MALIKA is a luxury fashion house. Discover refined, feminine pieces designed with quiet confidence.",
  ogImage: "",
  robots: true,
  social: { instagram: "", tiktok: "", facebook: "", x: "", whatsapp: "" },
};

export const DEFAULT_SHIPPING: ShippingSettings = { standardMinor: 6000, freeThresholdMinor: 300000, standardMinDays: 2, standardMaxDays: 5 };

/** Who is emailed the moment a customer places an order (managed from Admin → Settings). */
export const DEFAULT_ORDER_ALERTS: OrderAlertSettings = { enabled: true, emails: [] };

export const SETTING_KEYS = ["theme", "brand", "seo", "shipping", "payments", "lowStockThreshold", "orderAlerts"] as const;
export type SettingKey = (typeof SETTING_KEYS)[number];

async function readSetting(key: string): Promise<unknown> {
  const [row] = await db.select({ value: siteSettings.value }).from(siteSettings).where(eq(siteSettings.key, key)).limit(1);
  return row?.value ?? null;
}

export const getSetting = cache(async <T>(key: SettingKey, fallback: T): Promise<T> => {
  const v = await readSetting(key);
  if (v == null) return fallback;
  // Objects merge key-by-key (partial saves still see defaults); primitives replace outright.
  if (typeof fallback === "object" && fallback !== null && typeof v === "object" && v !== null) {
    return { ...(fallback as object), ...(v as object) } as T;
  }
  return v as T;
});

export const getThemeSettings = () => getSetting<ThemeSettings>("theme", DEFAULT_THEME);
export const getBrandSettings = () => getSetting<BrandSettings>("brand", DEFAULT_BRAND);
export const getSeoSettings = () => getSetting<SeoSettings>("seo", DEFAULT_SEO);
export const getShippingSettings = () => getSetting<ShippingSettings>("shipping", DEFAULT_SHIPPING);
export const getPaymentSettings = () => getSetting<PaymentSettings>("payments", DEFAULT_PAYMENT_SETTINGS);
export const getOrderAlertSettings = () => getSetting<OrderAlertSettings>("orderAlerts", DEFAULT_ORDER_ALERTS);
export const getLowStockThreshold = async () => Number(await getSetting<number>("lowStockThreshold", 5)) || 5;

export async function setSetting(ex: Executor, key: SettingKey, value: unknown, updatedBy?: string | null) {
  await ex
    .insert(siteSettings)
    .values({ key, value, updatedBy: updatedBy ?? null, updatedAt: new Date() })
    .onConflictDoUpdate({ target: siteSettings.key, set: { value, updatedBy: updatedBy ?? null, updatedAt: new Date() } });
}
