"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormError, inputClass } from "@/components/ui/field";
import { Link } from "@/i18n/navigation";
import { loginAction, registerAction } from "@/server/actions/auth";
import type { ActionState } from "@/server/actions/types";

const initial: ActionState = {};

export function LoginForm({ next }: { next?: string }) {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState(loginAction, initial);
  return (
    <form action={action} className="space-y-6" noValidate>
      <input type="hidden" name="next" value={next ?? ""} />
      <FormError error={state.errors?.form} />
      <Field label={t("email")} error={state.errors?.email}>
        {(p) => <input {...p} name="email" type="email" dir="ltr" autoComplete="email" defaultValue={state.values?.email} required className={`${inputClass} text-start`} />}
      </Field>
      <Field label={t("password")} error={state.errors?.password}>
        {(p) => <input {...p} name="password" type="password" dir="ltr" autoComplete="current-password" required className={`${inputClass} text-start`} />}
      </Field>
      <Button type="submit" disabled={pending} aria-busy={pending} className="w-full">{pending ? t("signingIn") : t("signIn")}</Button>
      <p className="text-center text-sm text-muted">{t("noAccount")} <Link href={`/account/register${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="text-brand underline underline-offset-4">{t("createAccount")}</Link></p>
    </form>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState(registerAction, initial);
  const v = state.values ?? {};
  return (
    <form action={action} className="space-y-6" noValidate>
      <input type="hidden" name="next" value={next ?? ""} />
      <FormError error={state.errors?.form} />
      <Field label={t("name")} error={state.errors?.name}>{(p) => <input {...p} name="name" autoComplete="name" defaultValue={v.name} required className={inputClass} />}</Field>
      <Field label={t("email")} error={state.errors?.email}>{(p) => <input {...p} name="email" type="email" dir="ltr" autoComplete="email" defaultValue={v.email} required className={`${inputClass} text-start`} />}</Field>
      <Field label={t("phone")} error={state.errors?.phone} hint={t("phoneHint")}>{(p) => <input {...p} name="phone" type="tel" dir="ltr" inputMode="tel" autoComplete="tel" defaultValue={v.phone} placeholder="01XXXXXXXXX" required className={`${inputClass} text-start`} />}</Field>
      <Field label={t("password")} error={state.errors?.password} hint={t("passwordHint")}>{(p) => <input {...p} name="password" type="password" dir="ltr" autoComplete="new-password" required className={`${inputClass} text-start`} />}</Field>
      <Button type="submit" disabled={pending} aria-busy={pending} className="w-full">{pending ? t("creating") : t("createAccount")}</Button>
      <p className="text-center text-sm text-muted">{t("haveAccount")} <Link href={`/account/login${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="text-brand underline underline-offset-4">{t("signIn")}</Link></p>
    </form>
  );
}
