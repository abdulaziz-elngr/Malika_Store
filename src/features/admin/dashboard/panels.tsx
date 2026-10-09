import { AlertTriangle, CheckCircle2, ClipboardList, PackageSearch, UsersRound } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Card, CardHeader, EmptyState, TableWrap, Td, Th } from "@/components/admin/primitives";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { formatMoney, pick, type Loc } from "@/lib/localize";
import type { Dashboard } from "@/server/services/analytics";
import { OrderStatusBadge } from "./status-badge";

type NonNull<T> = Exclude<T, null | undefined>;
const num = (n: number, loc: Loc) => new Intl.NumberFormat(loc === "ar" ? "ar-EG" : "en-GB").format(n);

export async function AttentionStrip({ attention, stock }: { attention: Dashboard["attention"]; stock: Dashboard["stock"] }) {
  const t = await getTranslations("admin.dashboard.attention");
  const items = [
    attention && attention.pending > 0 && { key: "pending", text: t("pending", { count: attention.pending }) },
    attention && attention.failedPayments > 0 && { key: "failed", text: t("failed", { count: attention.failedPayments }) },
    stock && stock.lowVariants > 0 && { key: "low", text: t("low", { count: stock.lowVariants }) },
    stock && stock.outVariants > 0 && { key: "out", text: t("out", { count: stock.outVariants }) },
  ].filter((x): x is { key: string; text: string } => !!x);
  return (
    <Card aria-labelledby="attn" className="flex flex-wrap items-center gap-x-8 gap-y-3 px-5 py-4">
      <h2 id="attn" className="flex items-center gap-2 text-[0.72rem] font-medium uppercase tracking-[0.22em] text-accent">
        {items.length ? <AlertTriangle size={15} aria-hidden /> : <CheckCircle2 size={15} aria-hidden />}{t("title")}
      </h2>
      {items.length === 0 ? <p className="text-sm text-muted">{t("allClear")}</p> : (
        <ul className="flex flex-wrap gap-x-8 gap-y-2 text-sm">{items.map((i) => <li key={i.key} className="flex items-center gap-2"><span aria-hidden className="size-1.5 bg-brand" />{i.text}</li>)}</ul>
      )}
    </Card>
  );
}

