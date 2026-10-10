"use client";

import { Check, Copy, ImageUp, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { Field, inputClass } from "@/components/ui/field";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { GOVERNORATES, governorateName } from "@/lib/geo";
import { formatMoney, type Loc } from "@/lib/localize";
import { channelAccounts, paymentPlan, type PaymentPlan, type TransferChannel } from "@/lib/payments";
import { DELIVERY_METHODS } from "@/lib/shipping";
import type { FieldErrors } from "@/lib/validation/checkout";
import type { CheckoutForm, PaymentMethodOption, PaymentSettings, SavedAddress } from "./types";

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

export function DeliveryStep({ form, set, options, freeThresholdMinor, window }: { form: CheckoutForm; set: StepProps["set"]; options: Record<string, number> | null; freeThresholdMinor: number; window: { minDays: number; maxDays: number } }) {
  const t = useTranslations("checkout");
  const loc = useLocale() as Loc;
  return (
    <fieldset className="space-y-3">
      <legend className="sr-only">{t("steps.delivery")}</legend>
      {DELIVERY_METHODS.map((m) => (
        <Choice key={m.id} name="delivery" checked={form.deliveryMethod === m.id} onSelect={() => set("deliveryMethod", m.id)} title={t(`delivery.${m.id}`)} body={t("deliveryEta", { min: window.minDays, max: window.maxDays })}
          aside={(options?.[m.id] ?? m.priceMinor) === 0 ? t("free") : formatMoney(options?.[m.id] ?? m.priceMinor, loc)} />
      ))}
      <p className="pt-2 text-sm text-muted">{t("freeShippingNote", { amount: formatMoney(freeThresholdMinor, loc) })}</p>
    </fieldset>
  );
}

export function PaymentStep({ form, set, errors, methods, settings, plan, totalMinor }: { form: CheckoutForm; set: StepProps["set"]; errors: FieldErrors; methods: PaymentMethodOption[]; settings: PaymentSettings; plan: PaymentPlan; totalMinor: number }) {
  const t = useTranslations("checkout");
  const loc = useLocale() as Loc;
  // Cash on delivery explains the deposit when the store asks for one.
  const codPlan = paymentPlan("cod", totalMinor, settings);
  const bodyFor = (id: string) => {
    if (id === "cod") {
      const p = codPlan;
      return p.prepaidMinor > 0 ? t("payment.codDepositBody", { deposit: formatMoney(p.prepaidMinor, loc), due: formatMoney(p.dueMinor, loc) }) : t("payment.codBody");
    }
    return t(`payment.${id}Body` as never);
  };
  return (
    <div className="space-y-8">
      <fieldset className="space-y-3">
        <legend className="sr-only">{t("steps.payment")}</legend>
        {methods.map((m) => (
          <Choice key={m.id} name="payment" checked={form.paymentMethod === m.id} disabled={!m.enabled} onSelect={() => set("paymentMethod", m.id)} title={t(`payment.${m.id}` as never)} body={bodyFor(m.id)} />
        ))}
      </fieldset>
      {plan.needsTransfer && <TransferPanel form={form} set={set} errors={errors} settings={settings} plan={plan} />}
    </div>
  );
}

function CopyButton({ value }: { value: string }) {
  const t = useTranslations("checkout");
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value.trim().split(/\s/)[0] || value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          /* clipboard unavailable — the number is still on screen */
        }
      }}
      className="inline-flex shrink-0 items-center gap-1.5 text-xs uppercase tracking-[0.15em] text-brand underline-offset-4 hover:underline"
    >
      {copied ? <Check size={13} strokeWidth={2.4} /> : <Copy size={13} strokeWidth={1.8} />}
      {copied ? t("transfer.copied") : t("transfer.copy")}
    </button>
  );
}

const CHANNEL_LABEL = { wallet: "payment.wallet", instapay: "payment.instapay" } as const;

