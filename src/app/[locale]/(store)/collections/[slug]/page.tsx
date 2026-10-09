import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { PageHeader } from "@/features/storefront/shop/page-header";
import { ShopView } from "@/features/storefront/shop/shop-view";
import { pick, type Loc } from "@/lib/localize";
import { getCollection } from "@/server/services/catalog";

export const dynamic = "force-dynamic";
type Params = Promise<{ locale: Locale; slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, slug } = await params;
  const c = await getCollection(slug);
  if (!c) return {};
  return { title: `${pick(locale, c.seoTitleAr ?? c.nameAr, c.seoTitleEn ?? c.nameEn)} — MALIKA`, description: pick(locale, c.seoDescriptionAr ?? c.descriptionAr, c.seoDescriptionEn ?? c.descriptionEn) };
}

export default async function CollectionPage({ params, searchParams }: { params: Params; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const c = await getCollection(slug);
  if (!c) notFound();
  const loc = (await getLocale()) as Loc;
  return <ShopView pathname={`/collections/${slug}`} searchParams={await searchParams} fixedCollection={slug} header={<PageHeader title={pick(loc, c.nameAr, c.nameEn)} subtitle={pick(loc, c.descriptionAr, c.descriptionEn)} />} />;
}
