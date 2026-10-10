"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Field, FormError, inputClass } from "@/components/ui/field";
import { useRouter } from "@/i18n/navigation";
import { saveCouponAction } from "@/server/actions/admin-sales";
import type { ActionState } from "@/server/actions/types";
import type { CouponRow, RestrictionOption, RestrictionOptions } from "./types";

/** DB timestamps are Date objects; datetime-local wants "YYYY-MM-DDTHH:mm". */
const toInputValue = (d: Date | null) => {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

type Props = {
  coupon: CouponRow | null;
  options: RestrictionOptions;
};

/** Create/edit a coupon on its own page: value unit follows the type, restrictions are searchable checklists. */
export function CouponForm({ coupon, options }: Props) {
  const t = useTranslations("admin.coupon");
  const f = useTranslations("admin.form");
  const router = useRouter();
  const [state, action, pending] = useActionState(saveCouponAction, {} as ActionState);

  const [type, setType] = useState<"percent" | "fixed">(coupon?.type ?? "percent");
  const [productIds, setProductIds] = useState<string[]>(coupon?.productIds ?? []);
  const [categoryIds, setCategoryIds] = useState<string[]>(coupon?.categoryIds ?? []);
  const [collectionIds, setCollectionIds] = useState<string[]>(coupon?.collectionIds ?? []);

  // The coupon prop is re-deserialised on every refresh, so remember the state we already reacted to.
  const handled = useRef<ActionState | null>(null);
  useEffect(() => {
    if (!state.ok || handled.current === state) return;
    handled.current = state;
    if (coupon) router.refresh();
    else if (state.id) router.push(`/admin/coupons/${state.id}`);
    else router.push("/admin/coupons");
  }, [state, coupon, router]);

  const money = (minor: number | null) => (minor != null ? String(minor / 100) : "");

  return (
    <form action={action} className="space-y-6" noValidate aria-busy={pending}>
      <input type="hidden" name="id" value={coupon?.id ?? ""} />
      <input type="hidden" name="productIds" value={JSON.stringify(productIds)} />
      <input type="hidden" name="categoryIds" value={JSON.stringify(categoryIds)} />
      <input type="hidden" name="collectionIds" value={JSON.stringify(collectionIds)} />
      <FormError error={state.errors?.form} />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t("code")} hint={t("codeHint")} error={state.errors?.code}>
          {(p) => <input {...p} name="code" dir="ltr" defaultValue={coupon?.code ?? ""} maxLength={30} required placeholder="WELCOME10" className={inputClass} />}
        </Field>
        <Field label={t("type")} error={state.errors?.type}>
          {(p) => (
            <select {...p} name="type" value={type} onChange={(e) => setType(e.target.value === "fixed" ? "fixed" : "percent")} className={inputClass}>
              <option value="percent">{t("types.percent")}</option>
              <option value="fixed">{t("types.fixed")}</option>
            </select>
          )}
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={type === "percent" ? t("valuePercent") : t("valueFixed")} error={state.errors?.value}>
          {(p) => (
            <span className="flex">
              <input
                {...p}
                name="value"
                type="number"
                min={1}
                max={type === "percent" ? 100 : undefined}
                step={1}
                required
                defaultValue={coupon ? (coupon.type === "fixed" ? String(coupon.value / 100) : String(coupon.value)) : ""}
                className={inputClass}
              />
              <span aria-hidden className="grid shrink-0 place-items-center border border-s-0 border-line px-3 text-sm text-muted">
                {type === "percent" ? "%" : t("egp")}
              </span>
            </span>
          )}
        </Field>
        <div className="space-y-2">
          <p className="text-[0.72rem] font-medium uppercase tracking-[0.2em] text-accent">{f("status")}</p>
          <label className="flex h-12 items-center gap-3 border border-line px-4 text-sm">
            <input type="checkbox" name="active" defaultChecked={coupon?.active ?? true} value="true" className="size-4 accent-[var(--color-brand,#67251b)]" />
            <span>{t("active")}</span>
            <input type="hidden" name="active" value="false" />
          </label>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={f("descriptionAr")} error={state.errors?.descriptionAr}>
          {(p) => <textarea {...p} name="descriptionAr" defaultValue={coupon?.descriptionAr ?? ""} maxLength={300} rows={2} className={`${inputClass} h-auto py-3`} />}
        </Field>
        <Field label={f("descriptionEn")} error={state.errors?.descriptionEn}>
          {(p) => <textarea {...p} name="descriptionEn" dir="ltr" defaultValue={coupon?.descriptionEn ?? ""} maxLength={300} rows={2} className={`${inputClass} h-auto py-3`} />}
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t("minOrder")} hint={t("minOrderHint")} error={state.errors?.minOrderMinor}>
          {(p) => <input {...p} name="minOrderMinor" type="number" min={1} step={1} defaultValue={money(coupon?.minOrderMinor ?? null)} className={inputClass} />}
        </Field>
        <Field label={t("maxDiscount")} hint={t("maxDiscountHint")} error={state.errors?.maxDiscountMinor}>
          {(p) => <input {...p} name="maxDiscountMinor" type="number" min={1} step={1} defaultValue={money(coupon?.maxDiscountMinor ?? null)} className={inputClass} />}
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t("startsAt")} error={state.errors?.startsAt}>
          {(p) => <input {...p} type="datetime-local" name="startsAt" defaultValue={toInputValue(coupon?.startsAt ?? null)} className={inputClass} />}
        </Field>
        <Field label={t("expiresAt")} error={state.errors?.expiresAt}>
          {(p) => <input {...p} type="datetime-local" name="expiresAt" defaultValue={toInputValue(coupon?.expiresAt ?? null)} className={inputClass} />}
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t("usageLimit")} hint={t("usageLimitHint")} error={state.errors?.usageLimit}>
          {(p) => <input {...p} name="usageLimit" type="number" min={1} step={1} defaultValue={coupon?.usageLimit ?? ""} className={inputClass} />}
        </Field>
        <Field label={t("perCustomerLimit")} hint={t("perCustomerLimitHint")} error={state.errors?.perCustomerLimit}>
          {(p) => <input {...p} name="perCustomerLimit" type="number" min={1} step={1} defaultValue={coupon?.perCustomerLimit ?? ""} className={inputClass} />}
        </Field>
      </div>

      <section className="space-y-4 border-t border-line pt-5">
        <div className="space-y-1">
          <h3 className="text-[0.72rem] font-medium uppercase tracking-[0.2em] text-accent">{t("restrictions")}</h3>
          <p className="max-w-3xl text-sm text-muted">{t("restrictionsHint")}</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <RestrictionPicker legend={t("products")} options={options.products} selected={productIds} onChange={setProductIds} />
          <RestrictionPicker legend={t("categories")} options={options.categories} selected={categoryIds} onChange={setCategoryIds} />
          <RestrictionPicker legend={t("collections")} options={options.collections} selected={collectionIds} onChange={setCollectionIds} />
        </div>
      </section>

      <p role="status" aria-live="polite" className="text-sm text-sage-700 dark:text-sage-200">
        {state.ok ? f("saved") : ""}
      </p>
      <div className="flex justify-end gap-3 border-t border-line pt-5">
        <Button type="button" variant="secondary" onClick={() => router.push("/admin/coupons")} className="min-h-11 px-6">
          {f("back")}
        </Button>
        <Button type="submit" disabled={pending} aria-busy={pending} className="min-h-11 px-6">
          {pending ? f("saving") : f("save")}
        </Button>
      </div>
    </form>
  );
}

