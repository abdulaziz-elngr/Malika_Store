"use client";

import { useLocale, useTranslations } from "next-intl";
import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormError, inputClass, useFieldError } from "@/components/ui/field";
import { useRouter } from "@/i18n/navigation";
import { pick, type Loc } from "@/lib/localize";
import { createStaffAction, updateStaffAction } from "@/server/actions/admin-system";
import type { ActionState } from "@/server/actions/types";

export type RoleOption = { key: string; nameAr: string; nameEn: string; isSystem: boolean };
export type StaffUser = { id: string; name: string; email: string; active: boolean; roleKey: string };

/** Create routes to the new account's edit page on success; edit just refreshes. */
export function StaffForm({ user, roles }: { user: StaffUser | null; roles: RoleOption[] }) {
  const t = useTranslations("admin.user");
  const u = useTranslations("admin.users");
  const f = useTranslations("admin.form");
  const ferr = useFieldError();
  const loc = useLocale() as Loc;
  const router = useRouter();
  const [state, formAction, pending] = useActionState(user ? updateStaffAction : createStaffAction, {} as ActionState);

  useEffect(() => {
    if (!state.ok) return;
    if (user) router.refresh();
    else if (state.id) router.push(`/admin/users/${state.id}`);
    else router.push("/admin/users");
  }, [state, user, router]);

  return (
    <form action={formAction} className="space-y-5 border border-line bg-surface p-5" noValidate aria-busy={pending}>
      <input type="hidden" name="id" value={user?.id ?? ""} />
      <FormError error={state.errors?.form} />

      <Field label={u("name")} error={state.errors?.name}>
        {(p) => <input {...p} name="name" defaultValue={user?.name} maxLength={80} required className={inputClass} />}
      </Field>

      <Field label={u("email")} error={state.errors?.email}>
        {(p) => <input {...p} name="email" type="email" dir="ltr" defaultValue={user?.email} maxLength={160} placeholder="name@malika.com" required className={inputClass} />}
      </Field>

      {!user && (
        <Field label={t("password")} hint={`${ferr("adminPasswordShort")} ${ferr("adminPasswordWeak")}`} error={state.errors?.password}>
          {(p) => <input {...p} name="password" type="password" autoComplete="new-password" className={inputClass} />}
        </Field>
      )}

      <Field label={t("role")} hint={t("roleHint")} error={state.errors?.roleKey}>
        {(p) => (
          <select {...p} name="roleKey" defaultValue={user?.roleKey ?? roles[0]?.key ?? ""} required className={inputClass}>
            {roles.map((r) => (
              <option key={r.key} value={r.key}>
                {pick(loc, r.nameAr, r.nameEn)}
              </option>
            ))}
          </select>
        )}
      </Field>

      {/* Visible-checkbox trick: the checked value submits first, the hidden fallback second. */}
      <label className="flex items-center gap-3 text-sm">
        <input type="checkbox" name="active" defaultChecked={user?.active ?? true} value="true" className="size-4 accent-[var(--color-brand,#67251b)]" />
        <span>{t("active")}</span>
        <input type="hidden" name="active" value="false" />
      </label>

      <p className="border border-line px-4 py-3 text-sm text-muted">{t("securityNote")}</p>

      <p role="status" aria-live="polite" className="text-sm text-sage-700 dark:text-sage-200">
        {state.ok ? f("saved") : ""}
      </p>

      <div className="flex justify-end gap-3 border-t border-line pt-5">
        <Button type="button" variant="secondary" onClick={() => router.push("/admin/users")} className="min-h-11 px-6">
          {f("back")}
        </Button>
        <Button type="submit" disabled={pending} aria-busy={pending} className="min-h-11 px-6">
          {pending ? f("saving") : user ? f("save") : f("create")}
        </Button>
      </div>
    </form>
  );
}
