import { getLocale, getTranslations } from "next-intl/server";
import { Badge, Card, CardHeader, TableWrap, Td, Th } from "@/components/admin/primitives";
import { OrderStatusBadge } from "@/features/admin/dashboard/status-badge";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/format";
import { formatMoney, type Loc } from "@/lib/localize";
import type { CustomerAdmin } from "@/server/services/admin-sales";

/** Read-only profile: contact, saved addresses and the customer's orders. */
export async function CustomerProfile({ customer, canViewOrders }: { customer: CustomerAdmin; canViewOrders: boolean }) {
  const [t, o, loc] = await Promise.all([getTranslations("admin.customer"), getTranslations("orders"), getLocale() as Promise<Loc>]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title={t("contact")} />
          <dl className="divide-y divide-line text-sm">
            <InfoRow label={t("name")} value={customer.name} />
            <InfoRow label={t("email")} value={customer.email} ltr />
            <InfoRow label={o("phone")} value={customer.phone ?? "—"} ltr={!!customer.phone} />
            <InfoRow label={t("joined")} value={formatDate(customer.createdAt, loc)} />
            <InfoRow label={t("lastLogin")} value={customer.lastLoginAt ? formatDate(customer.lastLoginAt, loc, true) : t("never")} />
          </dl>
        </Card>

        <Card>
          <CardHeader title={t("addresses")} />
          {customer.addresses.length === 0 ? (
            <p className="p-5 text-sm text-muted">{t("noAddresses")}</p>
          ) : (
            <ul className="divide-y divide-line">
              {customer.addresses.map((a) => (
                <li key={a.id} className="space-y-1 p-5 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{a.recipient}</p>
                    <span className="flex flex-wrap gap-1.5">
                      {a.label ? <Badge tone="neutral">{a.label}</Badge> : null}
                      {a.isDefault ? <Badge tone="brand">{t("default")}</Badge> : null}
                    </span>
                  </div>
                  <p dir="ltr" className="text-start text-muted">
                    {a.phone}
                  </p>
                  <p className="text-muted">
                    {a.line1}
                    {a.line2 ? `, ${a.line2}` : ""}
                  </p>
                  <p className="text-muted">
                    {a.city} · {a.governorate}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader title={t("ordersTitle")} />
        {customer.orders.length === 0 ? (
          <p className="p-5 text-sm text-muted">{t("noOrders")}</p>
        ) : (
          <TableWrap>
            <thead>
              <tr className="border-b border-line">
                <Th>{t("colOrder")}</Th>
                <Th>{t("colDate")}</Th>
                <Th>{t("colStatus")}</Th>
                <Th className="text-end">{t("colTotal")}</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {customer.orders.map((o) => (
                <tr key={o.id} className="hover:bg-brand/5">
                  <Td>
                    {canViewOrders ? (
                      <Link href={`/admin/orders/${o.id}`} aria-label={t("openOrder", { number: `MLK-${o.seq}` })} className="font-medium hover:text-brand">
                        <span dir="ltr">MLK-{o.seq}</span>
                      </Link>
                    ) : (
                      <span dir="ltr">MLK-{o.seq}</span>
                    )}
                  </Td>
                  <Td className="whitespace-nowrap text-muted">{formatDate(o.createdAt, loc, true)}</Td>
                  <Td>
                    <OrderStatusBadge status={o.status} />
                  </Td>
                  <Td className="text-end tabular-nums">{formatMoney(o.totalMinor, loc)}</Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Card>
    </div>
  );
}

function InfoRow({ label, value, ltr }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 py-3">
      <dt className="text-xs uppercase tracking-[0.15em] text-accent">{label}</dt>
      <dd className="text-end text-muted" dir={ltr ? "ltr" : undefined}>
        {value}
      </dd>
    </div>
  );
}