/** Shown when the order needs a transfer: where to send the money, then the sender's number and the receipt. */
function TransferPanel({ form, set, errors, settings, plan }: { form: CheckoutForm; set: StepProps["set"]; errors: FieldErrors; settings: PaymentSettings; plan: PaymentPlan }) {
  const t = useTranslations("checkout");
  const loc = useLocale() as Loc;
  const channel = form.transferChannel || null;
  const accounts = channel ? channelAccounts(settings, channel) : [];
  const isDeposit = form.paymentMethod === "cod";

  return (
    <section aria-labelledby="transfer-title" className="space-y-6 border border-line bg-surface p-5 sm:p-6">
      <div className="space-y-1">
        <h2 id="transfer-title" className="text-[0.72rem] font-medium uppercase tracking-[0.2em] text-accent">{t("transfer.title")}</h2>
        <p className="font-display text-3xl text-brand">{formatMoney(plan.prepaidMinor, loc)}</p>
        <p className="text-sm text-muted">{isDeposit ? t("transfer.depositNote", { due: formatMoney(plan.dueMinor, loc) }) : t("transfer.fullNote")}</p>
      </div>

      {plan.channels.length > 1 && (
        <fieldset className="space-y-3">
          <legend className="mb-1 text-[0.72rem] font-medium uppercase tracking-[0.2em] text-accent">{t("transfer.channel")}</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {plan.channels.map((c: TransferChannel) => (
              <Choice key={c} name="channel" checked={form.transferChannel === c} onSelect={() => set("transferChannel", c)} title={t(CHANNEL_LABEL[c])} />
            ))}
          </div>
          {errors.transferChannel && <p role="alert" className="text-sm text-brand">{t("transfer.chooseChannel")}</p>}
        </fieldset>
      )}

      {channel && (
        <div className="space-y-3">
          <p className="text-[0.72rem] font-medium uppercase tracking-[0.2em] text-accent">{t("transfer.sendTo", { channel: t(CHANNEL_LABEL[channel]) })}</p>
          <ul className="divide-y divide-line border border-line">
            {accounts.map((a) => (
              <li key={a} className="flex items-center justify-between gap-4 bg-background px-4 py-3 text-sm">
                <span dir="ltr" className="break-all text-start font-medium tracking-wide">{a}</span>
                <CopyButton value={a} />
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label={t("transfer.senderPhone")} hint={t("transfer.senderPhoneHint")} error={errors.senderPhone} className="sm:col-span-2">
          {(p) => <input {...p} name="senderPhone" type="tel" inputMode="tel" dir="ltr" autoComplete="off" value={form.senderPhone} onChange={(e) => set("senderPhone", e.target.value)} placeholder="01XXXXXXXXX" className={cn(inputClass, "text-start")} />}
        </Field>
        <ReceiptUpload form={form} set={set} error={errors.receiptToken} />
      </div>
    </section>
  );
}

/** Uploads the receipt screenshot right away; the order only carries the signed token that comes back. */
function ReceiptUpload({ form, set, error }: { form: CheckoutForm; set: StepProps["set"]; error?: string }) {
  const t = useTranslations("checkout");
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<"too_large" | "bad_type" | "rate_limited" | "failed" | null>(null);

  const upload = async (file: File) => {
    setProblem(null);
    if (file.size > 5 * 1024 * 1024) return setProblem("too_large");
    setBusy(true);
    try {
      const body = new FormData();
      body.set("file", file);
      const res = await fetch("/api/checkout/receipt", { method: "POST", body });
      const data = (await res.json().catch(() => ({}))) as { url?: string; token?: string; error?: string };
      if (!res.ok || !data.url || !data.token) {
        setProblem(data.error === "too_large" ? "too_large" : data.error === "bad_type" ? "bad_type" : data.error === "rate_limited" ? "rate_limited" : "failed");
        return;
      }
      set("receiptToken", data.token);
      set("receiptUrl", data.url);
    } catch {
      setProblem("failed");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  const message = problem ? t(`transfer.errors.${problem}`) : error ? t("transfer.receiptRequired") : null;
  return (
    <div className="space-y-2 sm:col-span-2">
      <p className="text-[0.72rem] font-medium uppercase tracking-[0.2em] text-accent">{t("transfer.receipt")}</p>
      <input ref={input} id="receipt-file" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }} />
      {form.receiptToken ? (
        <div className="flex items-center gap-4 border border-line bg-background p-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- the receipt is a customer-supplied image on our own storage */}
          <img src={form.receiptUrl} alt={t("transfer.receiptAlt")} className="size-16 shrink-0 border border-line object-cover" />
          <div className="min-w-0 flex-1 text-sm">
            <p className="flex items-center gap-1.5 font-medium text-sage-700 dark:text-sage-500"><Check size={14} strokeWidth={2.4} />{t("transfer.uploaded")}</p>
            <label htmlFor="receipt-file" className="cursor-pointer text-xs uppercase tracking-[0.15em] text-brand underline underline-offset-4">{t("transfer.replace")}</label>
          </div>
          <button type="button" onClick={() => { set("receiptToken", ""); set("receiptUrl", ""); }} aria-label={t("transfer.remove")} className="shrink-0 text-muted hover:text-brand"><X size={16} /></button>
        </div>
      ) : (
        <label htmlFor="receipt-file" aria-busy={busy} className={cn("flex cursor-pointer items-center gap-3 border border-dashed p-4 text-sm transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent", message ? "border-brand" : "border-line hover:border-accent")}>
          <ImageUp size={20} strokeWidth={1.4} className="text-accent" aria-hidden />
          <span>{busy ? t("transfer.uploading") : t("transfer.choose")}</span>
        </label>
      )}
      {message ? <p role="alert" className="text-sm text-brand">{message}</p> : <p className="text-sm text-muted">{t("transfer.receiptHint")}</p>}
    </div>
  );
}

export function ReviewStep({ form, plan, onEdit }: { form: CheckoutForm; plan: PaymentPlan; onEdit: (step: "info" | "address" | "delivery" | "payment") => void }) {
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
      {block(t("steps.payment"), "payment", [
        t(`payment.${form.paymentMethod}` as never),
        ...(plan.needsTransfer
          ? [t("transfer.reviewPaidNow", { amount: formatMoney(plan.prepaidMinor, loc), channel: form.transferChannel ? t(CHANNEL_LABEL[form.transferChannel]) : "" }), t("transfer.reviewFrom", { phone: form.senderPhone })]
          : []),
        ...(plan.needsTransfer && plan.dueMinor > 0 ? [t("transfer.reviewDue", { amount: formatMoney(plan.dueMinor, loc) })] : []),
      ])}
      <p className="pt-5 text-sm text-muted">
        {t.rich("termsNote", { terms: (c) => <Link href="/terms" className="text-brand underline underline-offset-4">{c}</Link>, privacy: (c) => <Link href="/privacy" className="text-brand underline underline-offset-4">{c}</Link> })}
      </p>
    </div>
  );
}
