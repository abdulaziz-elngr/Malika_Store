"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormError, inputClass } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { changePasswordAction, updateProfileAction } from "@/server/actions/account";
import type { ActionState } from "@/server/actions/types";

const initial: ActionState = {};

export function ProfileForm({ name, phone, email }: { name: string; phone: string; email: string }) {
  const t = useTranslations("account");
  const toast = useToast();
  const [state, action, pending] = useActionState(updateProfileAction, initial);
  useEffect(() => { if (state.ok) toast.push(t("profileSaved")); }, [state, toast, t]);
  return (
    <form action={action} className="grid max-w-xl gap-6" noValidate>
      <Field label={t("email")} hint={t("emailLocked")}>{(p) => <input {...p} value={email} readOnly dir="ltr" className={`${inputClass} text-start opacity-70`} />}</Field>
      <Field label={t("name")} error={state.errors?.name}>{(p) => <input {...p} name="name" autoComplete="name" defaultValue={state.values?.name ?? name} className={inputClass} />}</Field>
      <Field label={t("phone")} error={state.errors?.phone}>{(p) => <input {...p} name="phone" type="tel" dir="ltr" inputMode="tel" autoComplete="tel" defaultValue={state.values?.phone ?? phone} className={`${inputClass} text-start`} />}</Field>
      <div><Button type="submit" disabled={pending} aria-busy={pending}>{t("saveChanges")}</Button></div>
    </form>
  );
}

export function PasswordForm() {
  const t = useTranslations("account");
  const toast = useToast();
  const [state, action, pending] = useActionState(changePasswordAction, initial);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) {
      toast.push(t("passwordChanged"));
      ref.current?.reset();
    }
  }, [state, toast, t]);
  return (
    <form ref={ref} action={action} className="grid max-w-xl gap-6" noValidate>
      <FormError error={state.errors?.form} />
      <Field label={t("currentPassword")} error={state.errors?.current}>{(p) => <input {...p} name="current" type="password" dir="ltr" autoComplete="current-password" className={`${inputClass} text-start`} />}</Field>
      <Field label={t("newPassword")} error={state.errors?.next} hint={t("passwordHint")}>{(p) => <input {...p} name="next" type="password" dir="ltr" autoComplete="new-password" className={`${inputClass} text-start`} />}</Field>
      <div><Button type="submit" disabled={pending} aria-busy={pending}>{t("changePassword")}</Button></div>
    </form>
  );
}
