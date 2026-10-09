"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormError, inputClass } from "@/components/ui/field";
import { useRouter } from "@/i18n/navigation";
import { updateMediaAction } from "@/server/actions/admin-content";
import type { ActionState } from "@/server/actions/types";
import type { MediaRow } from "./media-manager";

/** Rename / re-folder / add alt text for one media row (inside a Drawer). */
export function MediaEditForm({ row, onDone, onCancel }: { row: MediaRow; onDone: () => void; onCancel: () => void }) {
  const t = useTranslations("admin.media");
  const f = useTranslations("admin.form");
  const router = useRouter();
  const [state, action, pending] = useActionState(updateMediaAction, {} as ActionState);

  useEffect(() => {
    if (state.ok) {
      onDone();
      router.refresh();
    }
  }, [state, onDone, router]);

  return (
    <form action={action} className="space-y-5 p-5" noValidate aria-busy={pending}>
      <input type="hidden" name="id" value={row.id} />
      <FormError error={state.errors?.form} />

      <div className="border border-line bg-brand/5">
        {row.kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element -- admin preview of arbitrary stored URLs
          <img src={row.url} alt="" className="max-h-40 w-full object-contain p-2" />
        ) : (
          <p className="p-4 text-sm text-muted" dir="ltr">
            {row.url}
          </p>
        )}
      </div>

      <Field label={t("name")} error={state.errors?.name}>
        {(p) => <input {...p} name="name" defaultValue={row.name} maxLength={120} required className={inputClass} />}
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t("altAr")} error={state.errors?.altAr}>
          {(p) => <input {...p} name="altAr" defaultValue={row.altAr ?? ""} maxLength={160} className={inputClass} />}
        </Field>
        <Field label={t("altEn")} error={state.errors?.altEn}>
          {(p) => <input {...p} name="altEn" dir="ltr" defaultValue={row.altEn ?? ""} maxLength={160} className={inputClass} />}
        </Field>
      </div>
      <Field label={t("folderLabel")} hint={t("folderHint")} error={state.errors?.folder}>
        {(p) => <input {...p} name="folder" dir="ltr" defaultValue={row.folder} maxLength={60} placeholder="lookbook" className={inputClass} />}
      </Field>

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