/** One searchable checklist feeding a JSON-array hidden input (productIds / categoryIds / collectionIds). */
function RestrictionPicker({ legend, options, selected, onChange }: { legend: string; options: RestrictionOption[]; selected: string[]; onChange: (ids: string[]) => void }) {
  const t = useTranslations("admin.coupon");
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const list = needle ? options.filter((o) => o.label.toLowerCase().includes(needle)) : options;
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  return (
    <div className="border border-line">
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2.5">
        <p className="text-[0.72rem] font-medium uppercase tracking-[0.18em] text-accent">{legend}</p>
        <span className="text-xs text-muted">{t("selectedCount", { count: selected.length })}</span>
      </div>
      <div className="space-y-2 p-3">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("filterPlaceholder")}
          aria-label={`${legend} — ${t("filterPlaceholder")}`}
          className={`${inputClass} h-10 text-sm`}
        />
        <ul className="max-h-56 divide-y divide-line overflow-y-auto border border-line">
          {list.map((o) => (
            <li key={o.id}>
              <label className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm hover:bg-brand/5">
                <input type="checkbox" checked={selected.includes(o.id)} onChange={() => toggle(o.id)} className="size-4 shrink-0 accent-[var(--color-brand,#67251b)]" />
                <span className="truncate">{o.label}</span>
              </label>
            </li>
          ))}
          {list.length === 0 ? <li className="px-3 py-2 text-sm text-muted">{t("noMatches")}</li> : null}
        </ul>
      </div>
    </div>
  );
}
