import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { PageHeader } from "@/features/storefront/shop/page-header";
import { ShopView } from "@/features/storefront/shop/shop-view";
import { pick, type Loc } from "@/lib/localize";
import { getAudience } from "@/server/services/catalog";

export const dynamic = "force-dynamic";
type Params = Promise<{ locale: Locale; slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, slug } = await params;
  const a = await getAudience(slug);
  return a ? { title: `${pick(locale, a.nameAr, a.nameEn)} — MALIKA` } : {};
}

/** Storefront page for any audience created in the admin (e.g. /for/kids). Women and Men keep /women and /men. */
export default async function AudiencePage({ params, searchParams }: { params: Params; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const a = await getAudience(slug);
  if (!a) notFound();
  const [loc, t] = await Promise.all([getLocale() as Promise<Loc>, getTranslations("shop")]);
  return <ShopView pathname={`/for/${slug}`} searchParams={await searchParams} fixedGender={slug} header={<PageHeader title={pick(loc, a.nameAr, a.nameEn)} subtitle={t("subtitle")} />} />;
}
