import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { BannerCards } from "@/features/storefront/banners/banner-band";
import { PageHeader } from "@/features/storefront/shop/page-header";
import { ShopView } from "@/features/storefront/shop/shop-view";
import { getActiveBanners } from "@/server/services/content";

export const dynamic = "force-dynamic";

export default async function Page({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, promos] = await Promise.all([getTranslations("shop"), getActiveBanners("promo")]);
  return (
    <>
      <BannerCards banners={promos} />
      <ShopView pathname="/shop" searchParams={await searchParams} header={<PageHeader title={t("all")} subtitle={t("subtitle")} />} />
    </>
  );
}
