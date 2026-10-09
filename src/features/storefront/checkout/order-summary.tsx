"use client";

import { useLocale, useTranslations } from "next-intl";
import { ImageSlot } from "@/features/storefront/home/image-slot";
import { CouponBox, Totals } from "@/features/storefront/cart/cart-summary";
import { useCart } from "@/features/storefront/cart/cart-provider";
import { formatMoney, pick, type Loc } from "@/lib/localize";

type Tone = "wine" | "copper" | "cream" | "sage";

export function OrderSummary() {
  const t = useTranslations("checkout");
  const loc = useLocale() as Loc;
  const { rows } = useCart();
  return (
    <aside aria-label={t("summary")} className="h-fit space-y-6 border border-line bg-surface p-6 lg:sticky lg:top-28">
      <h2 className="text-xs font-medium uppercase tracking-[0.25em] text-accent">{t("summary")}</h2>
      <ul className="max-h-80 space-y-4 overflow-y-auto pe-1">
        {rows.map((r) =>
          r.line ? (
            <li key={r.variantId} className="flex gap-3">
              <div className="relative w-14 shrink-0">
                <ImageSlot src={r.line.imageUrl} tone={r.line.tone as Tone} sizes="56px" className="aspect-[3/4]" />
                <span className="absolute -end-2 -top-2 grid size-5 place-items-center rounded-full bg-brand text-[0.65rem] text-brand-contrast">{r.quantity}</span>
              </div>
              <div className="min-w-0 flex-1 text-sm">
                <p className="truncate font-display text-base">{pick(loc, r.line.nameAr, r.line.nameEn)}</p>
                <p className="text-muted">{pick(loc, r.line.colorNameAr, r.line.colorNameEn)} · {r.line.size}</p>
              </div>
              <p className="text-sm">{formatMoney(r.line.lineTotalMinor, loc)}</p>
            </li>
          ) : (
            <li key={r.variantId} className="h-16 animate-pulse bg-line/50" aria-busy="true" />
          ),
        )}
      </ul>
      <CouponBox />
      <Totals />
      <p className="text-xs text-muted">{t("codNote")}</p>
    </aside>
  );
}
