import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { Container } from "@/components/ui/container";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { ProductBuyPanel } from "@/features/storefront/product/product-buy-panel";
import { ProductCard } from "@/features/storefront/shop/product-card";
import { pick, type Loc } from "@/lib/localize";
import { getProductBySlug, getRelatedProducts } from "@/server/services/catalog";

export const dynamic = "force-dynamic";
type Params = Promise<{ locale: Locale; slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) return {};
  return {
    title: `${pick(locale, p.seoTitleAr ?? p.nameAr, p.seoTitleEn ?? p.nameEn)} — MALIKA`,
    description: pick(locale, p.seoDescriptionAr ?? p.shortAr, p.seoDescriptionEn ?? p.shortEn),
    alternates: { canonical: `/${locale}/products/${slug}` },
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const product = await getProductBySlug(slug);
  if (!product) notFound();
  const [t, loc, related] = await Promise.all([getTranslations("product"), getLocale() as Promise<Loc>, getRelatedProducts(product.id, product.categoryId)]);
  const name = pick(loc, product.nameAr, product.nameEn);

  const jsonLd = {
    "@context": "https://schema.org", "@type": "Product", name, sku: product.sku,
    description: pick(loc, product.shortAr, product.shortEn),
    offers: { "@type": "Offer", priceCurrency: "EGP", price: (product.salePriceMinor ?? product.priceMinor) / 100, availability: product.variants.some((v) => v.stock > 0) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock" },
  };

  const info = [
    { title: t("materials"), body: pick(loc, product.materialsAr, product.materialsEn) },
    { title: t("care"), body: pick(loc, product.careAr, product.careEn) },
    { title: t("shipping"), body: t("shippingBody") },
    { title: t("returns"), body: t("returnsBody") },
  ];

  return (
    <Container className="py-10 lg:py-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <nav aria-label="Breadcrumb" className="mb-8 text-xs uppercase tracking-[0.18em] text-muted">
        <Link href="/" className="hover:text-foreground">{t("home")}</Link>
        {product.category && (<> <span aria-hidden>/</span> <Link href={`/shop?category=${product.category.slug}`} className="hover:text-foreground">{pick(loc, product.category.nameAr, product.category.nameEn)}</Link></>)}
      </nav>

      <h1 className="mb-8 font-display text-4xl text-brand sm:text-5xl lg:max-w-[60%]">{name}</h1>
      <ProductBuyPanel
        productId={product.id}
        name={name}
        basePrice={product.priceMinor}
        salePrice={product.salePriceMinor}
        images={product.images.map((i) => ({ id: i.id, url: i.url, tone: i.tone, altAr: i.altAr, altEn: i.altEn, colorHex: i.colorHex }))}
        variants={product.variants.map((v) => ({ id: v.id, size: v.size, colorNameAr: v.colorNameAr, colorNameEn: v.colorNameEn, colorHex: v.colorHex, stock: v.stock, priceMinor: v.priceMinor }))}
      />

      <section aria-labelledby="pd-details" className="mt-16 grid gap-10 border-t border-line pt-12 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-4">
          <h2 id="pd-details" className="text-xs font-medium uppercase tracking-[0.25em] text-accent">{t("details")}</h2>
          <p className="text-lg text-muted">{pick(loc, product.descriptionAr, product.descriptionEn)}</p>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">{t("sku")}: <span dir="ltr">{product.sku}</span></p>
        </div>
        <div className="divide-y divide-line border-y border-line">
          {info.map((i) => (
            <details key={i.title} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between text-sm uppercase tracking-[0.18em]">
                {i.title}<span aria-hidden className="text-accent transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="pt-3 text-muted">{i.body}</p>
            </details>
          ))}
        </div>
      </section>

      {related.length > 0 && (
        <section aria-labelledby="pd-related" className="mt-24">
          <h2 id="pd-related" className="mb-10 font-display text-4xl text-brand">{t("related")}</h2>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4 lg:gap-x-6">
            {related.map((p) => (<li key={p.id}><ProductCard product={p} /></li>))}
          </ul>
        </section>
      )}
    </Container>
  );
}
