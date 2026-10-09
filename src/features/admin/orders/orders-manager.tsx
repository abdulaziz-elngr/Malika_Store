"use client";

import { ClipboardList } from "lucide-react";
import { useActionState, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Badge, Card, CardHeader, EmptyState, TableWrap, Td, Th } from "@/components/admin/primitives";
import { useFieldError } from "@/components/ui/field";
import { Link, useRouter } from "@/i18n/navigation";
import { formatDate } from "@/lib/format";
import { formatMoney, type Loc } from "@/lib/localize";
import { changeOrderStatusAction } from "@/server/actions/admin-sales";
import type { ActionState } from "@/server/actions/types";
import type { OrderStatus } from "@/db/schema";
import { ORDER_STATUSES, PAYMENT_TONE, type PaymentStatus } from "./tones";

export type OrderListItem = {
  id: string;
  seq: number;
  name: string;
  email: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  totalMinor: number;
  createdAt: Date;
  itemCount: number;
};

type Props = {
  rows: OrderListItem[];
  /** Canonical ORDER_TRANSITIONS map, handed down from the server so the UI and the action never disagree. */
  transitions: Record<OrderStatus, OrderStatus[]>;
  canEdit: boolean;
  emptyIcon?: React.ReactNode;
};

/** Order list: search results with an inline status switch that only offers legal transitions. */
export function OrdersManager({ rows, transitions, canEdit, emptyIcon }: Props) {
  const t = useTranslations("admin.orders");
  const loc = useLocale() as Loc;
  const pay = useTranslations("orders.payment");

  return (
    <Card>
      <CardHeader title={t("listTitle")} />
      {rows.length === 0 ? (
        <EmptyState icon={emptyIcon ?? <ClipboardList size={30} strokeWidth={1.2} />} title={t("empty")} body={t("emptyBody")} />
      ) : (
        <TableWrap>
          <thead>
            <tr className="border-b border-line">
              <Th>{t("cols.order")}</Th>
              <Th>{t("cols.customer")}</Th>
              <Th>{t("cols.date")}</Th>
              <Th className="text-end">{t("cols.total")}</Th>
              <Th>{t("cols.payment")}</Th>
              <Th>{t("cols.status")}</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((o) => (
              <tr key={o.id} className="hover:bg-brand/5">
                <Td>
                  <Link href={`/admin/orders/${o.id}`} aria-label={t("openOrder", { number: `MLK-${o.seq}` })} className="font-medium hover:text-brand">
                    <span dir="ltr">MLK-{o.seq}</span>
                  </Link>
                  <p className="text-xs text-muted">{t("itemCount", { count: o.itemCount })}</p>
                </Td>
                <Td>
                  <p className="truncate font-medium">{o.name}</p>
                  <p className="truncate text-xs text-muted" dir="ltr">
                    {o.email}
                  </p>
                </Td>
                <Td className="whitespace-nowrap text-muted">{formatDate(o.createdAt, loc, true)}</Td>
                <Td className="text-end tabular-nums">{formatMoney(o.totalMinor, loc)}</Td>
                <Td>
                  <Badge tone={PAYMENT_TONE[o.paymentStatus] ?? "neutral"}>{pay(o.paymentStatus)}</Badge>
                </Td>
                <Td>
                  {canEdit ? <StatusSelect order={o} transitions={transitions} /> : <ReadonlyStatus status={o.status} />}
                </Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </Card>
  );
}

/** Read-only status badge for roles that may view orders but not edit them. */
function ReadonlyStatus({ status }: { status: OrderStatus }) {
  const st = useTranslations("orders.status");
  return <Badge tone="neutral">{st(status)}</Badge>;
}

/** One row's status form: illegal transitions are rendered as disabled options, then auto-submitted. */
function StatusSelect({ order, transitions }: { order: OrderListItem; transitions: Record<OrderStatus, OrderStatus[]> }) {
  const st = useTranslations("orders.status");
  const t = useTranslations("admin.orders");
  const router = useRouter();
  const [state, action, pending] = useActionState(changeOrderStatusAction, {} as ActionState);
  const error = useFieldError()(state.errors?.status);

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state, router]);

  const allowed = transitions[order.status] ?? [];

  return (
    <form action={action} className="m-0">
      <input type="hidden" name="orderId" value={order.id} />
      <select
        key={`${order.status}${error ? `:${error}` : ""}`}
        name="status"
        defaultValue={order.status}
        disabled={pending || allowed.length === 0}
        aria-label={t("statusAria", { number: `MLK-${order.seq}` })}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="h-9 border border-line bg-surface px-2 text-xs text-foreground outline-none focus:border-brand disabled:opacity-60"
      >
        {ORDER_STATUSES.map((s) => (
          <option key={s} value={s} disabled={s === order.status || !allowed.includes(s)}>
            {st(s)}
          </option>
        ))}
      </select>
      {error ? (
        <p role="alert" className="mt-1 max-w-52 text-xs text-brand">
          {error}
        </p>
      ) : null}
    </form>
  );
}
