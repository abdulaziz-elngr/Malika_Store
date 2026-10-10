import { getLocale, getTranslations } from "next-intl/server";
import { Reveal } from "@/components/motion/reveal";
import { buttonClasses } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Link } from "@/i18n/navigation";
import { pick, type Loc } from "@/lib/localize";
import { getLatestCollection, listHomeCategories, listLatestCollections } from "@/server/services/catalog";
import { ImageSlot } from "./image-slot";
import type { SectionOverrides } from "./overrides";
import { toneOf } from "./overrides";
import { SectionHeading } from "./section-heading";

export async function NewCollection({ o }: { o?: SectionOverrides } = {}) {
  const [t, loc, latest] = await Promise.all([getTranslations("newCollection"), getLocale() as Promise<Loc>, getLatestCollection()]);
  // Precedence per field: CMS override → the latest collection's own data → i18n fallback copy.
  const href = o?.ctaHref ?? (latest ? `/collections/${latest.slug}` : "/collections");
  const label = o?.ctaLabel ?? t("cta");
  const title = o?.title ?? (latest ? pick(loc, latest.nameAr, latest.nameEn) : "") ?? "";
  const body = o?.body ?? (latest ? pick(loc, latest.descriptionAr, latest.descriptionEn) : "");
  const image = o?.image ?? latest?.coverUrl ?? undefined;
  const heading = title || t("title");
  return (
    <section className="py-24 lg:py-32">
      <Container className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
        <Reveal className="order-2 space-y-8 lg:order-none">
          <SectionHeading eyebrow={o?.eyebrow ?? t("eyebrow")} title={heading} />
          <p className="max-w-md text-muted">{body || t("body")}</p>
          <Link href={href} className={buttonClasses("secondary")}>{label}</Link>
        </Reveal>
        <Reveal>
          <Link href={href} data-cursor="explore" className="group block overflow-hidden" aria-label={label}>
            <ImageSlot src={image} alt={title} tone={toneOf(o?.tone ?? latest?.tone, "copper")} className="aspect-[4/5] transition-transform duration-[1200ms] ease-luxe group-hover:scale-[1.04]" sizes="(min-width:1024px) 45vw, 100vw" />
          </Link>
        </Reveal>
      </Container>
    </section>
  );
}

/** Placement classes for N tiles: 2 columns on mobile, 3 on desktop (6-col grid, 2 cols per tile), with a lone last tile centered. */
function tilePlacement(i: number, n: number) {
  const lastRow = n % 3 || 3;
  const first = n - lastRow;
  const mobileWide = n % 2 === 1 && i === n - 1;
  let desktop = "md:col-span-2";
  if (i >= first && lastRow === 1) desktop += " md:col-start-3";
  if (i === first && lastRow === 2) desktop += " md:col-start-2";
  return { cls: `${mobileWide ? "col-span-2" : "col-span-1"} ${desktop}`, wide: mobileWide };
}

