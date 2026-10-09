import { Search } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { PageHeader } from "@/features/storefront/shop/page-header";
import { ShopView } from "@/features/storefront/shop/shop-view";

export const dynamic = "force-dynamic";

export default async function SearchPage({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("shop");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 80) : "";
  return (
    <ShopView
      pathname="/search"
      searchParams={sp}
      header={
        <div className="space-y-8">
          <PageHeader title={q ? t("searchResults", { q }) : t("searchTitle")} />
          <form action="" role="search" className="flex max-w-xl border-b border-brand">
            <input name="q" defaultValue={q} placeholder={t("searchPlaceholder")} aria-label={t("searchTitle")} className="h-12 flex-1 bg-transparent text-lg outline-none" />
            <button type="submit" aria-label={t("searchButton")} className="grid size-12 place-items-center"><Search size={20} strokeWidth={1.4} /></button>
          </form>
        </div>
      }
    />
  );
}
