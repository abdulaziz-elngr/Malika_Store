import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { Reveal } from "@/components/motion/reveal";
import { Container } from "@/components/ui/container";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { ImageSlot } from "@/features/storefront/home/image-slot";
import { PageHeader } from "@/features/storefront/shop/page-header";
import { pick, type Loc } from "@/lib/localize";
import { listCollections } from "@/server/services/catalog";

export const dynamic = "force-dynamic";

export default async function CollectionsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, rows, loc] = await Promise.all([getTranslations("collectionsPage"), listCollections(), getLocale()]);
  return (
    <Container className="space-y-12 py-12 lg:py-16">
      <PageHeader title={t("title")} subtitle={t("intro")} />
      <ul className="grid gap-6 md:grid-cols-2">
        {rows.map((c, i) => (
          <Reveal as="li" key={c.id} delay={i * 0.08}>
            <Link href={`/collections/${c.slug}`} data-cursor="explore" className="group relative block aspect-[4/3] overflow-hidden text-cream-50">
              <ImageSlot src={c.coverUrl} tone={c.tone as "wine"} className="absolute inset-0 transition-transform duration-[1400ms] ease-luxe group-hover:scale-105" sizes="(min-width:768px) 50vw, 100vw" />
              <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-wine-950/70 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 space-y-2 p-8">
                <h2 className="font-display text-4xl">{pick(loc as Loc, c.nameAr, c.nameEn)}</h2>
                <p className="max-w-md text-sm text-cream-100/85">{pick(loc as Loc, c.descriptionAr, c.descriptionEn)}</p>
                <span className="inline-block pt-2 text-xs uppercase tracking-[0.25em]">{t("view")}</span>
              </div>
            </Link>
          </Reveal>
        ))}
      </ul>
    </Container>
  );
}
