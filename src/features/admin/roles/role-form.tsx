"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect, useState } from "react";
import { Card, CardHeader } from "@/components/admin/primitives";
import { Button } from "@/components/ui/button";
import { Field, FormError, inputClass } from "@/components/ui/field";
import { useRouter } from "@/i18n/navigation";
import { createRoleAction, updateRoleAction } from "@/server/actions/admin-system";
import type { ActionState } from "@/server/actions/types";
import { PermissionMatrix } from "./permission-matrix";

export type EditorRole = { id: string; key: string; nameAr: string; nameEn: string; isSystem: boolean };

/** Create routes to the new role's edit page on success; edit just refreshes. super_admin is read-only. */
export function RoleForm({ role, permissionKeys }: { role: EditorRole | null; permissionKeys: string[] }) {
  const t = useTranslations("admin.role");
  const f = useTranslations("admin.form");
  const router = useRouter();
  const readOnly = role?.key === "super_admin";
  const [selected, setSelected] = useState<Set<string>>(() => new Set(permissionKeys));
  const [state, formAction, pending] = useActionState(role ? updateRoleAction : createRoleAction, {} as ActionState);

  useEffect(() => {
    if (!state.ok) return;
    if (role) router.refresh();
    else if (state.id) router.push(`/admin/roles/${state.id}`);
    else router.push("/admin/roles");
  }, [state, role, router]);

  return (
    <form action={formAction} className="space-y-8" noValidate aria-busy={pending}>
      <input type="hidden" name="id" value={role?.id ?? ""} />
      {/* The schema still requires the key on update; the service ignores it there. */}
      {role && <input type="hidden" name="key" value={role.key} />}

      <Card>
        <CardHeader title={role ? t("editTitle") : t("newTitle")} />
        <div className="space-y-5 p-5">
          <FormError error={state.errors?.form} />

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={f("nameAr")} error={state.errors?.nameAr}>
              {(p) => <input {...p} name="nameAr" defaultValue={role?.nameAr} maxLength={60} required disabled={readOnly} className={inputClass} />}
            </Field>
            <Field label={f("nameEn")} error={state.errors?.nameEn}>
              {(p) => <input {...p} name="nameEn" dir="ltr" defaultValue={role?.nameEn} maxLength={60} required disabled={readOnly} className={inputClass} />}
            </Field>
          </div>

          {!role && (
            <Field label={t("key")} hint={t("keyHint")} error={state.errors?.key}>
              {(p) => <input {...p} name="key" dir="ltr" maxLength={40} placeholder="content_editor" required className={inputClass} />}
            </Field>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title={t("matrixTitle")} />
        <div className="space-y-5 p-5">
          {readOnly && <p className="border border-copper-500/50 bg-copper-200/40 px-4 py-3 text-sm text-copper-700 dark:bg-copper-700/20 dark:text-copper-300">{t("lockedNotice")}</p>}
          <PermissionMatrix selected={selected} onChange={setSelected} readOnly={!!readOnly} />
          <p role="status" aria-live="polite" className="text-sm text-muted">
            {t("selectedCount", { count: selected.size })}
          </p>
          <input type="hidden" name="permissionKeys" value={JSON.stringify([...selected])} />
        </div>
      </Card>

      {readOnly ? (
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => router.push("/admin/roles")} className="min-h-11 px-6">
            {f("back")}
          </Button>
        </div>
      ) : (
        <>
          <p role="status" aria-live="polite" className="text-sm text-sage-700 dark:text-sage-200">
            {state.ok ? f("saved") : ""}
          </p>
          <div className="flex justify-end gap-3 border-t border-line pt-5">
            <Button type="button" variant="secondary" onClick={() => router.push("/admin/roles")} className="min-h-11 px-6">
              {f("back")}
            </Button>
            <Button type="submit" disabled={pending} aria-busy={pending} className="min-h-11 px-6">
              {pending ? f("saving") : role ? f("save") : f("create")}
            </Button>
          </div>
        </>
      )}
    </form>
  );
}
