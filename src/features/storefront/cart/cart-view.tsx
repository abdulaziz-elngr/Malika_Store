"use client";

import { AnimatePresence } from "framer-motion";
import { ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";
import { buttonClasses } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Link } from "@/i18n/navigation";
import { CartLineItem } from "./cart-line";
import { useCart } from "./cart-provider";
import { CheckoutButton, CouponBox, FreeShippingBar, Totals } from "./cart-summary";

export function CartView() {
  const t = useTranslations("cart");
  const { ready, rows, pricing, pricingFailed } = useCart();
  const blocked = !!pricing?.hasIssues || rows.some((r) => r.line?.issue === "out_of_stock");

  return (
    <Container className="py-12 lg:py-16">
      <h1 className="font-display text-5xl text-brand sm:text-6xl">{t("title")}</h1>
      {!ready ? (
        <div className="mt-12 h-64 animate-pulse bg-line/40" aria-busy="true" />
      ) : rows.length === 0 ? (
        <div className="grid place-items-center gap-5 py-28 text-center">
          <ShoppingBag size={40} strokeWidth={1} className="text-accent" aria-hidden />
          <h2 className="font-display text-3xl text-brand">{t("emptyTitle")}</h2>
          <p className="max-w-sm text-muted">{t("emptyBody")}</p>
          <Link href="/shop" className={buttonClasses("primary")}>{t("continueShopping")}</Link>
        </div>
      ) : (
        <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-16">
          <section aria-label={t("items")}>
            <ul className="border-t border-line"><AnimatePresence initial={false}>{rows.map((r) => <CartLineItem key={r.variantId} row={r} variant="page" />)}</AnimatePresence></ul>
            {pricingFailed && <p role="alert" className="py-4 text-sm text-brand">{t("pricingFailed")}</p>}
            <Link href="/shop" className="mt-8 inline-block text-sm uppercase tracking-[0.18em] text-accent hover:text-foreground"><span aria-hidden className="inline-block rtl:rotate-180">←</span> {t("continueShopping")}</Link>
          </section>
          <aside aria-label={t("summary")} className="h-fit space-y-6 border border-line bg-surface p-6 lg:sticky lg:top-28">
            <h2 className="text-xs font-medium uppercase tracking-[0.25em] text-accent">{t("summary")}</h2>
            <FreeShippingBar />
            <CouponBox />
            <Totals />
            {blocked && <p role="alert" className="text-sm text-brand">{t("fixIssues")}</p>}
            <CheckoutButton blocked={blocked} className="w-full" />
            <p className="text-center text-xs text-muted">{t("secureNote")}</p>
          </aside>
        </div>
      )}
    </Container>
  );
}
