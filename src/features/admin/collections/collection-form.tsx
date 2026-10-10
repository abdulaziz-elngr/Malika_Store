"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormError, inputClass } from "@/components/ui/field";
import { useRouter } from "@/i18n/navigation";
import { saveCollectionAction } from "@/server/actions/admin-catalog";
import type { ActionState } from "@/server/actions/types";
import type { CollectionRow } from "../catalog/types";

const TONES = ["wine", "copper", "cream", "sage"] as const;

type ProductOption = { id: string; nameEn: string; nameAr: string; sku: string };
type Row = CollectionRow & { productIds: string[] };

const localInput = (d: Date | null) => (d ? new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16) : "");

/** Create/edit one collection, including its product assignment (searchable checklist). */
export function CollectionForm({ row, products, onDone, onCancel }: { row: Row | null; products: ProductOption[]; onDone: () => void; onCancel: () => void }) {
  const t = useTranslations("admin.collections");
  const f = useTranslations("admin.form");
  const router = useRouter();
  const [state, action, pending] = useActionState(saveCollectionAction, {} as ActionState);
  const [selected, setSelected] = useState<string[]>(() => row?.productIds ?? []);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (state.ok) {
      onDone();
      router.refresh();
    }
  }, [state, onDone, router]);

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.nameEn.toLowerCase().includes(q) || p.nameAr.includes(filter.trim()) || p.sku.toLowerCase().includes(q));
  }, [products, filter]);

  const toggle = (id: string) => setSelected((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  return (
    <form action={action} className="space-y-5 p-5" noValidate aria-busy={pending}>
      <input type="hidden" name="id" value={row?.id ?? ""} />
      <input type="hidden" name="productIds" value={JSON.stringify(selected)} />
      <FormError error={state.errors?.form} />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={f("nameAr")} error={state.errors?.nameAr}>
          {(p) => <input {...p} name="nameAr" defaultValue={row?.nameAr} maxLength={80} required className={inputClass} />}
        </Field>
        <Field label={f("nameEn")} error={state.errors?.nameEn}>
          {(p) => <input {...p} name="nameEn" dir="ltr" defaultValue={row?.nameEn} maxLength={80} required className={inputClass} />}
        </Field>
      </div>

      <Field label={t("slug")} hint={f("optional") + " — " + t("slugHint")} error={state.errors?.slug}>
        {(p) => <input {...p} name="slug" dir="ltr" defaultValue={row?.slug} maxLength={80} className={inputClass} />}
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={f("descriptionAr")} error={state.errors?.descriptionAr}>
          {(p) => <textarea {...p} name="descriptionAr" defaultValue={row?.descriptionAr ?? ""} maxLength={400} rows={3} className={`${inputClass} h-auto py-3`} />}
        </Field>
        <Field label={f("descriptionEn")} error={state.errors?.descriptionEn}>
          {(p) => <textarea {...p} name="descriptionEn" dir="ltr" defaultValue={row?.descriptionEn ?? ""} maxLength={400} rows={3} className={`${inputClass} h-auto py-3`} />}
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <Field label={f("tone")} error={state.errors?.tone}>
          {(p) => (
            <select {...p} name="tone" defaultValue={row?.tone ?? "wine"} className={inputClass}>
              {TONES.map((tone) => (
                <option key={tone} value={tone}>
                  {t(`tones.${tone}` as "tones.wine")}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label={t("startsAt")} error={state.errors?.startsAt}>
          {(p) => <input {...p} name="startsAt" type="datetime-local" defaultValue={localInput(row?.startsAt ?? null)} className={inputClass} />}
        </Field>
        <Field label={t("endsAt")} error={state.errors?.endsAt}>
          {(p) => <input {...p} name="endsAt" type="datetime-local" defaultValue={localInput(row?.endsAt ?? null)} className={inputClass} />}
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t("coverUrl")} error={state.errors?.coverUrl}>
          {(p) => <input {...p} name="coverUrl" dir="ltr" defaultValue={row?.coverUrl ?? ""} maxLength={500} placeholder="/uploads/…" className={inputClass} />}
        </Field>
        <Field label={t("bannerUrl")} error={state.errors?.bannerUrl}>
          {(p) => <input {...p} name="bannerUrl" dir="ltr" defaultValue={row?.bannerUrl ?? ""} maxLength={500} placeholder="/uploads/…" className={inputClass} />}
        </Field>
      </div>

      <label className="flex items-center gap-3 text-sm">
        <input type="checkbox" name="visible" value="true" defaultChecked={row?.visible ?? true} className="size-4 accent-[var(--color-brand,#67251b)]" />
        <span>{f("visible")}</span>
        <input type="hidden" name="visible" value="false" />
      </label>

      <section className="border border-line">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <span className="text-xs uppercase tracking-[0.18em] text-accent">
            {t("products")} <span className="text-muted">({selected.length})</span>
          </span>
          <input type="search" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={t("productsFilter")} maxLength={80} className="h-9 w-40 border border-line bg-surface px-3 text-sm outline-none focus:border-brand" />
        </header>
        <div className="max-h-64 overflow-y-auto p-3">
          {visible.length === 0 ? (
            <p className="p-3 text-sm text-muted">{t("noProducts")}</p>
          ) : (
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {visible.map((p) => (
                <li key={p.id}>
                  <label className="flex cursor-pointer items-center gap-2.5 border border-line px-2.5 py-1.5 text-sm hover:border-accent">
                    <input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggle(p.id)} className="size-4 accent-[var(--color-brand,#67251b)]" />
                    <span className="truncate">{p.nameEn}</span>
                    <span className="ms-auto shrink-0 text-xs text-muted" dir="ltr">
                      {p.sku}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <details className="border border-line">
        <summary className="cursor-pointer border-b border-line px-4 py-3 text-xs uppercase tracking-[0.18em] text-accent">{f("seoSection")}</summary>
        <div className="space-y-5 p-4">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={f("seoTitleAr")} error={state.errors?.seoTitleAr}>
              {(p) => <input {...p} name="seoTitleAr" defaultValue={row?.seoTitleAr ?? ""} maxLength={70} className={inputClass} />}
            </Field>
            <Field label={f("seoTitleEn")} error={state.errors?.seoTitleEn}>
              {(p) => <input {...p} name="seoTitleEn" dir="ltr" defaultValue={row?.seoTitleEn ?? ""} maxLength={70} className={inputClass} />}
            </Field>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={f("seoDescriptionAr")} error={state.errors?.seoDescriptionAr}>
              {(p) => <textarea {...p} name="seoDescriptionAr" defaultValue={row?.seoDescriptionAr ?? ""} maxLength={200} rows={2} className={`${inputClass} h-auto py-3`} />}
            </Field>
            <Field label={f("seoDescriptionEn")} error={state.errors?.seoDescriptionEn}>
              {(p) => <textarea {...p} name="seoDescriptionEn" dir="ltr" defaultValue={row?.seoDescriptionEn ?? ""} maxLength={200} rows={2} className={`${inputClass} h-auto py-3`} />}
            </Field>
          </div>
        </div>
      </details>

      <p role="status" aria-live="polite" className="text-sm text-sage-700 dark:text-sage-200">
        {state.ok ? f("saved") : ""}
      </p>
      <div className="flex justify-end gap-3 border-t border-line pt-5">
        <Button type="button" variant="secondary" onClick={onCancel} className="min-h-11 px-6">
          {f("back")}
        </Button>
        <Button type="submit" disabled={pending} aria-busy={pending} className="min-h-11 px-6">
          {pending ? f("saving") : f("save")}
        </Button>
      </div>
    </form>
  );
}
