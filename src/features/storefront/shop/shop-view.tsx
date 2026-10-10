import { getTranslations } from "next-intl/server";
import { Reveal } from "@/components/motion/reveal";
import { buttonClasses } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Link } from "@/i18n/navigation";
import { shopQuerySchema } from "@/lib/validation/shop";
import { getFacets, listProducts } from "@/server/services/catalog";
import { FilterPanel } from "./filter-panel";
import { Pagination } from "./pagination";
import { ProductCard } from "./product-card";

type Props = {
  pathname: string;
  searchParams: Record<string, string | string[] | undefined>;
  fixedGender?: string;
  fixedCollection?: string;
  header: React.ReactNode;
};

export async function ShopView({ pathname, searchParams, fixedGender, fixedCollection, header }: Props) {
  const parsed = shopQuerySchema.parse(searchParams);
  const query = fixedCollection ? { ...parsed, collection: [fixedCollection] } : parsed;
  const [{ items, total, pages }, facets, t] = await Promise.all([listProducts(query, fixedGender), getFacets(fixedGender), getTranslations("shop")]);

  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(searchParams)) if (v != null && k !== "page") flat[k] = Array.isArray(v) ? v.join(",") : v;

  return (
    <Container className="py-12 lg:py-16">
      {header}
      <div className="mt-10 grid gap-x-12 lg:grid-cols-[16rem_1fr]">
        <FilterPanel facets={facets} total={total} hide={[...(fixedGender ? (["gender"] as const) : []), ...(fixedCollection ? (["collection"] as const) : [])]} />
        <div className="pt-8">
          {items.length === 0 ? (
            <div className="grid place-items-center gap-4 py-24 text-center">
              <h2 className="font-display text-3xl text-brand">{t("emptyTitle")}</h2>
              <p className="max-w-sm text-muted">{t("emptyBody")}</p>
              <Link href={pathname} className={buttonClasses("secondary")}>{t("clear")}</Link>
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-x-4 gap-y-10 md:gap-x-6 xl:grid-cols-3">
              {items.map((p, i) => (
                <Reveal as="li" key={p.id} delay={(i % 3) * 0.08} y={20}>
                  <ProductCard product={p} priority={i < 3} />
                </Reveal>
              ))}
            </ul>
          )}
          <Pagination page={query.page} pages={pages} pathname={pathname} query={flat} />
        </div>
      </div>
    </Container>
  );
}
