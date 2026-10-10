"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormError, inputClass } from "@/components/ui/field";
import { useRouter } from "@/i18n/navigation";
import { saveNavItemAction } from "@/server/actions/admin-content";
import type { ActionState } from "@/server/actions/types";
import type { NavMenu } from "./types";

const MENUS: readonly NavMenu[] = ["header", "footer"];

/** Create/edit one header or footer link inside a Drawer. */
export function NavItemForm({ row, menu, onDone, onCancel }: { row: { id?: string; menu?: string; labelAr: string; labelEn: string; href: string; visible: boolean } | null; menu: NavMenu; onDone: () => void; onCancel: () => void }) {
  const t = useTranslations("admin.navigation");
  const f = useTranslations("admin.form");
  const router = useRouter();
  const [state, action, pending] = useActionState(saveNavItemAction, {} as ActionState);

  useEffect(() => {
    if (state.ok) {
      onDone();
      router.refresh();
    }
  }, [state, onDone, router]);

  return (
    <form action={action} className="space-y-5 p-5" noValidate aria-busy={pending}>
      <input type="hidden" name="id" value={row?.id ?? ""} />
      <FormError error={state.errors?.form} />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t("fields.labelAr")} error={state.errors?.labelAr}>
          {(p) => <input {...p} name="labelAr" defaultValue={row?.labelAr ?? ""} maxLength={60} required className={inputClass} />}
        </Field>
        <Field label={t("fields.labelEn")} error={state.errors?.labelEn}>
          {(p) => <input {...p} name="labelEn" dir="ltr" defaultValue={row?.labelEn ?? ""} maxLength={60} required className={inputClass} />}
        </Field>
      </div>

      <Field label={t("cols.href")} hint={t("fields.hrefHint")} error={state.errors?.href}>
        {(p) => <input {...p} name="href" dir="ltr" defaultValue={row?.href ?? ""} maxLength={300} placeholder="/collections/new" required className={inputClass} />}
      </Field>

      <Field label={t("fields.menu")} error={state.errors?.menu}>
        {(p) => (
          <select {...p} name="menu" defaultValue={row?.menu ?? menu} className={inputClass}>
            {MENUS.map((m) => (
              <option key={m} value={m}>
                {t(`tabs.${m}` as "tabs.header")}
              </option>
            ))}
          </select>
        )}
      </Field>

      <label className="flex items-center gap-3 text-sm">
        <input type="checkbox" name="visible" value="true" defaultChecked={row?.visible ?? true} className="size-4 accent-[var(--color-brand,#67251b)]" />
        <span>{f("visible")}</span>
        <input type="hidden" name="visible" value="false" />
      </label>

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
