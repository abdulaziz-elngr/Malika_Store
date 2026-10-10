"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Field, FormError, inputClass } from "@/components/ui/field";
import { saveCategoryAction } from "@/server/actions/admin-catalog";
import type { ActionState } from "@/server/actions/types";
import type { CategoryRow } from "./types";

const TONES = ["wine", "copper", "cream", "sage"] as const;

/** Create/edit one category inside a Drawer. `onDone` closes the drawer and refreshes the list. */
export function CategoryForm({ row, parents, onDone, onCancel }: { row: CategoryRow | null; parents: CategoryRow[]; onDone: () => void; onCancel: () => void }) {
  const t = useTranslations("admin.categories");
  const f = useTranslations("admin.form");
  const router = useRouter();
  const [state, action, pending] = useActionState(saveCategoryAction, {} as ActionState);

  useEffect(() => {
    if (state.ok) {
      onDone();
      router.refresh();
    }
  }, [state, onDone, router]);

  return (
    <form action={action} className="space-y-5 p-5" noValidate aria-busy={pending}>
      <input type="hidden" name="id" value={row?.id ?? ""} />
      <FormError error={state.errors?.form} />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={f("nameAr")} error={state.errors?.nameAr}>
          {(p) => <input {...p} name="nameAr" defaultValue={row?.nameAr} maxLength={80} required className={inputClass} />}
        </Field>
        <Field label={f("nameEn")} error={state.errors?.nameEn}>
          {(p) => <input {...p} name="nameEn" dir="ltr" defaultValue={row?.nameEn} maxLength={80} required className={inputClass} />}
        </Field>
      </div>

      <Field label={t("slug")} hint={t("slugHint")} error={state.errors?.slug}>
        {(p) => <input {...p} name="slug" dir="ltr" defaultValue={row?.slug} maxLength={80} placeholder="dresses" className={inputClass} />}
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={f("descriptionAr")} error={state.errors?.descriptionAr}>
          {(p) => <textarea {...p} name="descriptionAr" defaultValue={row?.descriptionAr ?? ""} maxLength={400} rows={3} className={`${inputClass} h-auto py-3`} />}
        </Field>
        <Field label={f("descriptionEn")} error={state.errors?.descriptionEn}>
          {(p) => <textarea {...p} name="descriptionEn" dir="ltr" defaultValue={row?.descriptionEn ?? ""} maxLength={400} rows={3} className={`${inputClass} h-auto py-3`} />}
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={f("tone")} error={state.errors?.tone}>
          {(p) => (
            <select {...p} name="tone" defaultValue={row?.tone ?? "wine"} className={inputClass}>
              {TONES.map((tone) => (
                <option key={tone} value={tone}>
                  {t(`tones.${tone}` as never)}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label={t("parent")} error={state.errors?.parentId}>
          {(p) => (
            <select {...p} name="parentId" defaultValue={row?.parentId ?? ""} className={inputClass}>
              <option value="">{t("noParent")}</option>
              {parents
                .filter((c) => c.id !== row?.id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nameEn}
                  </option>
                ))}
            </select>
          )}
        </Field>
      </div>

      <Field label={f("image")} hint={f("imageHint")} error={state.errors?.imageUrl}>
        {(p) => <input {...p} name="imageUrl" dir="ltr" defaultValue={row?.imageUrl ?? ""} maxLength={500} placeholder="/uploads/…" className={inputClass} />}
      </Field>

      <label className="flex items-center gap-3 text-sm">
        <input type="checkbox" name="visible" defaultChecked={row?.visible ?? true} value="true" className="size-4 accent-[var(--color-brand,#67251b)]" />
        <span>{f("visible")}</span>
        <input type="hidden" name="visible" value="false" />
      </label>

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

      <p role="status" className="text-sm text-sage-700 dark:text-sage-200" aria-live="polite">
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