export async function Categories({ o, limit = 6 }: { o?: SectionOverrides; limit?: number } = {}) {
  const max = Math.min(12, Math.max(1, Math.floor(limit)));
  const [t, loc, rows] = await Promise.all([getTranslations("categories"), getLocale() as Promise<Loc>, listHomeCategories(max)]);

  if (!rows.length) {
    // No categories in the database yet: keep the original three tiles so the page is never empty.
    const items = [
      { key: "women", href: "/women", tone: "wine", image: o?.womenImage },
      { key: "men", href: "/men", tone: "sage", image: o?.menImage },
      { key: "collections", href: "/collections", tone: "copper", image: o?.collectionsImage },
    ] as const;
    return (
      <section className="py-12 lg:py-20">
        <Container className="space-y-12">
          <SectionHeading eyebrow={o?.eyebrow ?? t("eyebrow")} title={o?.title ?? t("title")} />
          <ul className="grid gap-5 md:grid-cols-3">
            {items.map((c, i) => (
              <Reveal as="li" key={c.key} delay={i * 0.1}>
                <Link href={c.href} data-cursor="view" className="group relative block aspect-[3/4] overflow-hidden text-cream-50">
                  <ImageSlot src={c.image} alt={t(c.key)} tone={c.tone} className="absolute inset-0 transition-transform duration-[1200ms] ease-luxe group-hover:scale-105" sizes="(min-width:768px) 33vw, 100vw" />
                  <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-wine-950/60 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-6">
                    <span className="font-display text-4xl">{t(c.key)}</span>
                    <span className="text-xs uppercase tracking-[0.25em]">{t("explore")}</span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </ul>
        </Container>
      </section>
    );
  }

  return (
    <section className="py-12 lg:py-20">
      <Container className="space-y-12">
        <SectionHeading eyebrow={o?.eyebrow ?? t("eyebrow")} title={o?.title ?? t("title")} />
        <ul className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-6">
          {rows.map((c, i) => {
            const name = pick(loc, c.nameAr, c.nameEn);
            const place = tilePlacement(i, rows.length);
            return (
              <Reveal as="li" key={c.id} delay={(i % 3) * 0.1} className={place.cls}>
                <Link href={`/shop?category=${encodeURIComponent(c.slug)}`} data-cursor="view" className={`group relative block overflow-hidden text-cream-50 md:aspect-[3/4] ${place.wide ? "aspect-[4/3]" : "aspect-[3/4]"}`}>
                  <ImageSlot src={c.imageUrl} alt={name} tone={toneOf(c.tone, "wine")} className="absolute inset-0 transition-transform duration-[1200ms] ease-luxe group-hover:scale-105" sizes="(min-width:768px) 33vw, 50vw" />
                  <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-wine-950/60 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-4 md:p-6">
                    <span className="font-display text-2xl md:text-4xl">{name}</span>
                    <span className="hidden text-xs uppercase tracking-[0.25em] sm:inline">{t("explore")}</span>
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}

/** Up to 3 latest live collections as large cards (same look as /collections). Renders nothing when there are none. */
export async function Collections({ o, limit = 3 }: { o?: SectionOverrides; limit?: number } = {}) {
  const max = Math.min(3, Math.max(1, Math.floor(limit)));
  const [t, ct, loc, rows] = await Promise.all([getTranslations("collectionsSection"), getTranslations("collectionsPage"), getLocale() as Promise<Loc>, listLatestCollections(max)]);
  if (!rows.length) return null;
  const href = o?.ctaHref ?? "/collections";
  const label = o?.ctaLabel ?? t("cta");
  return (
    <section className="py-12 lg:py-20">
      <Container className="space-y-12">
        <SectionHeading eyebrow={o?.eyebrow ?? t("eyebrow")} title={o?.title ?? t("title")} />
        <ul className={`grid gap-6 ${rows.length > 1 ? "md:grid-cols-2" : ""}`}>
          {rows.map((c, i) => (
            <Reveal as="li" key={c.id} delay={i * 0.08} className={rows.length === 3 && i === 0 ? "md:col-span-2" : undefined}>
              <Link href={`/collections/${c.slug}`} data-cursor="explore" className="group relative block aspect-[4/3] overflow-hidden text-cream-50">
                <ImageSlot src={c.coverUrl} alt={pick(loc, c.nameAr, c.nameEn)} tone={toneOf(c.tone, "wine")} className="absolute inset-0 transition-transform duration-[1400ms] ease-luxe group-hover:scale-105" sizes="(min-width:768px) 50vw, 100vw" />
                <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-wine-950/70 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 space-y-2 p-8">
                  <h3 className="font-display text-4xl">{pick(loc, c.nameAr, c.nameEn)}</h3>
                  <p className="max-w-md text-sm text-cream-100/85">{pick(loc, c.descriptionAr, c.descriptionEn)}</p>
                  <span className="inline-block pt-2 text-xs uppercase tracking-[0.25em]">{ct("view")}</span>
                </div>
              </Link>
            </Reveal>
          ))}
        </ul>
        <div className="flex justify-center">
          <Link href={href} className={buttonClasses("secondary")}>{label}</Link>
        </div>
      </Container>
    </section>
  );
}

export async function Editorial({ o }: { o?: SectionOverrides } = {}) {
  const t = await getTranslations("editorial");
  const href = o?.ctaHref ?? "/about";
  const label = o?.ctaLabel ?? t("cta");
  return (
    <section className="py-24 lg:py-32">
      <Container className="grid items-end gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-20">
        <Reveal><ImageSlot src={o?.image} alt={o?.title ?? ""} tone={toneOf(o?.tone, "cream")} className="aspect-[4/5] border border-line" sizes="(min-width:1024px) 40vw, 100vw" /></Reveal>
        <Reveal className="space-y-8 lg:pb-12">
          <SectionHeading eyebrow={o?.eyebrow ?? t("eyebrow")} title={o?.title ?? t("title")} />
          <p className="max-w-lg text-lg text-muted">{o?.body ?? t("body")}</p>
          <Link href={href} className={buttonClasses("secondary")}>{label}</Link>
        </Reveal>
      </Container>
    </section>
  );
}

export async function PromoBanner({ o }: { o?: SectionOverrides } = {}) {
  const t = await getTranslations("promo");
  const href = o?.ctaHref ?? "/shop";
  const label = o?.ctaLabel ?? t("cta");
  const band = toneOf(o?.tone, "wine");
  const bandCls =
    band === "wine" ? "bg-wine-800 text-cream-50"
    : band === "copper" ? "bg-copper-300 text-wine-900"
    : band === "sage" ? "bg-sage-200 text-wine-900"
    : "bg-cream-100 text-wine-900";
  const eyebrowCls = band === "wine" ? "text-copper-300" : "text-wine-900/60";
  const linkCls = band === "wine" ? buttonClasses("secondary", "border-cream-50 text-cream-50 hover:bg-cream-50 hover:text-wine-900") : buttonClasses("secondary", "border-wine-900 text-wine-900 hover:bg-wine-900 hover:text-cream-50");
  return (
    <section className="py-12">
      <Container>
        <Reveal className={`grid place-items-center gap-6 px-6 py-20 text-center ${bandCls}`}>
          <p className={`text-xs uppercase tracking-[0.3em] ${eyebrowCls}`}>{o?.eyebrow ?? t("eyebrow")}</p>
          <h2 className="max-w-2xl font-display text-4xl sm:text-5xl">{o?.title ?? t("title")}</h2>
          {o?.body ? <p className="max-w-xl text-sm opacity-80">{o.body}</p> : null}
          <Link href={href} className={linkCls}>{label}</Link>
        </Reveal>
      </Container>
    </section>
  );
}
