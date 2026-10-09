"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormError, inputClass } from "@/components/ui/field";
import { adminLoginAction } from "@/server/actions/admin-auth";
import type { ActionState } from "@/server/actions/types";

export function AdminLoginForm() {
  const t = useTranslations("admin.login");
  const [state, action, pending] = useActionState(adminLoginAction, {} as ActionState);
  return (
    <form action={action} className="space-y-6" noValidate>
      <FormError error={state.errors?.form} />
      <Field label={t("email")} error={state.errors?.email}>
        {(p) => <input {...p} name="email" type="email" dir="ltr" autoComplete="username" defaultValue={state.values?.email} required className={`${inputClass} text-start`} />}
      </Field>
      <Field label={t("password")} error={state.errors?.password}>
        {(p) => <input {...p} name="password" type="password" dir="ltr" autoComplete="current-password" required className={`${inputClass} text-start`} />}
      </Field>
      <Button type="submit" disabled={pending} aria-busy={pending} className="w-full">{pending ? t("signingIn") : t("signIn")}</Button>
    </form>
  );
}
