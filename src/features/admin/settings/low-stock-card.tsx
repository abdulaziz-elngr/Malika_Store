"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { Card, CardHeader } from "@/components/admin/primitives";
import { Button } from "@/components/ui/button";
import { Field, FormError, inputClass } from "@/components/ui/field";
import { saveLowStockAction } from "@/server/actions/admin-system";
import type { ActionState } from "@/server/actions/types";

export function LowStockCard({ threshold, readOnly }: { threshold: string; readOnly: boolean }) {
  const t = useTranslations("admin.settings");
  const f = useTranslations("admin.form");
  const [state, formAction, pending] = useActionState(saveLowStockAction, {} as ActionState);

  return (
    <Card>
      <CardHeader title={t("lowStockTitle")} />
      <form action={formAction} className="space-y-5 p-5" noValidate aria-busy={pending}>
        <FormError error={state.errors?.form} />
        <Field label={t("threshold")} hint={t("thresholdHint")} error={state.errors?.threshold} className="max-w-xs">
          {(p) => <input {...p} name="threshold" dir="ltr" inputMode="numeric" defaultValue={threshold} disabled={readOnly} required className={inputClass} />}
        </Field>

        <p role="status" aria-live="polite" className="text-sm text-sage-700 dark:text-sage-200">
          {state.ok ? f("saved") : ""}
        </p>

        {!readOnly && (
          <div className="flex justify-end gap-3 border-t border-line pt-5">
            <Button type="submit" disabled={pending} aria-busy={pending} className="min-h-11 px-6">
              {pending ? f("saving") : f("save")}
            </Button>
          </div>
        )}
      </form>
    </Card>
  );
}
