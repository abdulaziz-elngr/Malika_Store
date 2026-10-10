import { Fragment } from "react";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { BannerCards, StripBar } from "@/features/storefront/banners/banner-band";
import { DEFAULT_HOME_KEYS, RenderSection, isHomeSectionKey } from "@/features/storefront/home/render-section";
import type { HomeSectionKey, SectionConfig } from "@/server/services/admin-content";
import { getEnabledSections } from "@/server/services/admin-content";
import { getActiveBanners } from "@/server/services/content";

export const dynamic = "force-dynamic";

/**
 * The homepage is assembled entirely from the CMS: section order/enabled flags and their
 * configs come from `homepage_sections`, the announcement row and banner cards from `banners`.
 * Before the builder has been synced it falls back to the brand's default section order.
 */
export default async function HomePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [sections, stripBanners, homeBanners] = await Promise.all([getEnabledSections(), getActiveBanners("strip"), getActiveBanners("home")]);

  const list: { id: string; k: HomeSectionKey; config: SectionConfig | null }[] = sections
    .filter((s) => isHomeSectionKey(s.key))
    .map((s) => ({ id: s.id, k: s.key as HomeSectionKey, config: (s.config ?? null) as SectionConfig | null }));
  if (!list.length) DEFAULT_HOME_KEYS.forEach((k) => list.push({ id: k, k, config: null }));

  return (
    <>
      <StripBar banners={stripBanners} />
      {list.map((section, index) => (
        <Fragment key={section.id}>
          <RenderSection k={section.k} config={section.config} />
          {index === 0 ? <BannerCards banners={homeBanners} /> : null}
        </Fragment>
      ))}
    </>
  );
}
