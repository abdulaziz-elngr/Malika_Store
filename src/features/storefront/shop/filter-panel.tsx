"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/cn";
import { pick, type Loc } from "@/lib/localize";

export type FacetData = {
  categories: { slug: string; nameAr: string; nameEn: string }[];
  collections: { slug: string; nameAr: string; nameEn: string }[];
  sizes: string[];
  colors: { nameAr: string; nameEn: string; hex: string }[];
  priceMin: number;
  priceMax: number;
};

type Props = { facets: FacetData; hide?: ("collection" | "gender")[]; total: number };

const group = "border-b border-line py-5";
const legend = "mb-3 text-[0.72rem] font-medium uppercase tracking-[0.22em] text-accent";

export function FilterPanel({ facets, hide = [], total }: Props) {
  const t = useTranslations("filters");
  const s = useTranslations("shop");
  const sort = useTranslations("sort");
  const loc = useLocale() as Loc;
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState({ min: params.get("min") ?? "", max: params.get("max") ?? "" });

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const push = (next: URLSearchParams) => {
    next.delete("page");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };
  const values = (key: string) => (params.get(key) ?? "").split(",").filter(Boolean);
  const toggle = (key: string, v: string) => {
    const next = new URLSearchParams(params.toString());
    const cur = values(key);
    const upd = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
    if (upd.length) next.set(key, upd.join(","));
    else next.delete(key);
    push(next);
  };
  const setOne = (key: string, v: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (v) next.set(key, v);
    else next.delete(key);
    push(next);
  };
  const applyPrice = () => {
    const next = new URLSearchParams(params.toString());
    if (price.min) next.set("min", price.min);
    else next.delete("min");
    if (price.max) next.set("max", price.max);
    else next.delete("max");
    push(next);
  };
  const clearAll = () => {
    const keep = new URLSearchParams();
    const q = params.get("q");
    if (q) keep.set("q", q);
    setPrice({ min: "", max: "" });
    push(keep);
  };
  const active = ["category", "collection", "size", "color", "gender", "min", "max", "stock", "sale"].some((k) => params.get(k));

  const check = (key: string, v: string, label: React.ReactNode) => {
    const on = values(key).includes(v);
    return (
      <label key={v} className="flex min-h-9 cursor-pointer items-center gap-3 text-sm">
        <input type="checkbox" checked={on} onChange={() => toggle(key, v)} className="size-4 accent-[var(--brand)]" />
        <span className={cn(on ? "text-foreground" : "text-muted")}>{label}</span>
      </label>
    );
  };

  const panel = (
    <div>
      {!hide.includes("gender") && (
        <fieldset className={group}>
          <legend className={legend}>{t("gender")}</legend>
          {(["women", "men", "unisex"] as const).map((g) => (
            <label key={g} className="flex min-h-9 cursor-pointer items-center gap-3 text-sm">
              <input type="radio" name="gender" checked={params.get("gender") === g} onChange={() => setOne("gender", g)} className="size-4 accent-[var(--brand)]" />
              <span>{t(g)}</span>
            </label>
          ))}
        </fieldset>
      )}
      <fieldset className={group}>
        <legend className={legend}>{t("category")}</legend>
        {facets.categories.map((c) => check("category", c.slug, pick(loc, c.nameAr, c.nameEn)))}
      </fieldset>
      {!hide.includes("collection") && (
        <fieldset className={group}>
          <legend className={legend}>{t("collection")}</legend>
          {facets.collections.map((c) => check("collection", c.slug, pick(loc, c.nameAr, c.nameEn)))}
        </fieldset>
      )}
      <fieldset className={group}>
        <legend className={legend}>{t("size")}</legend>
        <div className="flex flex-wrap gap-2">
          {facets.sizes.map((sz) => {
            const on = values("size").includes(sz);
            return (
              <button key={sz} type="button" aria-pressed={on} onClick={() => toggle("size", sz)} className={cn("min-h-10 min-w-11 border px-3 text-sm transition-colors", on ? "border-brand bg-brand text-brand-contrast" : "border-line hover:border-accent")}>
                {sz}
              </button>
            );
          })}
        </div>
      </fieldset>
      <fieldset className={group}>
        <legend className={legend}>{t("color")}</legend>
        <div className="flex flex-wrap gap-3">
          {facets.colors.map((c) => {
            const on = values("color").includes(c.nameEn);
            return (
              <button key={c.nameEn} type="button" aria-pressed={on} aria-label={pick(loc, c.nameAr, c.nameEn)} title={pick(loc, c.nameAr, c.nameEn)} onClick={() => toggle("color", c.nameEn)} className={cn("size-8 rounded-full border-2 transition-shadow", on ? "border-brand ring-2 ring-accent ring-offset-2 ring-offset-background" : "border-line")} style={{ background: c.hex }} />
            );
          })}
        </div>
      </fieldset>
      <fieldset className={group}>
        <legend className={legend}>{t("price")}</legend>
        <div className="flex items-center gap-2" dir="ltr">
          <input inputMode="numeric" aria-label={t("from")} placeholder={`${facets.priceMin}`} value={price.min} onChange={(e) => setPrice((p) => ({ ...p, min: e.target.value.replace(/\D/g, "") }))} onBlur={applyPrice} onKeyDown={(e) => e.key === "Enter" && applyPrice()} className="h-11 w-full border border-line bg-surface px-3 text-sm" />
          <span aria-hidden>–</span>
          <input inputMode="numeric" aria-label={t("to")} placeholder={`${facets.priceMax}`} value={price.max} onChange={(e) => setPrice((p) => ({ ...p, max: e.target.value.replace(/\D/g, "") }))} onBlur={applyPrice} onKeyDown={(e) => e.key === "Enter" && applyPrice()} className="h-11 w-full border border-line bg-surface px-3 text-sm" />
        </div>
      </fieldset>
      <fieldset className={group}>
        <legend className={legend}>{t("availability")}</legend>
        <label className="flex min-h-9 cursor-pointer items-center gap-3 text-sm">
          <input type="checkbox" checked={params.get("stock") === "in"} onChange={(e) => setOne("stock", e.target.checked ? "in" : null)} className="size-4 accent-[var(--brand)]" />
          {t("inStock")}
        </label>
      </fieldset>
      <fieldset className={group}>
        <legend className={legend}>{t("discount")}</legend>
        <label className="flex min-h-9 cursor-pointer items-center gap-3 text-sm">
          <input type="checkbox" checked={params.get("sale") === "1"} onChange={(e) => setOne("sale", e.target.checked ? "1" : null)} className="size-4 accent-[var(--brand)]" />
          {t("onSale")}
        </label>
      </fieldset>
      {active && (
        <button type="button" onClick={clearAll} className="mt-5 text-sm underline underline-offset-4 hover:text-accent">{s("clear")}</button>
      )}
    </div>
  );

  return (
    <>
      <div className="flex items-center justify-between gap-4 border-y border-line py-4 lg:col-span-2">
        <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-10 items-center gap-2 text-sm uppercase tracking-[0.18em] lg:hidden" aria-expanded={open}>
          <SlidersHorizontal size={17} strokeWidth={1.5} /> {s("showFilters")}
        </button>
        <p className="hidden text-sm text-muted lg:block">{s("count", { count: total })}</p>
        <p className="text-sm text-muted lg:hidden">{s("count", { count: total })}</p>
        <label className="flex items-center gap-3 text-sm">
          <span className="hidden text-muted sm:inline">{sort("label")}</span>
          <select value={params.get("sort") ?? "featured"} onChange={(e) => setOne("sort", e.target.value === "featured" ? null : e.target.value)} className="h-10 border border-line bg-surface px-3 text-sm">
            {(["featured", "newest", "best", "price_asc", "price_desc"] as const).map((k) => (
              <option key={k} value={k}>{sort(k)}</option>
            ))}
          </select>
        </label>
      </div>

      <aside className="hidden lg:block lg:w-64 lg:shrink-0" aria-label={s("filters")}>{panel}</aside>

      {open && (
        <div role="dialog" aria-modal="true" aria-label={s("filters")} className="fixed inset-0 z-50 flex flex-col bg-background lg:hidden">
          <div className="flex h-16 items-center justify-between border-b border-line px-5">
            <span className="font-display text-2xl text-brand">{s("filters")}</span>
            <button type="button" onClick={() => setOpen(false)} aria-label={s("hideFilters")} className="grid size-10 place-items-center"><X size={22} strokeWidth={1.4} /></button>
          </div>
          <div className="flex-1 overflow-y-auto px-5">{panel}</div>
          <div className="border-t border-line p-4">
            <button type="button" onClick={() => setOpen(false)} className="min-h-12 w-full bg-brand text-sm uppercase tracking-[0.18em] text-brand-contrast">{s("count", { count: total })}</button>
          </div>
        </div>
      )}
    </>
  );
}
