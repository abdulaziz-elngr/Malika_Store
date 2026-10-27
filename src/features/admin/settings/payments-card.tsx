"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { Card, CardHeader } from "@/components/admin/primitives";
import { Button } from "@/components/ui/button";
import { Field, FormError, inputClass } from "@/components/ui/field";
import { savePaymentsAction } from "@/server/actions/admin-system";
import type { ActionState } from "@/server/actions/types";

/** Accounts are one per line; the deposit is a plain EGP string, and depositEnabled is the on/off switch for it. */
export type PaymentsDefaults = { walletAccounts: string; instapayAccounts: string; deposit: string; depositEnabled: boolean };

export function PaymentsCard({ defaults, readOnly }: { defaults: PaymentsDefaults; readOnly: boolean }) {
  const t = useTranslations("admin.settings.payments");
  const f = useTranslations("admin.form");
  const [state, formAction, pending] = useActionState(savePaymentsAction, {} as ActionState);
  const [depositOn, setDepositOn] = useState(defaults.depositEnabled);

  return (
    <Card>
      <CardHeader title={t("title")} />
      <form action={formAction} className="space-y-5 p-5" noValidate aria-busy={pending}>
        <p className="text-sm text-muted">{t("intro")}</p>
        <FormError error={state.errors?.form} />

        <div className="grid items-start gap-5 md:grid-cols-2">
          <Field label={t("wallet")} hint={t("walletHint")} error={state.errors?.walletAccounts}>
            {(p) => <textarea {...p} name="walletAccounts" dir="ltr" rows={4} defaultValue={defaults.walletAccounts} placeholder={"01012345678 — Vodafone Cash\n01112345678 — Orange Cash"} disabled={readOnly} className={`${inputClass} h-auto py-3 text-start`} />}
          </Field>
          <Field label={t("instapay")} hint={t("instapayHint")} error={state.errors?.instapayAccounts}>
            {(p) => <textarea {...p} name="instapayAccounts" dir="ltr" rows={4} defaultValue={defaults.instapayAccounts} placeholder={"malika@instapay"} disabled={readOnly} className={`${inputClass} h-auto py-3 text-start`} />}
          </Field>
        </div>

        <div className="space-y-4 border border-line p-4">
          <label className="flex min-h-11 items-center gap-3 text-sm font-medium">
            <input
              type="checkbox"
              name="depositEnabled"
              value="true"
              checked={depositOn}
              onChange={(e) => setDepositOn(e.target.checked)}
              disabled={readOnly}
              className="size-4 accent-[var(--color-brand,#67251b)]"
            />
            <span>{t("depositEnabled")}</span>
          </label>
          <p className="text-sm text-muted">{depositOn ? t("depositOnNote") : t("depositOffNote")}</p>

          {/* The amount field stays in the form while the switch is off, so the saved amount is not lost. */}
          <Field label={t("deposit")} hint={t("depositHint")} error={state.errors?.deposit} className="max-w-sm">
            {(p) => <input {...p} name="deposit" dir="ltr" inputMode="decimal" defaultValue={defaults.deposit} placeholder="0" readOnly={readOnly || !depositOn} aria-disabled={!depositOn} tabIndex={depositOn ? undefined : -1} className={`${inputClass} ${depositOn ? "" : "opacity-50"}`} />}
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
