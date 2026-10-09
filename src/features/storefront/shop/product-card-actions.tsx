"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Heart, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useCart } from "@/features/storefront/cart/cart-provider";
import { useToast } from "@/components/ui/toast";
import { useWishlist } from "@/features/storefront/wishlist/wishlist-provider";
import { cn } from "@/lib/cn";

type Variant = { id: string; size: string; stock: number; colorHex: string };

/** Heart + quick-add overlay for a product card. Quick add works on the first colour that has stock. */
export function ProductCardActions({ productId, variants, name }: { productId: string; variants: Variant[]; name: string }) {
  const t = useTranslations("product");
  const cart = useCart();
  const wishlist = useWishlist();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const wished = wishlist.has(productId);

  const color = variants.find((v) => v.stock > 0)?.colorHex;
  const sizes = variants.filter((v) => v.colorHex === color);

  return (
    <>
      <button type="button" onClick={() => wishlist.toggle(productId)} aria-pressed={wished} aria-label={`${wished ? t("removeFromWishlist") : t("addToWishlist")}: ${name}`} className={cn("absolute end-3 top-3 z-10 grid size-10 place-items-center bg-background/90 transition-colors hover:text-accent", wished && "text-brand")}>
        <Heart size={17} strokeWidth={1.5} fill={wished ? "currentColor" : "none"} />
      </button>

      {color && (
        <div className="absolute inset-x-0 bottom-0 z-10" onMouseLeave={() => setOpen(false)}>
          <AnimatePresence initial={false} mode="wait">
            {open ? (
              <motion.div key="sizes" initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} className="bg-background/95 p-3">
                <p className="mb-2 text-center text-[0.65rem] uppercase tracking-[0.2em] text-muted">{t("quickAddPick")}</p>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {sizes.map((v) => (
                    <button key={v.id} type="button" disabled={v.stock === 0} onClick={() => { cart.add(v.id, 1, { openDrawer: false }); toast.push(t("addedToCart", { name }), "success"); setOpen(false); }} className="min-h-9 min-w-10 border border-line px-2.5 text-xs transition-colors hover:border-brand hover:bg-brand hover:text-brand-contrast disabled:cursor-not-allowed disabled:line-through disabled:opacity-40">
                      {v.size}
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.button key="btn" type="button" onClick={() => setOpen(true)} onFocus={() => setOpen(true)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex w-full translate-y-full items-center justify-center gap-2 bg-background/95 py-3 text-xs uppercase tracking-[0.2em] opacity-0 transition-all duration-500 ease-luxe focus-visible:translate-y-0 focus-visible:opacity-100 group-hover:translate-y-0 group-hover:opacity-100 max-lg:translate-y-0 max-lg:opacity-100" aria-label={`${t("quickAdd")}: ${name}`}>
                <Plus size={14} strokeWidth={1.6} />{t("quickAdd")}
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      )}
    </>
  );
}
