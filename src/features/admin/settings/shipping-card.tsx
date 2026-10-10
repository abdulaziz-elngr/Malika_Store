"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { Card, CardHeader } from "@/components/admin/primitives";
import { Button } from "@/components/ui/button";
import { Field, FormError, inputClass } from "@/components/ui/field";
import { saveShippingAction } from "@/server/actions/admin-system";
import type { ActionState } from "@/server/actions/types";

/** All amounts are plain EGP strings — the schema converts to piastres itself. */
export type ShippingDefaults = {
  standard: string;
  freeThreshold: string;
  standardMinDays: string;
  standardMaxDays: string;
};

export function ShippingCard({ defaults, readOnly }: { defaults: ShippingDefaults; readOnly: boolean }) {
  const t = useTranslations("admin.settings");
  const f = useTranslations("admin.form");
  const [state, formAction, pending] = useActionState(saveShippingAction, {} as ActionState);

  return (
    <Card>
      <CardHeader title={t("shippingTitle")} />
      <form action={formAction} className="space-y-5 p-5" noValidate aria-busy={pending}>
        <FormError error={state.errors?.form} />

        <div className="grid items-start gap-5 sm:grid-cols-2">
          <Field label={t("standardFee")} error={state.errors?.standardMinor}>
            {(p) => <input {...p} name="standard" dir="ltr" inputMode="decimal" defaultValue={defaults.standard} placeholder="60" disabled={readOnly} required className={inputClass} />}
          </Field>
          <Field label={t("freeThreshold")} hint={t("freeThresholdHint")} error={state.errors?.freeThresholdMinor}>
            {(p) => <input {...p} name="freeThreshold" dir="ltr" inputMode="decimal" defaultValue={defaults.freeThreshold} placeholder="3000" disabled={readOnly} required className={inputClass} />}
          </Field>
        </div>

        <div className="grid items-start gap-5 sm:grid-cols-2">
          <Field label={t("standardMinDays")} error={state.errors?.standardMinDays}>
            {(p) => <input {...p} name="standardMinDays" dir="ltr" inputMode="numeric" defaultValue={defaults.standardMinDays} disabled={readOnly} required className={inputClass} />}
          </Field>
          <Field label={t("standardMaxDays")} error={state.errors?.standardMaxDays}>
            {(p) => <input {...p} name="standardMaxDays" dir="ltr" inputMode="numeric" defaultValue={defaults.standardMaxDays} disabled={readOnly} required className={inputClass} />}
          </Field>
        </div>

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
