import { ScrollText } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { Badge, Card, EmptyState, PageHeader, TableWrap, Td, Th } from "@/components/admin/primitives";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import { AuditDetails } from "@/features/admin/audit/audit-details";
import { Pagination } from "@/features/storefront/shop/pagination";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatDate } from "@/lib/format";
import { type Loc } from "@/lib/localize";
import { requirePermission } from "@/server/auth/rbac";
import { listAuditLogs } from "@/server/services/audit";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Audit log — MALIKA Admin" };
const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

export default async function AuditPage({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  setRequestLocale((await params).locale);
  await requirePermission("audit:view");
  const sp = await searchParams;
  const q = one(sp.q).slice(0, 80), entity = one(sp.entity).slice(0, 40);
  const page = Math.min(500, Math.max(1, Number.parseInt(one(sp.page), 10) || 1));
  const [t, loc, data] = await Promise.all([getTranslations("admin.audit"), getLocale() as Promise<Loc>, listAuditLogs({ q, entity: entity || undefined, page })]);
  const query: Record<string, string> = {};
  if (q) query.q = q;
  if (entity) query.entity = entity;

  return (
    <div className="space-y-8">
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("intro")} />
      <form method="get" role="search" className="flex flex-wrap items-end gap-3">
        <label className="grid min-w-56 flex-1 gap-1.5 text-xs uppercase tracking-[0.18em] text-accent">{t("searchLabel")}
          <input type="search" name="q" defaultValue={q} maxLength={80} placeholder={t("searchPlaceholder")} className={`${inputClass} h-11 text-sm normal-case tracking-normal text-foreground`} />
        </label>
        <label className="grid gap-1.5 text-xs uppercase tracking-[0.18em] text-accent">{t("entity")}
          <select name="entity" defaultValue={entity} className={`${inputClass} h-11 min-w-44 text-sm normal-case tracking-normal text-foreground`}>
            <option value="">{t("allEntities")}</option>
            {data.entities.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </label>
        <Button type="submit" className="min-h-11">{t("apply")}</Button>
        {(q || entity) && <Link href="/admin/audit" className="inline-flex min-h-11 items-center px-3 text-sm text-muted underline-offset-4 hover:underline">{t("reset")}</Link>}
      </form>

      <Card>
        <div className="border-b border-line px-5 py-3 text-sm text-muted" aria-live="polite">{t("results", { count: data.total })}</div>
        {data.rows.length === 0 ? <EmptyState icon={<ScrollText size={30} strokeWidth={1.2} />} title={t("empty")} body={t("emptyBody")} /> : (
          <TableWrap className="">
            <thead><tr className="border-b border-line"><Th>{t("cols.when")}</Th><Th>{t("cols.who")}</Th><Th>{t("cols.action")}</Th><Th>{t("cols.summary")}</Th><Th><span className="sr-only">{t("details")}</span></Th></tr></thead>
            <tbody className="divide-y divide-line">
              {data.rows.map((r) => (
                <tr key={r.id}>
                  <Td className="whitespace-nowrap text-muted">{formatDate(r.createdAt, loc, true)}</Td>
                  <Td><p className="whitespace-nowrap">{r.userName}</p>{r.userRole && <p className="text-xs text-muted">{r.userRole}</p>}</Td>
                  <Td><Badge dir="ltr">{r.action}</Badge></Td>
                  <Td className="max-w-md">{r.summary}</Td>
                  <Td className="text-end"><AuditDetails summary={r.summary} who={r.userName} at={r.createdAt.toISOString()} ip={r.ip} before={(r.before as Record<string, unknown> | null) ?? null} after={(r.after as Record<string, unknown> | null) ?? null} /></Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Card>
      <div className="-mt-8"><Pagination page={page} pages={data.pages} pathname="/admin/audit" query={query} /></div>
    </div>
  );
}
