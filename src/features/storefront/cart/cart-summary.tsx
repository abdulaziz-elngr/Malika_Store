"use client";

import { Tag, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Button, buttonClasses } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { inputClass } from "@/components/ui/field";
import { formatMoney, type Loc } from "@/lib/localize";
import { FREE_SHIPPING_THRESHOLD_MINOR } from "@/lib/shipping";
import { useCart } from "./cart-provider";

export function FreeShippingBar() {
  const t = useTranslations("cart");
  const loc = useLocale() as Loc;
  const { pricing } = useCart();
  if (!pricing || pricing.subtotalMinor === 0) return null;
  const remaining = pricing.freeShippingRemainingMinor;
  const pct = Math.min(100, Math.round(((FREE_SHIPPING_THRESHOLD_MINOR - remaining) / FREE_SHIPPING_THRESHOLD_MINOR) * 100));
  return (
    <div className="space-y-2">
      <p className="text-sm">{remaining > 0 ? t("freeShippingAway", { amount: formatMoney(remaining, loc) }) : t("freeShippingReached")}</p>
      <div className="h-px w-full bg-line" role="presentation"><div className="h-px bg-accent transition-[width] duration-700 ease-luxe" style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

export function CouponBox() {
  const t = useTranslations("cart");
  const loc = useLocale() as Loc;
  const { coupon, applyCoupon, removeCoupon, pricing, pricingLoading } = useCart();
  const [value, setValue] = useState("");
  const status = pricing?.coupon;

  if (coupon) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between border border-line bg-surface px-4 py-3 text-sm">
          <span className="flex items-center gap-2"><Tag size={14} className="text-accent" /><span dir="ltr" className="font-medium tracking-wider">{coupon}</span></span>
          <button type="button" onClick={removeCoupon} aria-label={t("removeCoupon")} className="text-muted hover:text-brand"><X size={15} /></button>
        </div>
        {status && !status.ok && (
          <p role="alert" className="text-sm text-brand">
            {status.reason === "min_order" && status.minOrderMinor ? t("couponMinOrder", { amount: formatMoney(status.minOrderMinor, loc) }) : t(`coupon_${status.reason}`)}
          </p>
        )}
        {status?.ok && !pricingLoading && <p className="text-sm text-sage-700 dark:text-sage-500">{t("couponApplied", { amount: formatMoney(status.discountMinor, loc) })}</p>}
      </div>
    );
  }
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (value.trim()) { applyCoupon(value); setValue(""); } }} className="flex gap-2">
      <input value={value} onChange={(e) => setValue(e.target.value)} dir="ltr" autoCapitalize="characters" autoComplete="off" maxLength={40} placeholder={t("couponPlaceholder")} aria-label={t("couponLabel")} className={`${inputClass} h-11 uppercase tracking-wider`} />
      <Button type="submit" variant="secondary" className="min-h-11 shrink-0 px-5">{t("apply")}</Button>
    </form>
  );
}

export function Totals({ showShipping = true }: { showShipping?: boolean }) {
  const t = useTranslations("cart");
  const loc = useLocale() as Loc;
  const { pricing, pricingLoading } = useCart();
  const row = "flex items-baseline justify-between gap-4 text-sm";
  return (
    <dl className={pricingLoading ? "space-y-3 opacity-60 transition-opacity" : "space-y-3 transition-opacity"} aria-busy={pricingLoading}>
      <div className={row}><dt className="text-muted">{t("subtotal")}</dt><dd>{pricing ? formatMoney(pricing.subtotalMinor, loc) : "—"}</dd></div>
      {pricing && pricing.discountMinor > 0 && (
        <div className={row}><dt className="text-muted">{t("discount")}</dt><dd className="text-sage-700 dark:text-sage-500">− {formatMoney(pricing.discountMinor, loc)}</dd></div>
      )}
      {showShipping && (
        <div className={row}>
          <dt className="text-muted">{t("shipping")}</dt>
          <dd>{pricing?.shippingMinor == null ? <span className="text-muted">{t("shippingAtCheckout")}</span> : pricing.shippingMinor === 0 ? t("free") : formatMoney(pricing.shippingMinor, loc)}</dd>
        </div>
      )}
      <div className="flex items-baseline justify-between gap-4 border-t border-line pt-4">
        <dt className="text-sm uppercase tracking-[0.18em]">{t("total")}</dt>
        <dd className="font-display text-2xl text-brand">{pricing ? formatMoney(pricing.totalMinor, loc) : "—"}</dd>
      </div>
    </dl>
  );
}

/** A real link when checkout is possible; a genuinely disabled button otherwise (an aria-disabled link stays keyboard-activatable). */
export function CheckoutButton({ blocked, className }: { blocked: boolean; className?: string }) {
  const t = useTranslations("cart");
  if (blocked) return <button type="button" disabled className={buttonClasses("primary", `${className ?? ""} cursor-not-allowed opacity-50`)}>{t("checkout")}</button>;
  return <Link href="/checkout" className={buttonClasses("primary", className)}>{t("checkout")}</Link>;
}
