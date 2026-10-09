"use client";

import { useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Card, CardHeader } from "@/components/admin/primitives";
import { Button } from "@/components/ui/button";
import { Field, FormError, inputClass } from "@/components/ui/field";
import { useRouter } from "@/i18n/navigation";
import { changeOrderStatusAction, changePaymentStatusAction, setOrderNoteAction } from "@/server/actions/admin-sales";
import type { ActionState } from "@/server/actions/types";
import type { OrderStatus } from "@/db/schema";
import { ORDER_STATUSES, PAYMENT_STATUSES, type PaymentStatus } from "./tones";

type OrderMini = {
  id: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  internalNote: string | null;
};

type Props = {
  order: OrderMini;
  /** Canonical ORDER_TRANSITIONS map — only legal next states stay selectable. */
  transitions: Record<OrderStatus, OrderStatus[]>;
  canEdit: boolean;
};

/** The three write forms of an order: status (with history note), payment and the internal note. */
export function OrderControls({ order, transitions, canEdit }: Props) {
  const t = useTranslations("admin.order");
  const f = useTranslations("admin.form");
  const pay = useTranslations("orders.payment");
  const st = useTranslations("orders.status");
  const router = useRouter();

  const [statusState, statusAction, statusPending] = useActionState(changeOrderStatusAction, {} as ActionState);
  const [payState, payAction, payPending] = useActionState(changePaymentStatusAction, {} as ActionState);
  const [noteState, noteAction, notePending] = useActionState(setOrderNoteAction, {} as ActionState);

  useEffect(() => {
    if (statusState.ok || payState.ok || noteState.ok) router.refresh();
  }, [statusState, payState, noteState, router]);

  if (!canEdit) {
    return (
      <Card>
        <CardHeader title={t("noteSection")} />
        <div className="p-5 text-sm">
          {order.internalNote ? <p className="whitespace-pre-wrap text-muted">{order.internalNote}</p> : <p className="text-muted">{t("readNote")}</p>}
        </div>
      </Card>
    );
  }

  const allowed = transitions[order.status] ?? [];
  const statusErr = statusState.errors?.status;
  const payErr = payState.errors?.paymentStatus;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card>
        <CardHeader title={t("statusSection")} />
        <form key={order.status} action={statusAction} className="space-y-4 p-5" noValidate aria-busy={statusPending}>
          <input type="hidden" name="orderId" value={order.id} />
          <Field label={t("statusLabel")} error={statusErr}>
            {(p) => (
              <select {...p} key={`${order.status}${statusErr ? `:${statusErr}` : ""}`} name="status" defaultValue={order.status} disabled={statusPending || allowed.length === 0} className={inputClass}>
                {ORDER_STATUSES.map((s) => (
                  <option key={s} value={s} disabled={s === order.status || !allowed.includes(s)}>
                    {st(s)}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label={t("statusNote")}>
            {(p) => <input {...p} name="note" maxLength={300} placeholder={t("notePlaceholder")} className={inputClass} />}
          </Field>
          <p role="status" aria-live="polite" className="text-sm text-sage-700 dark:text-sage-200">
            {statusState.ok ? f("saved") : ""}
          </p>
          <Button type="submit" disabled={statusPending} aria-busy={statusPending} className="min-h-11 w-full">
            {statusPending ? f("saving") : t("update")}
          </Button>
        </form>
      </Card>

      <Card>
        <CardHeader title={t("paymentSection")} />
        <form action={payAction} className="space-y-4 p-5" noValidate aria-busy={payPending}>
          <input type="hidden" name="orderId" value={order.id} />
          <FormError error={payState.errors?.form} />
          <Field label={t("paymentLabel")} error={payErr}>
            {(p) => (
              <select {...p} key={`${order.paymentStatus}${payErr ? `:${payErr}` : ""}`} name="paymentStatus" defaultValue={order.paymentStatus} disabled={payPending} className={inputClass}>
                {PAYMENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {pay(s)}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <p role="status" aria-live="polite" className="text-sm text-sage-700 dark:text-sage-200">
            {payState.ok ? f("saved") : ""}
          </p>
          <Button type="submit" disabled={payPending} aria-busy={payPending} className="min-h-11 w-full">
            {payPending ? f("saving") : t("update")}
          </Button>
        </form>
      </Card>

      <Card>
        <CardHeader title={t("noteSection")} />
        <form action={noteAction} className="space-y-4 p-5" noValidate aria-busy={notePending}>
          <input type="hidden" name="orderId" value={order.id} />
          <FormError error={noteState.errors?.form} />
          <Field label={t("noteLabel")} hint={t("noteHint")} error={noteState.errors?.note}>
            {(p) => (
              <textarea
                {...p}
                name="note"
                defaultValue={order.internalNote ?? ""}
                maxLength={2000}
                rows={5}
                placeholder={t("notePlaceholder")}
                className={`${inputClass} h-auto py-3`}
              />
            )}
          </Field>
          <p role="status" aria-live="polite" className="text-sm text-sage-700 dark:text-sage-200">
            {noteState.ok ? f("saved") : ""}
          </p>
          <Button type="submit" disabled={notePending} aria-busy={notePending} className="min-h-11 w-full">
            {notePending ? f("saving") : f("save")}
          </Button>
        </form>
      </Card>
    </div>
  );
}
