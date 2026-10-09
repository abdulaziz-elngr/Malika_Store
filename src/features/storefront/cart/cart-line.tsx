"use client";

import { motion } from "framer-motion";
import { Heart, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { useToast } from "@/components/ui/toast";
import { ImageSlot } from "@/features/storefront/home/image-slot";
import { Link } from "@/i18n/navigation";
import { MAX_LINE_QTY } from "@/lib/cart-types";
import { cn } from "@/lib/cn";
import { formatMoney, pick, type Loc } from "@/lib/localize";
import { useWishlist } from "@/features/storefront/wishlist/wishlist-provider";
import { useCart, type ViewLine } from "./cart-provider";

type Tone = "wine" | "copper" | "cream" | "sage";

export function CartLineItem({ row, variant }: { row: ViewLine; variant: "drawer" | "page" }) {
  const t = useTranslations("cart");
  const loc = useLocale() as Loc;
  const { setQuantity, remove, close } = useCart();
  const wishlist = useWishlist();
  const toast = useToast();
  const l = row.line;
  const thumb = variant === "drawer" ? "w-20" : "w-24 sm:w-28";

  const motionProps = {
    layout: true,
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, x: loc === "ar" ? -24 : 24, height: 0, marginBottom: 0, paddingBottom: 0 },
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
  };

  if (!l) {
    return (
      <motion.li {...motionProps} className="flex gap-4 border-b border-line py-5" aria-busy="true">
        <div className={cn("aspect-[3/4] animate-pulse bg-line/60", thumb)} />
        <div className="flex-1 space-y-3 pt-1"><div className="h-4 w-2/3 animate-pulse bg-line/60" /><div className="h-3 w-1/3 animate-pulse bg-line/60" /></div>
      </motion.li>
    );
  }

  const out = l.issue === "out_of_stock";
  const name = pick(loc, l.nameAr, l.nameEn);
  const wished = wishlist.has(l.productId);
  const moveToWishlist = () => {
    if (!wished) wishlist.toggle(l.productId);
    else toast.push(t("alreadyWished"), "info");
    remove(l.variantId);
  };

  return (
    <motion.li {...motionProps} className="flex gap-4 border-b border-line py-5">
      <Link href={`/products/${l.slug}`} onClick={close} className={cn("relative block shrink-0 self-start overflow-hidden", thumb)} aria-label={name}>
        <ImageSlot src={l.imageUrl} alt="" tone={l.tone as Tone} sizes="120px" className="aspect-[3/4]" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-lg leading-snug text-foreground"><Link href={`/products/${l.slug}`} onClick={close}>{name}</Link></h3>
            <p className="mt-1 flex items-center gap-2 text-sm text-muted">
              <span className="size-3 rounded-full border border-line" style={{ background: l.colorHex }} aria-hidden />
              {pick(loc, l.colorNameAr, l.colorNameEn)} · {l.size}
            </p>
          </div>
          <button type="button" onClick={() => remove(l.variantId)} aria-label={t("remove", { name })} className="-me-2 -mt-1 grid size-9 shrink-0 place-items-center text-muted transition-colors hover:text-brand">
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        {out ? (
          <p role="alert" className="mt-3 text-sm text-brand">{t("outOfStock")}</p>
        ) : (
          <>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <QuantityStepper size="sm" value={row.quantity} max={Math.min(l.stock, MAX_LINE_QTY)} onChange={(n) => setQuantity(l.variantId, n)} />
              <p className="text-sm">
                {l.originalPriceMinor > l.unitPriceMinor && <s className="me-2 text-muted">{formatMoney(l.originalPriceMinor * row.quantity, loc)}</s>}
                <span className={l.originalPriceMinor > l.unitPriceMinor ? "text-brand" : undefined}>{formatMoney(l.unitPriceMinor * row.quantity, loc)}</span>
              </p>
            </div>
            {l.stock <= 3 && <p className="mt-2 text-xs text-brand">{t("lowStock", { count: l.stock })}</p>}
          </>
        )}

        <button type="button" onClick={moveToWishlist} className="mt-3 inline-flex items-center gap-2 self-start text-xs uppercase tracking-[0.15em] text-muted transition-colors hover:text-foreground">
          <Heart size={14} strokeWidth={1.5} />{t("moveToWishlist")}
        </button>
      </div>
    </motion.li>
  );
}
