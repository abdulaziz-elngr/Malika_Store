"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { Card, CardHeader } from "@/components/admin/primitives";
import { Button } from "@/components/ui/button";
import { Field, FormError, inputClass } from "@/components/ui/field";
import { saveSeoAction } from "@/server/actions/admin-system";
import type { ActionState } from "@/server/actions/types";
import type { SeoSettings } from "@/server/services/settings";

const SOCIALS = ["instagram", "tiktok", "facebook", "x"] as const;

/** Global search appearance + social links, with a live snippet preview. */
export function SeoForm({ seo }: { seo: SeoSettings }) {
  const t = useTranslations("admin.seo");
  const f = useTranslations("admin.form");
  const [state, action, pending] = useActionState(saveSeoAction, {} as ActionState);

  const [titleAr, setTitleAr] = useState(seo.titleAr);
  const [titleEn, setTitleEn] = useState(seo.titleEn);
  const [descAr, setDescAr] = useState(seo.descriptionAr);
  const [descEn, setDescEn] = useState(seo.descriptionEn);
  const [lang, setLang] = useState<"ar" | "en">("en");

  const title = lang === "ar" ? titleAr : titleEn;
  const desc = lang === "ar" ? descAr : descEn;

  return (
    <form action={action} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]" noValidate aria-busy={pending}>
      <div className="space-y-6">
        <FormError error={state.errors?.form} />

        <Card>
          <CardHeader title={t("titlesTitle")} />
          <div className="space-y-5 p-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label={t("titleAr")} hint={t("titleHint")} error={state.errors?.titleAr}>
                {(p) => <input {...p} name="titleAr" value={titleAr} onChange={(e) => setTitleAr(e.target.value)} maxLength={70} required className={inputClass} />}
              </Field>
              <Field label={t("titleEn")} hint={t("titleHint")} error={state.errors?.titleEn}>
                {(p) => <input {...p} name="titleEn" dir="ltr" value={titleEn} onChange={(e) => setTitleEn(e.target.value)} maxLength={70} required className={inputClass} />}
              </Field>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label={t("descAr")} error={state.errors?.descriptionAr}>
                {(p) => <textarea {...p} name="descriptionAr" value={descAr} onChange={(e) => setDescAr(e.target.value)} maxLength={200} rows={3} className={`${inputClass} h-auto py-3`} />}
              </Field>
              <Field label={t("descEn")} error={state.errors?.descriptionEn}>
                {(p) => <textarea {...p} name="descriptionEn" dir="ltr" value={descEn} onChange={(e) => setDescEn(e.target.value)} maxLength={200} rows={3} className={`${inputClass} h-auto py-3`} />}
              </Field>
            </div>
            <Field label={t("ogImage")} hint={t("ogImageHint")} error={state.errors?.ogImage}>
              {(p) => <input {...p} name="ogImage" dir="ltr" defaultValue={seo.ogImage} maxLength={500} placeholder="/uploads/…" className={inputClass} />}
            </Field>
            <label className="flex items-center gap-3 text-sm">
              <input type="checkbox" name="robots" value="true" defaultChecked={seo.robots} className="size-4 accent-[var(--color-brand,#67251b)]" />
              <span>{t("robots")}</span>
              <span className="text-xs text-muted">{t("robotsHint")}</span>
              <input type="hidden" name="robots" value="false" />
            </label>
          </div>
        </Card>

        <Card>
          <CardHeader title={t("socialTitle")} />
          <div className="grid gap-5 p-5 sm:grid-cols-2">
            {SOCIALS.map((key) => (
              <Field key={key} label={t(`social.${key}` as "social.instagram")} error={state.errors?.[key]}>
                {(p) => <input {...p} name={key} dir="ltr" defaultValue={seo.social[key]} maxLength={200} placeholder="https://…" className={inputClass} />}
              </Field>
            ))}
          </div>
        </Card>

        <p role="status" aria-live="polite" className="text-sm text-sage-700 dark:text-sage-200">
          {state.ok ? f("saved") : ""}
        </p>
        <div className="flex justify-end">
          <Button type="submit" disabled={pending} aria-busy={pending} className="min-h-11 px-8">
            {pending ? f("saving") : f("save")}
          </Button>
        </div>
      </div>

      <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
        <Card>
          <CardHeader
            title={t("previewTitle")}
            action={
              <div className="flex gap-1">
                {(["ar", "en"] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLang(l)}
                    aria-pressed={lang === l}
                    className={`border px-2.5 py-1 text-xs uppercase ${lang === l ? "border-brand bg-brand text-brand-contrast" : "border-line text-muted"}`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            }
          />
          <div className="space-y-3 p-5" dir={lang === "ar" ? "rtl" : "ltr"}>
            <p className="text-xs text-muted" dir="ltr">
              malika.example
            </p>
            <p className="text-lg text-brand">{title || t("previewEmptyTitle")}</p>
            <p className="line-clamp-3 text-sm text-muted">{desc || t("previewEmptyDesc")}</p>
            <p className="text-xs text-muted">{t("previewHint")}</p>
          </div>
        </Card>
        <Card>
          <CardHeader title={t("statusTitle")} />
          <div className="space-y-2 p-5 text-sm">
            <p>
              <span className="text-muted">{t("indexLabel")}</span>{" "}
              <span className={seo.robots ? "text-sage-700 dark:text-sage-200" : "text-brand"}>{seo.robots ? t("indexed") : t("blocked")}</span>
            </p>
            <p className="text-xs text-muted">{seo.robots ? t("indexedHint") : t("blockedHint")}</p>
          </div>
        </Card>
      </aside>
    </form>
  );
}
