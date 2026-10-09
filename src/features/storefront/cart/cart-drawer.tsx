"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ShoppingBag, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { buttonClasses } from "@/components/ui/button";
import { Link, usePathname } from "@/i18n/navigation";
import { CartLineItem } from "./cart-line";
import { useCart } from "./cart-provider";
import { CheckoutButton, CouponBox, FreeShippingBar, Totals } from "./cart-summary";

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';

export function CartDrawer() {
  const t = useTranslations("cart");
  const dir = useLocale() === "ar" ? -1 : 1;
  const { isOpen, close, rows, count, pricing, pricingFailed } = useCart();
  const pathname = usePathname();
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);

  // Close when the route changes (not on every cart update).
  useEffect(() => {
    close();
  }, [pathname, close]);

  useEffect(() => {
    if (!isOpen) return;
    opener.current = document.activeElement;
    document.body.style.overflow = "hidden";
    const raf = requestAnimationFrame(() => panel.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return close();
      if (e.key !== "Tab" || !panel.current) return;
      const els = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (!els.length) return;
      const first = els[0]!, last = els[els.length - 1]!;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
      (opener.current as HTMLElement | null)?.focus?.();
    };
  }, [isOpen, close]);

  const blocked = !!pricing?.hasIssues || rows.some((r) => r.line?.issue === "out_of_stock");

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[55]">
          <motion.div className="absolute inset-0 bg-foreground/40 backdrop-blur-[2px]" onClick={close} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} aria-hidden />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label={t("title")}
            className="absolute inset-y-0 end-0 flex w-full max-w-md flex-col bg-background shadow-soft"
            initial={{ x: `${-dir * 100}%` }}
            animate={{ x: 0 }}
            exit={{ x: `${-dir * 100}%` }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <header className="flex h-20 shrink-0 items-center justify-between border-b border-line px-6">
              <h2 className="font-display text-2xl text-brand">{t("title")} {count > 0 && <span className="text-base text-muted">({count})</span>}</h2>
              <button type="button" data-autofocus onClick={close} aria-label={t("close")} className="grid size-10 place-items-center hover:text-accent"><X size={20} strokeWidth={1.4} /></button>
            </header>

            {rows.length === 0 ? (
              <div className="grid flex-1 place-content-center justify-items-center gap-5 px-8 text-center">
                <ShoppingBag size={34} strokeWidth={1} className="text-accent" aria-hidden />
                <p className="font-display text-3xl text-brand">{t("emptyTitle")}</p>
                <p className="max-w-xs text-muted">{t("emptyBody")}</p>
                <Link href="/shop" onClick={close} className={buttonClasses("primary")}>{t("continueShopping")}</Link>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto px-6">
                  <ul><AnimatePresence initial={false}>{rows.map((r) => <CartLineItem key={r.variantId} row={r} variant="drawer" />)}</AnimatePresence></ul>
                  {pricingFailed && <p role="alert" className="py-4 text-sm text-brand">{t("pricingFailed")}</p>}
                </div>
                <footer className="shrink-0 space-y-5 border-t border-line bg-surface px-6 py-6">
                  <FreeShippingBar />
                  <CouponBox />
                  <Totals />
                  {blocked && <p role="alert" className="text-sm text-brand">{t("fixIssues")}</p>}
                  <div className="grid gap-3">
                    <CheckoutButton blocked={blocked} />
                    <Link href="/cart" className={buttonClasses("ghost")}>{t("viewCart")}</Link>
                  </div>
                </footer>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