export async function RecentOrders({ rows }: { rows: NonNull<Dashboard["recentOrders"]> }) {
  const [t, loc] = await Promise.all([getTranslations("admin.dashboard.lists"), getLocale() as Promise<Loc>]);
  return (
    <Card aria-labelledby="ro" className="min-w-0">
      <CardHeader id="ro" title={t("recentOrders")} />
      {rows.length === 0 ? <EmptyState icon={<ClipboardList size={28} strokeWidth={1.2} />} title={t("noOrders")} body={t("noOrdersBody")} /> : (
        <TableWrap>
          <thead><tr className="border-b border-line"><Th>{t("order")}</Th><Th>{t("customer")}</Th><Th>{t("status")}</Th><Th>{t("date")}</Th><Th className="text-end">{t("total")}</Th></tr></thead>
          <tbody className="divide-y divide-line">
            {rows.map((o) => (
              <tr key={o.id}>
                <Td className="font-medium" dir="ltr"><span className="block text-start">{o.number}</span></Td>
                <Td className="max-w-40 truncate">{o.name}</Td>
                <Td><OrderStatusBadge status={o.status} /></Td>
                <Td className="whitespace-nowrap text-muted">{formatDate(o.createdAt, loc, true)}</Td>
                <Td className="text-end tabular-nums">{formatMoney(o.totalMinor, loc)}</Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </Card>
  );
}

export async function RecentCustomers({ rows }: { rows: NonNull<NonNull<Dashboard["customers"]>["recent"]> }) {
  const [t, loc] = await Promise.all([getTranslations("admin.dashboard.lists"), getLocale() as Promise<Loc>]);
  return (
    <Card aria-labelledby="rc" className="min-w-0">
      <CardHeader id="rc" title={t("recentCustomers")} />
      {rows.length === 0 ? <EmptyState icon={<UsersRound size={28} strokeWidth={1.2} />} title={t("noCustomers")} /> : (
        <ul className="divide-y divide-line">
          {rows.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
              <div className="min-w-0"><p className="truncate font-medium">{c.name}</p><p className="truncate text-xs text-muted" dir="ltr">{c.email}</p></div>
              <div className="shrink-0 text-end text-xs text-muted"><p>{t("ordersCount", { count: c.orders })}</p><p>{formatDate(c.createdAt, loc)}</p></div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export async function TopProducts({ rows }: { rows: NonNull<Dashboard["topProducts"]> }) {
  const [t, loc] = await Promise.all([getTranslations("admin.dashboard.lists"), getLocale() as Promise<Loc>]);
  const max = Math.max(...rows.map((r) => r.units), 1);
  return (
    <Card aria-labelledby="tp" className="min-w-0">
      <CardHeader id="tp" title={t("topProducts")} />
      {rows.length === 0 ? <EmptyState icon={<PackageSearch size={28} strokeWidth={1.2} />} title={t("noTop")} body={t("noTopBody")} /> : (
        <ol className="divide-y divide-line">
          {rows.map((p, i) => (
            <li key={p.slug} className="grid gap-2 px-5 py-3.5">
              <div className="flex items-baseline justify-between gap-3">
                <p className="min-w-0 truncate"><span className="me-3 text-accent tabular-nums">{num(i + 1, loc)}</span>{pick(loc, p.nameAr, p.nameEn)}</p>
                <p className="shrink-0 text-sm tabular-nums text-muted">{formatMoney(Number(p.revenue), loc)}</p>
              </div>
              <div className="flex items-center gap-3"><div className="h-1 flex-1 bg-line"><div className="h-full bg-brand" style={{ width: `${(p.units / max) * 100}%` }} /></div><span className="w-20 text-end text-xs text-muted">{t("unitsSold", { count: num(p.units, loc) })}</span></div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

export async function TopCategories({ rows }: { rows: NonNull<Dashboard["topCategories"]> }) {
  const [t, loc] = await Promise.all([getTranslations("admin.dashboard.lists"), getLocale() as Promise<Loc>]);
  const total = rows.reduce((s, r) => s + Number(r.revenue), 0) || 1;
  return (
    <Card aria-labelledby="tc" className="min-w-0">
      <CardHeader id="tc" title={t("topCategories")} />
      {rows.length === 0 ? <EmptyState icon={<PackageSearch size={28} strokeWidth={1.2} />} title={t("noTop")} body={t("noTopBody")} /> : (
        <ul className="divide-y divide-line">
          {rows.map((c) => {
            const share = (Number(c.revenue) / total) * 100;
            return (
              <li key={c.id} className="grid gap-2 px-5 py-3.5">
                <div className="flex items-baseline justify-between gap-3"><p className="truncate">{pick(loc, c.nameAr, c.nameEn)}</p><p className="shrink-0 text-sm tabular-nums text-muted">{formatMoney(Number(c.revenue), loc)}</p></div>
                <div className="flex items-center gap-3"><div className="h-1 flex-1 bg-line"><div className="h-full bg-accent" style={{ width: `${share}%` }} /></div><span className="w-12 text-end text-xs tabular-nums text-muted">{new Intl.NumberFormat(loc === "ar" ? "ar-EG" : "en-GB", { style: "percent", maximumFractionDigits: 0 }).format(share / 100)}</span></div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

export async function LowStock({ stock }: { stock: NonNull<Dashboard["stock"]> }) {
  const [t, loc] = await Promise.all([getTranslations("admin.dashboard.lists"), getLocale() as Promise<Loc>]);
  return (
    <Card aria-labelledby="ls" className="min-w-0">
      <CardHeader id="ls" title={t("lowStock")} />
      {stock.products.length === 0 ? <EmptyState icon={<CheckCircle2 size={28} strokeWidth={1.2} />} title={t("stockOk")} body={t("stockOkBody")} /> : (
        <ul className="divide-y divide-line">
          {stock.products.map((p) => (
            <li key={p.slug} className="px-5 py-3.5">
              <p className="mb-2 truncate font-medium">{pick(loc, p.nameAr, p.nameEn)}</p>
              <ul className="flex flex-wrap gap-2">
                {p.variants.map((v, i) => (
                  <li key={i} className={cn("border px-2 py-1 text-xs", v.stock === 0 ? "border-brand/50 bg-brand/5 text-brand" : "border-line text-muted")}>
                    {t("variant", { size: v.size, color: pick(loc, v.colorAr, v.colorEn) })} · <span className="tabular-nums">{v.stock === 0 ? t("soldOut") : t("stockLeft", { count: num(v.stock, loc) })}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
