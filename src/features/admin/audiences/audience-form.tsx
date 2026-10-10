"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Field, FormError, inputClass } from "@/components/ui/field";
import { saveAudienceAction } from "@/server/actions/admin-audiences";
import type { ActionState } from "@/server/actions/types";
import type { AudienceRow } from "./types";

/** Create/edit one audience (Women, Men, Kids…) inside a Drawer. */
export function AudienceForm({ row, onDone, onCancel }: { row: AudienceRow | null; onDone: () => void; onCancel: () => void }) {
  const t = useTranslations("admin.audiences");
  const f = useTranslations("admin.form");
  const router = useRouter();
  const [state, action, pending] = useActionState(saveAudienceAction, {} as ActionState);

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
          {(p) => <input {...p} name="nameAr" defaultValue={row?.nameAr} maxLength={60} required className={inputClass} />}
        </Field>
        <Field label={f("nameEn")} error={state.errors?.nameEn}>
          {(p) => <input {...p} name="nameEn" dir="ltr" defaultValue={row?.nameEn} maxLength={60} required className={inputClass} />}
        </Field>
      </div>

      <Field label={t("slug")} hint={row ? t("slugLocked") : t("slugHint")} error={state.errors?.slug}>
        {(p) => <input {...p} name="slug" dir="ltr" defaultValue={row?.slug} maxLength={40} placeholder="kids" disabled={!!row} className={inputClass} />}
      </Field>

      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="includeUnisex" defaultChecked={row?.includeUnisex ?? false} value="true" className="mt-1 size-4 accent-[var(--color-brand,#67251b)]" />
        <span>
          {t("includeUnisex")}
          <span className="block text-xs text-muted">{t("includeUnisexHint")}</span>
        </span>
        <input type="hidden" name="includeUnisex" value="false" />
      </label>

      <label className="flex items-center gap-3 text-sm">
        <input type="checkbox" name="visible" defaultChecked={row?.visible ?? true} value="true" className="size-4 accent-[var(--color-brand,#67251b)]" />
        <span>{f("visible")}</span>
        <input type="hidden" name="visible" value="false" />
      </label>

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
