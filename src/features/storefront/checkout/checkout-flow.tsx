"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Button, buttonClasses } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { FormError } from "@/components/ui/field";
import { useCart } from "@/features/storefront/cart/cart-provider";
import { Link, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { paymentPlan } from "@/lib/payments";
import { addressSchema, customerInfoSchema, deliverySchema, fieldErrors, normalizePhone, paymentSchema, transferSchema, type FieldErrors } from "@/lib/validation/checkout";
import { placeOrderAction } from "@/server/actions/checkout";
import { OrderSummary } from "./order-summary";
import { FREE_SHIPPING_THRESHOLD_MINOR } from "@/lib/shipping";
import { AddressStep, DeliveryStep, InfoStep, PaymentStep, ReviewStep } from "./steps";
import { STEPS, type CheckoutForm, type PaymentMethodOption, type PaymentSettings, type SavedAddress, type StepKey } from "./types";

type Props = {
  customer: { name: string; email: string; phone: string | null } | null;
  addresses: SavedAddress[];
  methods: PaymentMethodOption[];
  payments: PaymentSettings;
};

const schemas = { info: customerInfoSchema, address: addressSchema, delivery: deliverySchema, payment: paymentSchema.extend(transferSchema.shape) } as const;

export function CheckoutFlow({ customer, addresses, methods, payments }: Props) {
  const t = useTranslations("checkout");
  const router = useRouter();
  const cart = useCart();
  const { ready, rows, items, pricing, coupon, setExtras, clear } = cart;

  const def = addresses.find((a) => a.isDefault) ?? addresses[0];
  const firstEnabled = methods.find((m) => m.enabled)?.id ?? "cod";
  const [form, setForm] = useState<CheckoutForm>({
    name: customer?.name ?? "", email: customer?.email ?? "", phone: customer?.phone ?? def?.phone ?? "",
    governorate: def?.governorate ?? "", city: def?.city ?? "", line1: def?.line1 ?? "", line2: def?.line2 ?? "", notes: def?.notes ?? "",
    deliveryMethod: "standard", paymentMethod: firstEnabled, transferChannel: "", senderPhone: "", receiptToken: "", receiptUrl: "", saveAddress: false,
  });
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);

  const set = useCallback(<K extends keyof CheckoutForm>(k: K, v: CheckoutForm[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => (e[k] ? { ...e, [k]: "" } : e));
  }, []);

  // Let the server quote shipping for the chosen delivery method.
  const phoneKey = normalizePhone(form.phone);
  useEffect(() => setExtras({ deliveryMethod: form.deliveryMethod, phone: phoneKey }), [form.deliveryMethod, phoneKey, setExtras]);

  useEffect(() => {
    heading.current?.focus();
  }, [step]);

  // What is paid now by transfer and what is left for the courier — mirrors the server's calculation, which is the one that counts.
  const plan = useMemo(() => paymentPlan(form.paymentMethod, pricing?.totalMinor ?? 0, payments), [form.paymentMethod, pricing?.totalMinor, payments]);
  // With a single channel there is nothing to choose; keep the form in sync with the plan.
  useEffect(() => {
    if (!plan.needsTransfer) return;
    if (form.transferChannel && plan.channels.includes(form.transferChannel)) return;
    const only = plan.channels.length === 1 ? plan.channels[0]! : "";
    if (only !== form.transferChannel) setForm((f) => ({ ...f, transferChannel: only }));
  }, [plan.needsTransfer, plan.channels, form.transferChannel]);

  const key: StepKey = STEPS[step]!;
  const validate = (k: Exclude<StepKey, "review">) => {
    const r = schemas[k].safeParse(form);
    const errs = r.success ? {} : fieldErrors(r.error);
    if (k === "payment") {
      if (!methods.some((m) => m.id === form.paymentMethod && m.enabled)) errs.paymentMethod = "required";
      else if (plan.needsTransfer) {
        const t = transferSchema.safeParse(form);
        if (!form.transferChannel) errs.transferChannel = "required";
        if (!form.senderPhone.trim()) errs.senderPhone = "required";
        else if (!normalizePhone(form.senderPhone)) errs.senderPhone = "phone";
        if (!t.success || !form.receiptToken) errs.receiptToken = "required";
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const next = () => {
    if (key !== "review" && !validate(key)) return;
    setFormError(undefined);
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };
  const goTo = (i: number) => {
    if (i < step) setStep(i);
  };

  const blocked = !!pricing?.hasIssues || rows.some((r) => r.line?.issue);
  const place = () => {
    setFormError(undefined);
    startTransition(async () => {
      let res: Awaited<ReturnType<typeof placeOrderAction>>;
      try {
        res = await placeOrderAction({
          ...form,
          coupon: pricing?.coupon?.ok ? (coupon ?? "") : "",
          items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
          // Transfer details only travel with orders that need them.
          transferChannel: plan.needsTransfer && form.transferChannel ? form.transferChannel : undefined,
          senderPhone: plan.needsTransfer ? form.senderPhone : "",
          receiptToken: plan.needsTransfer ? form.receiptToken : "",
        });
      } catch {
        // Network or server failure: the order may or may not have been saved, so never leave the customer guessing.
        setFormError("orderFailed");
        return;
      }
      if (res.ok) {
        setDone(true);
        const dest = res.redirectUrl;
        clear();
        if (dest) window.location.assign(dest);
        else router.push(`/checkout/confirmation/${res.number}`);
        return;
      }
      if (res.code === "invalid" && res.errors) {
        setErrors(res.errors);
        const bad = (["info", "address", "delivery", "payment"] as const).findIndex((k) => Object.keys(res.errors!).some((f) => f in (schemas[k] as unknown as { shape: object }).shape));
        setStep(Math.max(0, bad));
        return;
      }
      if (res.code === "proof") {
        setErrors(res.errors ?? {});
        setFormError("orderProof");
        setStep(STEPS.indexOf("payment"));
        return;
      }
      setFormError(res.code === "stock" ? "orderStock" : res.code === "coupon" ? "orderCoupon" : res.code === "payment" ? "orderPayment" : res.code === "rateLimited" ? "rateLimited" : "orderEmpty");
    });
  };

  if (done) return <Container className="grid min-h-[50vh] place-items-center"><p className="font-display text-3xl text-brand" role="status">{t("placing")}</p></Container>;

  if (!ready) return <Container className="py-16"><div className="h-72 animate-pulse bg-line/40" aria-busy="true" /></Container>;

  if (rows.length === 0)
    return (
      <Container className="grid place-items-center gap-5 py-28 text-center">
        <ShoppingBag size={40} strokeWidth={1} className="text-accent" aria-hidden />
        <h1 className="font-display text-4xl text-brand">{t("emptyTitle")}</h1>
        <p className="max-w-sm text-muted">{t("emptyBody")}</p>
        <Link href="/shop" className={buttonClasses("primary")}>{t("continueShopping")}</Link>
      </Container>
    );

  return (
    <Container className="py-10 lg:py-14">
      <ol className="mb-10 flex flex-wrap items-center gap-x-2 gap-y-3 text-xs uppercase tracking-[0.15em]" aria-label={t("progress")}>
        {STEPS.map((s, i) => (
          <li key={s} className="flex items-center gap-2" aria-current={i === step ? "step" : undefined}>
            <button type="button" disabled={i >= step} onClick={() => goTo(i)} className={cn("flex items-center gap-2 py-1 disabled:cursor-default", i === step ? "text-brand" : i < step ? "text-foreground hover:text-accent" : "text-muted")}>
              <span className={cn("grid size-6 place-items-center rounded-full border text-[0.7rem]", i === step ? "border-brand bg-brand text-brand-contrast" : i < step ? "border-accent text-accent" : "border-line")}>{i < step ? <Check size={12} strokeWidth={2.5} /> : i + 1}</span>
              <span className="max-sm:sr-only">{t(`steps.${s}`)}</span>
            </button>
            {i < STEPS.length - 1 && <span aria-hidden className="mx-1 h-px w-5 bg-line sm:w-8" />}
          </li>
        ))}
      </ol>

      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-16">
        <section>
          <h1 ref={heading} tabIndex={-1} className="mb-8 font-display text-4xl text-brand outline-none sm:text-5xl">{t(`steps.${key}`)}</h1>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={key} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
              {key === "info" && <InfoStep form={form} errors={errors} set={set} signedIn={!!customer} />}
              {key === "address" && (
                <AddressStep form={form} errors={errors} set={set} saved={addresses} signedIn={!!customer}
                  onPick={(a) => setForm((f) => ({ ...f, phone: a.phone, governorate: a.governorate, city: a.city, line1: a.line1, line2: a.line2 ?? "", notes: a.notes ?? "" }))} />
              )}
              {key === "delivery" && <DeliveryStep form={form} set={set} options={pricing?.shippingOptions ?? null} freeThresholdMinor={pricing?.freeShippingThresholdMinor ?? FREE_SHIPPING_THRESHOLD_MINOR} window={pricing?.deliveryWindow ?? { minDays: 2, maxDays: 5 }} />}
              {key === "payment" && <PaymentStep form={form} set={set} errors={errors} methods={methods} settings={payments} plan={plan} totalMinor={pricing?.totalMinor ?? 0} />}
              {key === "review" && <ReviewStep form={form} plan={plan} onEdit={(k) => setStep(STEPS.indexOf(k))} />}
            </motion.div>
          </AnimatePresence>

          {errors.paymentMethod && key === "payment" && <p role="alert" className="mt-3 text-sm text-brand">{t("choosePayment")}</p>}
          {formError && <div className="mt-6 space-y-3"><FormError error={formError} />{(formError === "orderStock" || formError === "orderCoupon") && <Link href="/cart" className="text-sm text-brand underline underline-offset-4">{t("backToCart")}</Link>}</div>}
          {key === "review" && blocked && <p role="alert" className="mt-6 text-sm text-brand">{t("reviewIssues")} <Link href="/cart" className="underline underline-offset-4">{t("backToCart")}</Link></p>}

          <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
            {step > 0 ? <button type="button" onClick={() => setStep(step - 1)} className="text-sm uppercase tracking-[0.18em] text-accent hover:text-foreground"><span aria-hidden className="inline-block rtl:rotate-180">←</span> {t("back")}</button> : <Link href="/cart" className="text-sm uppercase tracking-[0.18em] text-accent hover:text-foreground"><span aria-hidden className="inline-block rtl:rotate-180">←</span> {t("backToCart")}</Link>}
            {key === "review" ? (
              <Button onClick={place} disabled={pending || blocked} aria-busy={pending} className="min-w-56">{pending ? t("placing") : t("placeOrder")}</Button>
            ) : (
              <Button onClick={next}>{t("continue")}</Button>
            )}
          </div>
        </section>
        <OrderSummary plan={plan} paymentMethod={form.paymentMethod} />
      </div>
    </Container>
  );
}
