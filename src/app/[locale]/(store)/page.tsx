import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { Hero } from "@/features/storefront/home/hero";
import { Lookbook } from "@/features/storefront/home/lookbook";
import { Marquee } from "@/features/storefront/home/marquee";
import { Categories, Editorial, NewCollection, PromoBanner } from "@/features/storefront/home/sections";

export default async function HomePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  // Phase 9 replaces this fixed order/config with HomepageSection rows managed from the admin.
  return (
    <>
      <Hero />
      <Marquee />
      <NewCollection />
      <Categories />
      <Editorial />
      <Lookbook />
      <PromoBanner />
    </>
  );
}
