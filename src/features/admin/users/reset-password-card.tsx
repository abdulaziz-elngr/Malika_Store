"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormError, inputClass, useFieldError } from "@/components/ui/field";
import { resetStaffPasswordAction } from "@/server/actions/admin-system";
import type { ActionState } from "@/server/actions/types";

/** Standalone card on the edit page: the server only receives one password, so the match is checked here. */
export function ResetPasswordCard({ userId }: { userId: string }) {
  const t = useTranslations("admin.user");
  const f = useTranslations("admin.form");
  const ferr = useFieldError();
  const [state, formAction, pending] = useActionState(resetStaffPasswordAction, {} as ActionState);
  const [mismatch, setMismatch] = useState(false);
  const [done, setDone] = useState(false);

  const submitChecked = (fd: FormData) => {
    const pw = typeof fd.get("password") === "string" ? (fd.get("password") as string) : "";
    const confirm = typeof fd.get("passwordConfirm") === "string" ? (fd.get("passwordConfirm") as string) : "";
    if (!pw || pw !== confirm) {
      setMismatch(true);
      return;
    }
    setMismatch(false);
    setDone(false);
    void formAction(fd);
  };

  useEffect(() => {
    if (state.ok) setDone(true);
  }, [state]);

  return (
    <form action={submitChecked} className="space-y-5 border border-line bg-surface p-5" noValidate aria-busy={pending}>
      <input type="hidden" name="id" value={userId} />

      <div className="space-y-1">
        <p className="text-[0.72rem] font-medium uppercase tracking-[0.22em] text-accent">{t("resetTitle")}</p>
        <p className="text-sm text-muted">{t("resetIntro")}</p>
      </div>

      <FormError error={state.errors?.form} />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t("newPassword")} hint={`${ferr("adminPasswordShort")} ${ferr("adminPasswordWeak")}`} error={state.errors?.password}>
          {(p) => (
            <input
              {...p}
              name="password"
              type="password"
              autoComplete="new-password"
              onChange={() => {
                setMismatch(false);
                setDone(false);
              }}
              className={inputClass}
            />
          )}
        </Field>
        <Field label={t("confirmPassword")}>
          {(p) => (
            <>
              <input
                {...p}
                name="passwordConfirm"
                type="password"
                autoComplete="new-password"
                aria-invalid={mismatch || undefined}
                onChange={() => {
                  setMismatch(false);
                  setDone(false);
                }}
                className={inputClass}
              />
              {mismatch && (
                <p role="alert" className="text-sm text-brand">
                  {t("passwordsMismatch")}
                </p>
              )}
            </>
          )}
        </Field>
      </div>

      <p role="status" aria-live="polite" className="text-sm text-sage-700 dark:text-sage-200">
        {done ? f("saved") : ""}
      </p>

      <div className="flex justify-end gap-3 border-t border-line pt-5">
        <Button type="submit" disabled={pending} aria-busy={pending} className="min-h-11 px-6">
          {pending ? f("saving") : t("resetTitle")}
        </Button>
      </div>
    </form>
  );
}
