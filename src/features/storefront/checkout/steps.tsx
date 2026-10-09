"use client";

import { Check } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Field, inputClass } from "@/components/ui/field";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { GOVERNORATES, governorateName } from "@/lib/geo";
import { formatMoney, type Loc } from "@/lib/localize";
import { DELIVERY_METHODS } from "@/lib/shipping";
import type { FieldErrors } from "@/lib/validation/checkout";
import type { CheckoutForm, PaymentMethodOption, SavedAddress } from "./types";

type StepProps = { form: CheckoutForm; errors: FieldErrors; set: <K extends keyof CheckoutForm>(k: K, v: CheckoutForm[K]) => void };

export function InfoStep({ form, errors, set, signedIn }: StepProps & { signedIn: boolean }) {
  const t = useTranslations("checkout");
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <Field label={t("name")} error={errors.name} className="sm:col-span-2">
        {(p) => <input {...p} name="name" autoComplete="name" value={form.name} onChange={(e) => set("name", e.target.value)} className={inputClass} />}
      </Field>
      <Field label={t("email")} error={errors.email}>
        {(p) => <input {...p} name="email" type="email" inputMode="email" dir="ltr" autoComplete="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={cn(inputClass, "text-start")} />}
      </Field>
      <Field label={t("phone")} error={errors.phone} hint={t("phoneHint")}>
        {(p) => <input {...p} name="tel" type="tel" inputMode="tel" dir="ltr" autoComplete="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="01XXXXXXXXX" className={cn(inputClass, "text-start")} />}
      </Field>
      {!signedIn && (
        <p className="text-sm text-muted sm:col-span-2">
          {t("haveAccount")} <Link href="/account/login?next=/checkout" className="text-brand underline underline-offset-4">{t("signIn")}</Link>
        </p>
      )}
    </div>
  );
}

export function AddressStep({ form, errors, set, saved, onPick, signedIn }: StepProps & { saved: SavedAddress[]; onPick: (a: SavedAddress) => void; signedIn: boolean }) {
  const t = useTranslations("checkout");
  const loc = useLocale() as Loc;
  return (
    <div className="space-y-8">
      {saved.length > 0 && (
        <fieldset>
          <legend className="mb-3 text-[0.72rem] font-medium uppercase tracking-[0.2em] text-accent">{t("savedAddresses")}</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {saved.map((a) => (
              <button key={a.id} type="button" onClick={() => onPick(a)} className="border border-line p-4 text-start text-sm transition-colors hover:border-brand focus-visible:border-brand">
                <span className="block font-medium">{a.label || a.recipient}{a.isDefault && <span className="ms-2 text-xs text-accent">· {t("default")}</span>}</span>
                <span className="mt-1 block text-muted">{a.line1}، {a.city}، {governorateName(a.governorate, loc)}</span>
              </button>
            ))}
          </div>
        </fieldset>
      )}
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label={t("governorate")} error={errors.governorate}>
          {(p) => (
            <select {...p} name="governorate" autoComplete="address-level1" value={form.governorate} onChange={(e) => set("governorate", e.target.value)} className={inputClass}>
              <option value="">{t("select")}</option>
              {GOVERNORATES.map((g) => <option key={g[0]} value={g[0]}>{loc === "ar" ? g[1] : g[2]}</option>)}
            </select>
          )}
        </Field>
        <Field label={t("city")} error={errors.city}>
          {(p) => <input {...p} name="city" autoComplete="address-level2" value={form.city} onChange={(e) => set("city", e.target.value)} className={inputClass} />}
        </Field>
        <Field label={t("line1")} error={errors.line1} className="sm:col-span-2">
          {(p) => <input {...p} name="line1" autoComplete="address-line1" value={form.line1} onChange={(e) => set("line1", e.target.value)} placeholder={t("line1Placeholder")} className={inputClass} />}
        </Field>
        <Field label={t("line2")} error={errors.line2} className="sm:col-span-2">
          {(p) => <input {...p} name="line2" autoComplete="address-line2" value={form.line2} onChange={(e) => set("line2", e.target.value)} className={inputClass} />}
        </Field>
        <Field label={t("notes")} error={errors.notes} className="sm:col-span-2">
          {(p) => <textarea {...p} name="notes" rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder={t("notesPlaceholder")} className={cn(inputClass, "h-auto py-3")} />}
        </Field>
        {signedIn && (
          <label className="flex items-center gap-3 text-sm sm:col-span-2">
            <input type="checkbox" checked={form.saveAddress} onChange={(e) => set("saveAddress", e.target.checked)} className="size-4 accent-[var(--brand)]" />
            {t("saveAddress")}
          </label>
        )}
      </div>
    </div>
  );
}

function Choice({ checked, disabled, onSelect, title, body, aside, name }: { checked: boolean; disabled?: boolean; onSelect: () => void; title: string; body?: string; aside?: string; name: string }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-4 border p-5 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent", checked ? "border-brand bg-surface" : "border-line hover:border-accent", disabled && "cursor-not-allowed opacity-55 hover:border-line")}>
      <input type="radio" name={name} checked={checked} disabled={disabled} onChange={onSelect} className="peer sr-only" />
      <span aria-hidden className={cn("mt-1 grid size-5 shrink-0 place-items-center rounded-full border", checked ? "border-brand bg-brand text-brand-contrast" : "border-line")}>{checked && <Check size={12} strokeWidth={2.5} />}</span>
      <span className="flex-1">
        <span className="block font-medium">{title}</span>
        {body && <span className="mt-1 block text-sm text-muted">{body}</span>}
      </span>
      {aside && <span className="text-sm">{aside}</span>}
    </label>
  );
}

