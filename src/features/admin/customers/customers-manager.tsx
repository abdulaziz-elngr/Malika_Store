"use client";

import { UsersRound } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Card, CardHeader, EmptyState, TableWrap, Td, Th } from "@/components/admin/primitives";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/format";
import { formatMoney, type Loc } from "@/lib/localize";

export type CustomerListItem = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: Date | null;
};

type Props = { rows: CustomerListItem[]; emptyIcon?: React.ReactNode };

/** Customer list: spend and last-order columns link straight into the profile. */
export function CustomersManager({ rows, emptyIcon }: Props) {
  const t = useTranslations("admin.customers");
  const loc = useLocale() as Loc;

  return (
    <Card>
      <CardHeader title={t("listTitle")} />
      {rows.length === 0 ? (
        <EmptyState icon={emptyIcon ?? <UsersRound size={30} strokeWidth={1.2} />} title={t("empty")} body={t("emptyBody")} />
      ) : (
        <TableWrap>
          <thead>
            <tr className="border-b border-line">
              <Th>{t("cols.customer")}</Th>
              <Th dir="ltr" className="text-start">
                {t("cols.email")}
              </Th>
              <Th>{t("cols.phone")}</Th>
              <Th className="text-end">{t("cols.orders")}</Th>
              <Th className="text-end">{t("cols.spent")}</Th>
              <Th>{t("cols.lastOrder")}</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((c) => (
              <tr key={c.id} className="hover:bg-brand/5">
                <Td>
                  <Link href={`/admin/customers/${c.id}`} aria-label={t("open", { name: c.name })} className="font-medium hover:text-brand">
                    {c.name}
                  </Link>
                </Td>
                <Td>
                  <span dir="ltr" className="block text-start break-all text-muted">
                    {c.email}
                  </span>
                </Td>
                <Td>
                  {c.phone ? (
                    <span dir="ltr" className="block text-start text-muted">
                      {c.phone}
                    </span>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </Td>
                <Td className="text-end tabular-nums">{t("ordersCount", { count: c.orderCount })}</Td>
                <Td className="text-end tabular-nums">{formatMoney(c.totalSpent, loc)}</Td>
                <Td className="whitespace-nowrap text-muted">{c.lastOrderAt ? formatDate(c.lastOrderAt, loc) : <span className="text-muted">—</span>}</Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </Card>
  );
}
