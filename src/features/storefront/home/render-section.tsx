import { getLocale } from "next-intl/server";
import { pick, type Loc } from "@/lib/localize";
import { HOME_SECTION_KEYS, type HomeSectionKey, type SectionConfig } from "@/server/services/admin-content";
import { BestSellers } from "./best-sellers";
import { Hero, type HeroConfig } from "./hero";
import { Lookbook } from "./lookbook";
import { Marquee } from "./marquee";
import { NewsletterBand } from "./newsletter-band";
import type { SectionOverrides } from "./overrides";
import { Categories, Editorial, NewCollection, PromoBanner } from "./sections";
import { Testimonials } from "./testimonials";

/** Fallback order used before the homepage builder has been synced (or when everything is disabled). */
export const DEFAULT_HOME_KEYS: HomeSectionKey[] = ["hero", "marquee", "new_collection", "categories", "editorial", "lookbook", "banner"];

export const isHomeSectionKey = (key: string): key is HomeSectionKey => (HOME_SECTION_KEYS as readonly string[]).includes(key);

/**
 * Renders one homepage section with its CMS config resolved into the visitor's language.
 * Missing config values fall back to each section's own i18n copy, so an empty
 * builder state renders exactly the brand homepage it did before the CMS existed.
 */
export async function RenderSection({ k, config }: { k: HomeSectionKey; config?: SectionConfig | null }) {
  const loc = (await getLocale()) as Loc;
  const cfg = (config ?? {}) as Record<string, unknown>;

  const s = (key: string): string | undefined => {
    const v = cfg[key];
    return typeof v === "string" && v.trim() ? v.trim() : undefined;
  };
  const arr = (key: string): string[] | undefined => {
    const v = cfg[key];
    return Array.isArray(v) && v.some((x) => typeof x === "string" && x.trim()) ? (v.filter((x): x is string => typeof x === "string" && x.trim().length > 0)) : undefined;
  };
  const bool = (key: string): boolean | undefined => {
    const v = s(key);
    if (v === undefined) return undefined;
    return !(v === "false" || v === "0" || v === "off");
  };
  const num = (key: string): number | undefined => {
    const raw = s(key);
    if (raw === undefined) return undefined;
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  };

  const o: SectionOverrides = {
    eyebrow: pick(loc, s("eyebrowAr"), s("eyebrowEn")) || undefined,
    title: pick(loc, s("titleAr"), s("titleEn")) || undefined,
    body: pick(loc, s("bodyAr"), s("bodyEn")) || undefined,
    ctaLabel: pick(loc, s("ctaLabelAr"), s("ctaLabelEn")) || undefined,
    ctaHref: s("ctaHref") ?? s("href"),
    secondaryCtaHref: s("secondaryCtaHref"),
    image: s("image"),
    mobileImage: s("mobileImage"),
    secondaryImage: s("secondaryImage"),
    tone: s("tone"),
    items: (loc === "ar" ? arr("itemsAr") ?? arr("itemsEn") : arr("itemsEn") ?? arr("itemsAr")) ?? undefined,
  };

  switch (k) {
    case "hero": {
      const align = s("align");
      const heroCfg: HeroConfig = {
        desktopImage: o.image,
        mobileImage: o.mobileImage,
        videoUrl: s("videoUrl"),
        overlay: num("overlay"),
        align: align === "center" || align === "end" ? align : undefined,
        height: s("height") === "tall" ? "tall" : undefined,
        badge: bool("badge"),
        countdownTo: s("countdownTo"),
        ctaHref: o.ctaHref,
        secondaryHref: o.secondaryCtaHref,
        eyebrow: o.eyebrow,
        title: o.title,
        subtitle: o.body,
        ctaLabel: o.ctaLabel,
      };
      return <Hero config={heroCfg} />;
    }
    case "marquee":
      return <Marquee items={o.items} />;
    case "new_collection":
      return <NewCollection o={o} />;
    case "categories":
      return <Categories o={o} />;
    case "editorial":
      return <Editorial o={o} />;
    case "lookbook":
      return <Lookbook o={o} />;
    case "best_sellers":
      return <BestSellers o={o} limit={num("count") ?? 8} />;
    case "banner":
      return <PromoBanner o={o} />;
    case "testimonials":
      return <Testimonials o={o} />;
    case "newsletter":
      return <NewsletterBand o={o} />;
    default:
      return null;
  }
}
