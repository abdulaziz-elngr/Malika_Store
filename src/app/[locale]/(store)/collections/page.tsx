import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { Reveal } from "@/components/motion/reveal";
import { Container } from "@/components/ui/container";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { ImageSlot } from "@/features/storefront/home/image-slot";
import { PageHeader } from "@/features/storefront/shop/page-header";
import { pick, type Loc } from "@/lib/localize";
import { cn } from "@/lib/cn";
import { listCollections, listVisibleAudiences } from "@/server/services/catalog";

export const dynamic = "force-dynamic";

export default async function CollectionsPage({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<{ audience?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [{ audience: wanted }, audiences] = await Promise.all([searchParams, listVisibleAudiences()]);
  // Only a known audience narrows the list; anything else shows every collection.
  const active = audiences.find((a) => a.slug === wanted)?.slug;
  const [t, rows, loc] = await Promise.all([getTranslations("collectionsPage"), listCollections(active), getLocale()]);
  const chip = "border px-4 py-2 text-xs uppercase tracking-[0.2em] transition-colors";
  return (
    <Container className="space-y-12 py-12 lg:py-16">
      <PageHeader title={t("title")} subtitle={t("intro")} />
      {audiences.length > 1 && (
        <nav aria-label={t("filterByAudience")} className="flex flex-wrap gap-2">
          <Link href="/collections" className={cn(chip, !active ? "border-brand bg-brand text-brand-contrast" : "border-line hover:border-accent")}>{t("all")}</Link>
          {audiences.map((a) => (
            <Link key={a.slug} href={`/collections?audience=${a.slug}`} className={cn(chip, active === a.slug ? "border-brand bg-brand text-brand-contrast" : "border-line hover:border-accent")}>
              {pick(loc as Loc, a.nameAr, a.nameEn)}
            </Link>
          ))}
        </nav>
      )}
      <ul className="grid gap-6 md:grid-cols-2">
        {rows.map((c, i) => (
          <Reveal as="li" key={c.id} delay={i * 0.08}>
            <Link href={`/collections/${c.slug}`} data-cursor="explore" className="group relative block aspect-[4/3] overflow-hidden text-cream-50">
              <ImageSlot src={c.coverUrl} tone={c.tone as "wine"} className="absolute inset-0 transition-transform duration-[1400ms] ease-luxe group-hover:scale-105" sizes="(min-width:768px) 50vw, 100vw" />
              <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-wine-950/70 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 space-y-2 p-8">
                {c.audienceSlug && <p className="text-[0.68rem] uppercase tracking-[0.25em] text-cream-100/80">{pick(loc as Loc, c.audienceNameAr, c.audienceNameEn)}</p>}
                <h2 className="font-display text-4xl">{pick(loc as Loc, c.nameAr, c.nameEn)}</h2>
                <p className="max-w-md text-sm text-cream-100/85">{pick(loc as Loc, c.descriptionAr, c.descriptionEn)}</p>
                <span className="inline-block pt-2 text-xs uppercase tracking-[0.25em]">{t("view")}</span>
              </div>
            </Link>
          </Reveal>
        ))}
      </ul>
      {rows.length === 0 && <p className="py-16 text-center text-muted">{t("empty")}</p>}
    </Container>
  );
}
