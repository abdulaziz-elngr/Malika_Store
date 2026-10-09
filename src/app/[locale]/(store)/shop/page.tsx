import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { PageHeader } from "@/features/storefront/shop/page-header";
import { ShopView } from "@/features/storefront/shop/shop-view";

export const dynamic = "force-dynamic";

export default async function Page({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("shop");
  return <ShopView pathname="/shop" searchParams={await searchParams} header={<PageHeader title={t("all")} subtitle={t("subtitle")} />} />;
}
