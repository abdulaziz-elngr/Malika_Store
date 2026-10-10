"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Heart } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { useCart } from "@/features/storefront/cart/cart-provider";
import { useWishlist } from "@/features/storefront/wishlist/wishlist-provider";
import { useRouter } from "@/i18n/navigation";
import { MAX_LINE_QTY } from "@/lib/cart-types";
import { cn } from "@/lib/cn";
import { formatMoney, pick, type Loc } from "@/lib/localize";
import { ImageSlot } from "@/features/storefront/home/image-slot";

type Tone = "wine" | "copper" | "cream" | "sage";
export type PanelImage = { id: string; url: string | null; tone: string; altAr: string | null; altEn: string | null; colorHex: string | null };
export type PanelVariant = { id: string; size: string; colorNameAr: string; colorNameEn: string; colorHex: string; stock: number; priceMinor: number | null };
type Props = { productId: string; name: string; basePrice: number; salePrice: number | null; images: PanelImage[]; variants: PanelVariant[] };

export function ProductBuyPanel({ productId, name, basePrice, salePrice, images, variants }: Props) {
  const t = useTranslations("product");
  const loc = useLocale() as Loc;
  const colors = useMemo(() => [...new Map(variants.map((v) => [v.colorHex, v])).values()], [variants]);
  const sizes = useMemo(() => [...new Map(variants.map((v) => [v.size, v.size])).values()], [variants]);
  const firstAvailable = variants.find((v) => v.stock > 0) ?? variants[0];
  const [color, setColor] = useState(firstAvailable?.colorHex ?? "");
  const [size, setSize] = useState<string | null>(null);
  const [active, setActive] = useState(0);

  const gallery = useMemo(() => {
    const own = images.filter((i) => i.colorHex === color);
    return own.length ? own : images;
  }, [images, color]);
  const current = gallery[Math.min(active, gallery.length - 1)];

  const variant = variants.find((v) => v.colorHex === color && v.size === size);
  const unitBase = variant?.priceMinor ?? basePrice;
  const unitSale = variant?.priceMinor ? null : salePrice;
  const price = unitSale ?? unitBase;
  const onSale = unitSale != null && unitSale < unitBase;
  const percent = onSale ? Math.round((1 - unitSale! / unitBase) * 100) : 0;

  const [qty, setQty] = useState(1);
  const [tried, setTried] = useState(false);
  const cart = useCart();
  const wishlist = useWishlist();
  const router = useRouter();
  const wished = wishlist.has(productId);
  const canBuy = !!variant && variant.stock > 0;
  const maxQty = Math.max(1, Math.min(variant?.stock ?? 1, MAX_LINE_QTY));

  const addToCart = (buyNow: boolean) => {
    if (!variant) return setTried(true);
    if (variant.stock === 0) return;
    cart.add(variant.id, Math.min(qty, maxQty), { openDrawer: !buyNow });
    if (buyNow) router.push("/checkout");
  };

  const sizeStock = (s: string) => variants.find((v) => v.colorHex === color && v.size === s)?.stock ?? 0;

  const stockLine = !variant
    ? null
    : variant.stock === 0
      ? { text: t("outOfStock"), tone: "text-muted" }
      : variant.stock <= 3
        ? { text: t("lowStock", { count: variant.stock }), tone: "text-brand" }
        : { text: t("inStock"), tone: "text-sage-700 dark:text-sage-500" };

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-16">
      <div role="region" aria-label={t("gallery")} className="grid gap-4 sm:grid-cols-[5rem_minmax(0,1fr)]">
        <ul className="order-2 flex min-w-0 gap-3 overflow-x-auto pb-1 sm:order-1 sm:flex-col sm:overflow-visible sm:pb-0">
          {gallery.map((img, i) => (
            <li key={img.id}>
              <button type="button" onClick={() => setActive(i)} aria-label={t("view", { n: i + 1 })} aria-current={i === active} className={cn("block w-16 shrink-0 overflow-hidden border transition-opacity sm:w-full", i === active ? "border-brand" : "border-line opacity-70 hover:opacity-100")}>
                <ImageSlot src={img.url} tone={img.tone as Tone} className="aspect-[3/4]" sizes="80px" />
              </button>
            </li>
          ))}
        </ul>
        <div data-cursor="explore" className="relative order-1 aspect-[3/4] overflow-hidden bg-surface sm:order-2">
          <AnimatePresence mode="popLayout">
            <motion.div key={current?.id} className="absolute inset-0" initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
              <ImageSlot src={current?.url} alt={pick(loc, current?.altAr, current?.altEn)} tone={(current?.tone as Tone) ?? "wine"} priority sizes="(min-width:1024px) 55vw, 100vw" className="size-full" />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="space-y-8 lg:pt-4">
        <div className="space-y-3">
          <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-2xl">
            <span className={onSale ? "text-brand" : undefined}>{formatMoney(price, loc)}</span>
            {onSale && <s className="text-base text-muted">{formatMoney(unitBase, loc)}</s>}
            {onSale && <span className="bg-brand px-2 py-0.5 text-xs uppercase tracking-[0.15em] text-brand-contrast">{t("off", { percent })}</span>}
          </p>
        </div>

        <fieldset>
          <legend className="mb-3 text-[0.72rem] font-medium uppercase tracking-[0.22em] text-accent">
            {t("color")}: <span className="text-foreground">{pick(loc, colors.find((c) => c.colorHex === color)?.colorNameAr, colors.find((c) => c.colorHex === color)?.colorNameEn)}</span>
          </legend>
          <div className="flex flex-wrap gap-3">
            {colors.map((c) => (
              <button key={c.colorHex} type="button" aria-pressed={c.colorHex === color} aria-label={pick(loc, c.colorNameAr, c.colorNameEn)} onClick={() => { setColor(c.colorHex); setActive(0); setSize((s) => (s && variants.some((v) => v.colorHex === c.colorHex && v.size === s) ? s : null)); }} className={cn("size-9 rounded-full border-2 transition-shadow", c.colorHex === color ? "border-brand ring-2 ring-accent ring-offset-2 ring-offset-background" : "border-line")} style={{ background: c.colorHex }} />
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-3 text-[0.72rem] font-medium uppercase tracking-[0.22em] text-accent">{t("size")}</legend>
          <div className="flex flex-wrap gap-2">
            {sizes.map((s) => {
              const out = sizeStock(s) === 0;
              return (
                <button key={s} type="button" aria-pressed={size === s} disabled={out} onClick={() => setSize(s)} className={cn("relative min-h-11 min-w-12 border px-4 text-sm transition-colors", size === s ? "border-brand bg-brand text-brand-contrast" : "border-line hover:border-accent", out && "cursor-not-allowed text-muted line-through opacity-50")}>
                  {s}
                </button>
              );
            })}
          </div>
          <p className={cn("mt-3 min-h-6 text-sm", stockLine?.tone ?? (tried ? "text-brand" : "text-muted"))} aria-live="polite">{stockLine?.text ?? t("selectSize")}</p>
        </fieldset>

        <div className="space-y-3">
          <div className="flex gap-3">
            <QuantityStepper value={Math.min(qty, maxQty)} max={maxQty} onChange={setQty} className="h-12 shrink-0" />
            <Button className="flex-1" onClick={() => addToCart(false)} disabled={!!variant && variant.stock === 0}>
              {variant && variant.stock === 0 ? t("outOfStock") : t("addToCart")}
            </Button>
            <button type="button" onClick={() => wishlist.toggle(productId)} aria-pressed={wished} aria-label={wished ? t("removeFromWishlist") : t("addToWishlist")} className={cn("grid size-12 shrink-0 place-items-center border transition-colors", wished ? "border-brand bg-brand text-brand-contrast" : "border-line hover:border-accent")}>
              <Heart size={18} strokeWidth={1.5} fill={wished ? "currentColor" : "none"} />
            </button>
          </div>
          <Button variant="secondary" className="w-full" onClick={() => addToCart(true)} disabled={!!variant && !canBuy}>{t("buyNow")}</Button>
        </div>

        <details className="group border-y border-line py-4">
          <summary className="cursor-pointer list-none text-sm uppercase tracking-[0.18em]">{t("sizeGuide")}</summary>
          <p className="mt-3 text-xs text-muted">{t("sizeGuideNote")}</p>
          <table className="mt-3 w-full text-center text-sm" dir="ltr">
            <thead className="text-xs uppercase tracking-[0.15em] text-accent"><tr><th className="py-2 text-start">{t("size")}</th><th>{t("bust")}</th><th>{t("waist")}</th><th>{t("hip")}</th></tr></thead>
            <tbody>
              {[["XS", 82, 64, 88], ["S", 86, 68, 92], ["M", 90, 72, 96], ["L", 95, 77, 101], ["XL", 100, 82, 106]].map(([s, b, w, h]) => (
                <tr key={s} className="border-t border-line"><th className="py-2 text-start font-medium">{s}</th><td>{b}</td><td>{w}</td><td>{h}</td></tr>
              ))}
            </tbody>
          </table>
        </details>
        <span className="sr-only">{name}</span>
      </div>
    </div>
  );
}
