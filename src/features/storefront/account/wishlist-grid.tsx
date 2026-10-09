"use client";

import { Heart } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { buttonClasses } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useCart } from "@/features/storefront/cart/cart-provider";
import { ImageSlot } from "@/features/storefront/home/image-slot";
import { useWishlist } from "@/features/storefront/wishlist/wishlist-provider";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { formatMoney, pick, type Loc } from "@/lib/localize";

type Tone = "wine" | "copper" | "cream" | "sage";
type Item = { id: string; slug: string; nameAr: string; nameEn: string; priceMinor: number; salePriceMinor: number | null; image: { url: string | null; tone: string } | null; variants: { id: string; size: string; stock: number; colorHex: string }[] };

export function WishlistGrid() {
  const t = useTranslations("wishlist");
  const loc = useLocale() as Loc;
  const wishlist = useWishlist();
  const cart = useCart();
  const toast = useToast();
  const [items, setItems] = useState<Item[] | null>(null);
  const [failed, setFailed] = useState(false);
  const idsKey = wishlist.ids.join(",");

  useEffect(() => {
    if (wishlist.authenticated === null) return;
    if (!idsKey) {
      setItems([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/wishlist/products?ids=${idsKey}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: Item[]) => !cancelled && (setItems(d), setFailed(false)))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [idsKey, wishlist.authenticated]);

  if (failed) return <p role="alert" className="text-brand">{t("loadFailed")}</p>;
  if (items === null) return <div className="grid grid-cols-2 gap-6 lg:grid-cols-3" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="aspect-[3/4] animate-pulse bg-line/40" />)}</div>;
  // Only show items that are still on the wishlist (removals happen instantly in the provider).
  const shown = items.filter((i) => wishlist.has(i.id));
  if (shown.length === 0)
    return (
      <div className="grid place-items-center gap-5 py-20 text-center">
        <Heart size={38} strokeWidth={1} className="text-accent" aria-hidden />
        <h2 className="font-display text-3xl text-brand">{t("emptyTitle")}</h2>
        <p className="max-w-sm text-muted">{t("emptyBody")}</p>
        <Link href="/shop" className={buttonClasses("primary")}>{t("browse")}</Link>
      </div>
    );

  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-3 lg:gap-x-6">
      {shown.map((p) => {
        const name = pick(loc, p.nameAr, p.nameEn);
        const color = p.variants.find((v) => v.stock > 0)?.colorHex;
        const sizes = p.variants.filter((v) => v.colorHex === color);
        const onSale = p.salePriceMinor != null && p.salePriceMinor < p.priceMinor;
        return (
          <li key={p.id} className="space-y-3">
            <Link href={`/products/${p.slug}`} className="block" aria-label={name}>
              <ImageSlot src={p.image?.url} tone={(p.image?.tone as Tone) ?? "wine"} sizes="(min-width:1024px) 30vw, 50vw" className="aspect-[3/4]" />
            </Link>
            <div className="space-y-1">
              <h3 className="font-display text-xl leading-tight"><Link href={`/products/${p.slug}`}>{name}</Link></h3>
              <p className="flex items-baseline gap-3 text-sm">
                <span className={onSale ? "text-brand" : undefined}>{formatMoney(p.salePriceMinor ?? p.priceMinor, loc)}</span>
                {onSale && <s className="text-muted">{formatMoney(p.priceMinor, loc)}</s>}
              </p>
              <p className={cn("text-xs uppercase tracking-[0.15em]", color ? "text-sage-700 dark:text-sage-500" : "text-muted")}>{color ? t("inStock") : t("outOfStock")}</p>
            </div>
            {color && (
              <div>
                <p className="mb-2 text-[0.65rem] uppercase tracking-[0.2em] text-muted">{t("moveToCart")}</p>
                <div className="flex flex-wrap gap-1.5">
                  {sizes.map((v) => (
                    <button key={v.id} type="button" disabled={v.stock === 0} onClick={() => { cart.add(v.id, 1); wishlist.toggle(p.id); }} className="min-h-9 min-w-10 border border-line px-2.5 text-xs transition-colors hover:border-brand hover:bg-brand hover:text-brand-contrast disabled:cursor-not-allowed disabled:line-through disabled:opacity-40">
                      {v.size}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <button type="button" onClick={() => { wishlist.toggle(p.id); toast.push(t("removed"), "info"); }} className="text-xs uppercase tracking-[0.15em] text-muted underline underline-offset-4 hover:text-brand">{t("remove")}</button>
          </li>
        );
      })}
    </ul>
  );
}
