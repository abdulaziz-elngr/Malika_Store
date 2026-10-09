import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { formatMoney, pick, type Loc } from "@/lib/localize";
import type { ProductListItem } from "@/server/services/catalog";
import { ImageSlot } from "@/features/storefront/home/image-slot";
import { ProductCardActions } from "./product-card-actions";

type Tone = "wine" | "copper" | "cream" | "sage";

export async function ProductCard({ product, priority = false }: { product: ProductListItem; priority?: boolean }) {
  const loc = (await getLocale()) as Loc;
  const t = await getTranslations("product");
  const [main, hover] = product.images;
  const onSale = product.salePriceMinor != null && product.salePriceMinor < product.priceMinor;
  const colors = [...new Map(product.variants.map((v) => [v.colorHex, v])).values()];
  const available = product.variants.some((v) => v.stock > 0);
  const name = pick(loc, product.nameAr, product.nameEn);

  return (
    <article className="group">
      <div className="relative">
      <Link href={`/products/${product.slug}`} data-cursor="view" className="block" aria-label={name}>
        <div className="relative aspect-[3/4] overflow-hidden bg-surface">
          <ImageSlot src={main?.url} alt={pick(loc, main?.altAr, main?.altEn)} tone={(main?.tone as Tone) ?? "wine"} priority={priority} sizes="(min-width:1024px) 25vw, 50vw" className="absolute inset-0 transition-transform duration-[1400ms] ease-luxe group-hover:scale-[1.04]" />
          {hover && (
            <ImageSlot src={hover.url} tone={(hover.tone as Tone) ?? "cream"} sizes="(min-width:1024px) 25vw, 50vw" className="absolute inset-0 opacity-0 transition-opacity duration-700 ease-luxe group-hover:opacity-100" />
          )}
          <div className="absolute start-3 top-3 flex flex-col items-start gap-1.5">
            {product.isNew && <span className="bg-background px-2.5 py-1 text-[0.65rem] uppercase tracking-[0.2em] text-brand">{t("new")}</span>}
            {onSale && <span className="bg-brand px-2.5 py-1 text-[0.65rem] uppercase tracking-[0.2em] text-brand-contrast">{t("sale")}</span>}
          </div>
          {!available && (
            <div className="absolute inset-x-0 bottom-0 bg-background/85 py-2 text-center text-xs uppercase tracking-[0.2em] text-muted">{t("outOfStock")}</div>
          )}
        </div>
      </Link>
      <ProductCardActions productId={product.id} name={name} variants={product.variants.map((v) => ({ id: v.id, size: v.size, stock: v.stock, colorHex: v.colorHex }))} />
      </div>
      <div className="space-y-2 pt-4">
        <h3 className="font-display text-xl leading-tight text-foreground">
          <Link href={`/products/${product.slug}`}>{name}</Link>
        </h3>
        <p className="flex items-baseline gap-3 text-sm">
          <span className={onSale ? "text-brand" : "text-foreground"}>{formatMoney(product.salePriceMinor ?? product.priceMinor, loc)}</span>
          {onSale && <s className="text-muted">{formatMoney(product.priceMinor, loc)}</s>}
        </p>
        <ul className="flex gap-1.5" aria-label={t("color")}>
          {colors.map((c) => (
            <li key={c.colorHex} title={pick(loc, c.colorNameAr, c.colorNameEn)} className="size-3.5 rounded-full border border-line" style={{ background: c.colorHex }} />
          ))}
        </ul>
      </div>
    </article>
  );
}