export function DeliveryStep({ form, set, options }: { form: CheckoutForm; set: StepProps["set"]; options: Record<string, number> | null }) {
  const t = useTranslations("checkout");
  const loc = useLocale() as Loc;
  return (
    <fieldset className="space-y-3">
      <legend className="sr-only">{t("steps.delivery")}</legend>
      {DELIVERY_METHODS.map((m) => (
        <Choice key={m.id} name="delivery" checked={form.deliveryMethod === m.id} onSelect={() => set("deliveryMethod", m.id)} title={t(`delivery.${m.id}`)} body={t("deliveryEta", { min: m.minDays, max: m.maxDays })}
          aside={(options?.[m.id] ?? m.priceMinor) === 0 ? t("free") : formatMoney(options?.[m.id] ?? m.priceMinor, loc)} />
      ))}
      <p className="pt-2 text-sm text-muted">{t("freeShippingNote")}</p>
    </fieldset>
  );
}

export function PaymentStep({ form, set, methods }: { form: CheckoutForm; set: StepProps["set"]; methods: PaymentMethodOption[] }) {
  const t = useTranslations("checkout");
  return (
    <fieldset className="space-y-3">
      <legend className="sr-only">{t("steps.payment")}</legend>
      {methods.map((m) => (
        <Choice key={m.id} name="payment" checked={form.paymentMethod === m.id} disabled={!m.enabled} onSelect={() => set("paymentMethod", m.id)} title={t(`payment.${m.id}` as never)} body={m.enabled ? t(`payment.${m.id}Body` as never) : t("comingSoon")} />
      ))}
    </fieldset>
  );
}

export function ReviewStep({ form, onEdit }: { form: CheckoutForm; onEdit: (step: "info" | "address" | "delivery" | "payment") => void }) {
  const t = useTranslations("checkout");
  const loc = useLocale() as Loc;
  const block = (title: string, step: "info" | "address" | "delivery" | "payment", lines: string[]) => (
    <div className="flex items-start justify-between gap-4 border-b border-line py-5">
      <div className="space-y-1 text-sm">
        <h3 className="text-[0.72rem] font-medium uppercase tracking-[0.2em] text-accent">{title}</h3>
        {lines.filter(Boolean).map((l, i) => <p key={i} className={i === 0 ? "text-foreground" : "text-muted"}>{l}</p>)}
      </div>
      <button type="button" onClick={() => onEdit(step)} className="shrink-0 text-xs uppercase tracking-[0.15em] text-brand underline underline-offset-4">{t("edit")}</button>
    </div>
  );
  return (
    <div className="border-t border-line">
      {block(t("steps.info"), "info", [form.name, form.email, form.phone])}
      {block(t("steps.address"), "address", [form.line1, [form.line2, form.city, governorateName(form.governorate, loc)].filter(Boolean).join("، "), form.notes])}
      {block(t("steps.delivery"), "delivery", [t(`delivery.${form.deliveryMethod}`)])}
      {block(t("steps.payment"), "payment", [t(`payment.${form.paymentMethod}` as never)])}
      <p className="pt-5 text-sm text-muted">
        {t.rich("termsNote", { terms: (c) => <Link href="/terms" className="text-brand underline underline-offset-4">{c}</Link>, privacy: (c) => <Link href="/privacy" className="text-brand underline underline-offset-4">{c}</Link> })}
      </p>
    </div>
  );
}
