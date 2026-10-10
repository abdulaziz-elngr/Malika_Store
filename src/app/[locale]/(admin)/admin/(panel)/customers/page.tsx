import { UsersRound } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/admin/primitives";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { CustomersManager } from "@/features/admin/customers/customers-manager";
import { Pagination } from "@/features/storefront/shop/pagination";
import { requirePermission } from "@/server/auth/rbac";
import { listCustomersAdmin } from "@/server/services/admin-sales";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Customers — MALIKA Admin" };
const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

export default async function CustomersPage({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  setRequestLocale((await params).locale);
  await requirePermission("customers:view");
  const sp = await searchParams;
  const q = one(sp.q).slice(0, 80);
  const page = Math.min(500, Math.max(1, Number.parseInt(one(sp.page), 10) || 1));

  const [t, f, data] = await Promise.all([getTranslations("admin.customers"), getTranslations("admin.form"), listCustomersAdmin({ q: q || undefined, page })]);

  const query: Record<string, string> = {};
  if (q) query.q = q;

  return (
    <div className="space-y-8">
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("intro")} />

      <form method="get" role="search" className="flex flex-wrap items-end gap-3">
        <label className="grid min-w-56 flex-1 gap-1.5 text-xs uppercase tracking-[0.18em] text-accent">
          {t("searchLabel")}
          <input type="search" name="q" defaultValue={q} maxLength={80} placeholder={f("searchPlaceholder")} className={`${inputClass} h-11 text-sm normal-case tracking-normal text-foreground`} />
        </label>
        <Button type="submit" className="min-h-11">
          {f("apply")}
        </Button>
        {query.q ? (
          <Link href="/admin/customers" className="inline-flex min-h-11 items-center px-3 text-sm text-muted underline-offset-4 hover:underline">
            {f("reset")}
          </Link>
        ) : null}
      </form>

      <CustomersManager
        rows={data.rows.map((r) => ({
          id: r.c.id,
          name: r.c.name,
          email: r.c.email,
          phone: r.c.phone,
          orderCount: r.orderCount,
          totalSpent: r.totalSpent,
          lastOrderAt: r.lastOrderAt,
        }))}
        emptyIcon={<UsersRound size={30} strokeWidth={1.2} />}
      />
      <div className="-mt-8">
        <Pagination page={page} pages={data.pages} pathname="/admin/customers" query={query} />
      </div>
    </div>
  );
}
