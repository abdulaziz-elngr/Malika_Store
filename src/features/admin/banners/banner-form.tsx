"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormError, inputClass } from "@/components/ui/field";
import { useRouter } from "@/i18n/navigation";
import { saveBannerAction } from "@/server/actions/admin-content";
import type { ActionState } from "@/server/actions/types";
import type { BannerDTO } from "./types";

const POSITIONS = ["home", "promo", "strip", "campaign"] as const;
const TONES = ["wine", "copper", "cream", "sage"] as const;

const localInput = (d: Date | null) => (d ? new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16) : "");

/** Create/edit one banner inside a Drawer. `onDone` closes the drawer and refreshes the list. */
export function BannerForm({ row, onDone, onCancel }: { row: BannerDTO | null; onDone: () => void; onCancel: () => void }) {
  const t = useTranslations("admin.banners");
  const f = useTranslations("admin.form");
  const router = useRouter();
  const [state, action, pending] = useActionState(saveBannerAction, {} as ActionState);

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
        <Field label={t("fields.titleAr")} error={state.errors?.titleAr}>
          {(p) => <input {...p} name="titleAr" defaultValue={row?.titleAr ?? ""} maxLength={120} required className={inputClass} />}
        </Field>
        <Field label={t("fields.titleEn")} error={state.errors?.titleEn}>
          {(p) => <input {...p} name="titleEn" dir="ltr" defaultValue={row?.titleEn ?? ""} maxLength={120} required className={inputClass} />}
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t("fields.bodyAr")} error={state.errors?.bodyAr}>
          {(p) => <textarea {...p} name="bodyAr" defaultValue={row?.bodyAr ?? ""} maxLength={300} rows={3} className={`${inputClass} h-auto py-3`} />}
        </Field>
        <Field label={t("fields.bodyEn")} error={state.errors?.bodyEn}>
          {(p) => <textarea {...p} name="bodyEn" dir="ltr" defaultValue={row?.bodyEn ?? ""} maxLength={300} rows={3} className={`${inputClass} h-auto py-3`} />}
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={f("image")} hint={f("imageHint")} error={state.errors?.imageUrl}>
          {(p) => <input {...p} name="imageUrl" dir="ltr" defaultValue={row?.imageUrl ?? ""} maxLength={500} placeholder="/uploads/…" className={inputClass} />}
        </Field>
        <Field label={t("fields.mobileImage")} hint={f("imageHint")} error={state.errors?.mobileImageUrl}>
          {(p) => <input {...p} name="mobileImageUrl" dir="ltr" defaultValue={row?.mobileImageUrl ?? ""} maxLength={500} placeholder="/uploads/…" className={inputClass} />}
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t("fields.ctaLabelAr")} error={state.errors?.ctaLabelAr}>
          {(p) => <input {...p} name="ctaLabelAr" defaultValue={row?.ctaLabelAr ?? ""} maxLength={60} className={inputClass} />}
        </Field>
        <Field label={t("fields.ctaLabelEn")} error={state.errors?.ctaLabelEn}>
          {(p) => <input {...p} name="ctaLabelEn" dir="ltr" defaultValue={row?.ctaLabelEn ?? ""} maxLength={60} className={inputClass} />}
        </Field>
      </div>

      <Field label={t("fields.href")} hint={t("fields.hrefHint")} error={state.errors?.href}>
        {(p) => <input {...p} name="href" dir="ltr" defaultValue={row?.href ?? ""} maxLength={300} placeholder="/collections/new" className={inputClass} />}
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t("cols.position")} error={state.errors?.position}>
          {(p) => (
            <select {...p} name="position" defaultValue={row?.position ?? "home"} className={inputClass}>
              {POSITIONS.map((pos) => (
                <option key={pos} value={pos}>
                  {t(`positions.${pos}` as "positions.home")}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label={f("tone")} error={state.errors?.tone}>
          {(p) => (
            <select {...p} name="tone" defaultValue={row?.tone ?? "wine"} className={inputClass}>
              {TONES.map((tone) => (
                <option key={tone} value={tone}>
                  {f(`tone${tone.charAt(0).toUpperCase()}${tone.slice(1)}` as "toneWine")}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <Field label={t("startsAt")} error={state.errors?.startsAt}>
          {(p) => <input {...p} name="startsAt" type="datetime-local" defaultValue={localInput(row?.startsAt ?? null)} className={inputClass} />}
        </Field>
        <Field label={t("endsAt")} error={state.errors?.endsAt}>
          {(p) => <input {...p} name="endsAt" type="datetime-local" defaultValue={localInput(row?.endsAt ?? null)} className={inputClass} />}
        </Field>
        <Field label={t("fields.sortOrder")} error={state.errors?.sortOrder}>
          {(p) => <input {...p} name="sortOrder" type="number" min={0} max={9999} defaultValue={row?.sortOrder ?? 0} className={inputClass} />}
        </Field>
      </div>

      <label className="flex items-center gap-3 text-sm">
        <input type="checkbox" name="visible" value="true" defaultChecked={row?.visible ?? true} className="size-4 accent-[var(--color-brand,#67251b)]" />
        <span>{f("visible")}</span>
        <input type="hidden" name="visible" value="false" />
      </label>

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
