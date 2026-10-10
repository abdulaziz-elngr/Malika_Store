"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormError, inputClass } from "@/components/ui/field";
import { useRouter } from "@/i18n/navigation";
import { savePageAction } from "@/server/actions/admin-content";
import type { ActionState } from "@/server/actions/types";
import type { PageDTO } from "./types";

/** Create/edit one CMS page on its own route (new / [id]). */
export function PageForm({ row }: { row: PageDTO | null }) {
  const t = useTranslations("admin.pages");
  const f = useTranslations("admin.form");
  const router = useRouter();
  const [state, action, pending] = useActionState(savePageAction, {} as ActionState);

  useEffect(() => {
    if (!state.ok) return;
    if (row) router.refresh();
    else if (state.id) router.push(`/admin/pages/${state.id}`);
    else router.push("/admin/pages");
  }, [state, row, router]);

  return (
    <form action={action} className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]" noValidate aria-busy={pending}>
      <div className="space-y-5 border border-line bg-surface p-5">
        <input type="hidden" name="id" value={row?.id ?? ""} />
        <FormError error={state.errors?.form} />

        <Field label={t("slug")} hint={t("slugHint")} error={state.errors?.slug}>
          {(p) => <input {...p} name="slug" dir="ltr" defaultValue={row?.slug ?? ""} maxLength={80} placeholder="about-us" required className={inputClass} />}
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={t("fields.titleAr")} error={state.errors?.titleAr}>
            {(p) => <input {...p} name="titleAr" defaultValue={row?.titleAr ?? ""} maxLength={120} required className={inputClass} />}
          </Field>
          <Field label={t("fields.titleEn")} error={state.errors?.titleEn}>
            {(p) => <input {...p} name="titleEn" dir="ltr" defaultValue={row?.titleEn ?? ""} maxLength={120} required className={inputClass} />}
          </Field>
        </div>

        <div className="grid gap-5">
          <Field label={t("fields.bodyAr")} hint={t("fields.bodyHint")} error={state.errors?.bodyAr}>
            {(p) => <textarea {...p} name="bodyAr" defaultValue={row?.bodyAr ?? ""} maxLength={60_000} rows={14} className={`${inputClass} min-h-64 h-auto py-3 font-mono text-sm leading-6`} />}
          </Field>
          <Field label={t("fields.bodyEn")} error={state.errors?.bodyEn}>
            {(p) => (
              <textarea {...p} name="bodyEn" dir="ltr" defaultValue={row?.bodyEn ?? ""} maxLength={60_000} rows={14} className={`${inputClass} min-h-64 h-auto py-3 font-mono text-sm leading-6`} />
            )}
          </Field>
        </div>

        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" name="visible" value="true" defaultChecked={row?.visible ?? true} className="size-4 accent-[var(--color-brand,#67251b)]" />
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

        <p role="status" aria-live="polite" className="text-sm text-sage-700 dark:text-sage-200">
          {state.ok ? f("saved") : ""}
        </p>
        <div className="flex gap-3 border-t border-line pt-5">
          <Button type="button" variant="secondary" onClick={() => router.push("/admin/pages")} className="min-h-11 flex-1 px-4">
            {f("back")}
          </Button>
          <Button type="submit" disabled={pending} aria-busy={pending} className="min-h-11 flex-1 px-4">
            {pending ? f("saving") : f("save")}
          </Button>
        </div>
      </div>

      <aside className="space-y-4 border border-line bg-surface p-5 text-sm text-muted">
        <p className="text-xs uppercase tracking-[0.2em] text-accent">{t("asideTitle")}</p>
        <p>{t("asideBody")}</p>
        <p dir="ltr" className="break-all font-mono text-xs">
          /{row?.slug || "…"}
        </p>
      </aside>
    </form>
  );
}
