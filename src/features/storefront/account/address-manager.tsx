"use client";

import { Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormError, inputClass } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { GOVERNORATES, governorateName } from "@/lib/geo";
import type { Loc } from "@/lib/localize";
import { deleteAddressAction, saveAddressAction } from "@/server/actions/account";
import type { ActionState } from "@/server/actions/types";

export type AddressRow = { id: string; label: string | null; recipient: string; phone: string; governorate: string; city: string; line1: string; line2: string | null; notes: string | null; isDefault: boolean };
const initial: ActionState = {};

function AddressForm({ address, onDone }: { address?: AddressRow; onDone: () => void }) {
  const t = useTranslations("account");
  const tc = useTranslations("checkout");
  const loc = useLocale() as Loc;
  const toast = useToast();
  const [state, action, pending] = useActionState(saveAddressAction, initial);
  const v = state.values ?? {};
  useEffect(() => {
    if (state.ok) {
      toast.push(t("addressSaved"));
      onDone();
    }
  }, [state, toast, t, onDone]);
  const val = (k: keyof AddressRow, fallback = "") => v[k as string] ?? (address?.[k] as string | null | undefined) ?? fallback;
  return (
    <form action={action} className="grid gap-5 border border-line bg-surface p-6 sm:grid-cols-2" noValidate>
      {address && <input type="hidden" name="id" value={address.id} />}
      <FormError error={state.errors?.form} />
      <Field label={t("addressLabel")} error={state.errors?.label}>{(p) => <input {...p} name="label" defaultValue={val("label")} placeholder={t("addressLabelPlaceholder")} className={inputClass} />}</Field>
      <Field label={tc("name")} error={state.errors?.recipient}>{(p) => <input {...p} name="recipient" autoComplete="name" defaultValue={val("recipient")} className={inputClass} />}</Field>
      <Field label={tc("phone")} error={state.errors?.phone}>{(p) => <input {...p} name="phone" type="tel" dir="ltr" inputMode="tel" defaultValue={val("phone")} className={`${inputClass} text-start`} />}</Field>
      <Field label={tc("governorate")} error={state.errors?.governorate}>
        {(p) => (
          <select {...p} name="governorate" defaultValue={val("governorate")} className={inputClass}>
            <option value="">{tc("select")}</option>
            {GOVERNORATES.map((g) => <option key={g[0]} value={g[0]}>{loc === "ar" ? g[1] : g[2]}</option>)}
          </select>
        )}
      </Field>
      <Field label={tc("city")} error={state.errors?.city}>{(p) => <input {...p} name="city" defaultValue={val("city")} className={inputClass} />}</Field>
      <Field label={tc("line1")} error={state.errors?.line1}>{(p) => <input {...p} name="line1" defaultValue={val("line1")} className={inputClass} />}</Field>
      <Field label={tc("line2")} error={state.errors?.line2} className="sm:col-span-2">{(p) => <input {...p} name="line2" defaultValue={val("line2")} className={inputClass} />}</Field>
      <Field label={tc("notes")} error={state.errors?.notes} className="sm:col-span-2">{(p) => <input {...p} name="notes" defaultValue={val("notes")} className={inputClass} />}</Field>
      <label className="flex items-center gap-3 text-sm sm:col-span-2"><input type="checkbox" name="isDefault" defaultChecked={address?.isDefault} className="size-4 accent-[var(--brand)]" />{t("makeDefault")}</label>
      <div className="flex gap-3 sm:col-span-2">
        <Button type="submit" disabled={pending} aria-busy={pending}>{t("saveAddress")}</Button>
        <Button variant="ghost" onClick={onDone}>{t("cancel")}</Button>
      </div>
    </form>
  );
}

export function AddressManager({ addresses }: { addresses: AddressRow[] }) {
  const t = useTranslations("account");
  const loc = useLocale() as Loc;
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const close = () => setEditing(null);

  return (
    <div className="space-y-6">
      {addresses.length === 0 && editing !== "new" && <p className="border border-line bg-surface px-6 py-10 text-center text-muted">{t("noAddresses")}</p>}
      <ul className="grid gap-4 md:grid-cols-2">
        {addresses.map((a) => (
          <li key={a.id} className={editing === a.id ? "md:col-span-2" : undefined}>
            {editing === a.id ? (
              <AddressForm address={a} onDone={close} />
            ) : (
              <div className="flex h-full flex-col justify-between gap-5 border border-line p-6 text-sm">
                <div className="space-y-1">
                  <p className="flex items-center gap-3 font-medium">{a.label || a.recipient}{a.isDefault && <span className="border border-brand px-2 py-0.5 text-[0.65rem] uppercase tracking-[0.15em] text-brand">{t("default")}</span>}</p>
                  <p className="text-muted">{a.recipient}</p>
                  <p className="text-muted">{a.line1}{a.line2 ? `، ${a.line2}` : ""}</p>
                  <p className="text-muted">{a.city}، {governorateName(a.governorate, loc)}</p>
                  <p dir="ltr" className="text-start text-muted">{a.phone}</p>
                </div>
                <div className="flex gap-5 text-xs uppercase tracking-[0.15em]">
                  <button type="button" onClick={() => setEditing(a.id)} className="text-brand underline underline-offset-4">{t("edit")}</button>
                  <form action={deleteAddressAction} onSubmit={(e) => { if (!confirm(t("confirmDelete"))) e.preventDefault(); }}>
                    <input type="hidden" name="id" value={a.id} />
                    <button type="submit" className="text-muted underline underline-offset-4 hover:text-brand">{t("delete")}</button>
                  </form>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      {editing === "new" ? <AddressForm onDone={close} /> : <Button variant="secondary" onClick={() => setEditing("new")}><Plus size={16} />{t("addAddress")}</Button>}
    </div>
  );
}
