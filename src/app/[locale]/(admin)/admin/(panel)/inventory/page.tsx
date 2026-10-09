import { Boxes } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/admin/primitives";
import { inputClass } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { InventoryManager } from "@/features/admin/inventory/inventory-manager";
import { Pagination } from "@/features/storefront/shop/pagination";
import { can, requirePermission } from "@/server/auth/rbac";
import { formatMoney, type Loc } from "@/lib/localize";
import { getLowStockThreshold } from "@/server/services/settings";
import { inventoryStats, listVariantsAdmin } from "@/server/services/admin-catalog";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Inventory — MALIKA Admin" };
const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

export default async function InventoryPage({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  setRequestLocale((await params).locale);
  const admin = await requirePermission("inventory:view");
  const sp = await searchParams;
  const q = one(sp.q).slice(0, 80);
  const level = ["low", "out"].includes(one(sp.level)) ? one(sp.level) : "";
  const page = Math.min(500, Math.max(1, Number.parseInt(one(sp.page), 10) || 1));
  const threshold = await getLowStockThreshold();

  const [t, loc, stats, data] = await Promise.all([
    getTranslations("admin.inventory"),
    getLocale() as Promise<Loc>,
    inventoryStats(threshold),
    listVariantsAdmin({ q: q || undefined, level: level || undefined, page, threshold }),
  ]);

  const query: Record<string, string> = {};
  if (q) query.q = q;
  if (level) query.level = level;

  const cards = [
    { label: t("stats.units"), value: String(stats.units) },
    { label: t("stats.value"), value: formatMoney(stats.valueMinor, loc) },
    { label: t("stats.low"), value: String(stats.low), accent: stats.low > 0 },
    { label: t("stats.out"), value: String(stats.out), accent: stats.out > 0 },
  ];

  return (
    <div className="space-y-8">
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("intro")} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="border border-line bg-surface p-5">
            <p className="text-[0.72rem] uppercase tracking-[0.2em] text-accent">{c.label}</p>
            <p className={`mt-2 font-display text-3xl ${c.accent ? "text-brand" : "text-foreground"}`}>{c.value}</p>
          </div>
        ))}
      </div>

      <form method="get" role="search" className="flex flex-wrap items-end gap-3">
        <label className="grid min-w-56 flex-1 gap-1.5 text-xs uppercase tracking-[0.18em] text-accent">
          {t("searchLabel")}
          <input type="search" name="q" defaultValue={q} maxLength={80} placeholder={t("searchPlaceholder")} className={`${inputClass} h-11 text-sm normal-case tracking-normal text-foreground`} />
        </label>
        <label className="grid gap-1.5 text-xs uppercase tracking-[0.18em] text-accent">
          {t("level")}
          <select name="level" defaultValue={level} className={`${inputClass} h-11 min-w-44 text-sm normal-case tracking-normal text-foreground`}>
            <option value="">{t("allLevels")}</option>
            <option value="low">{t("levels.low", { threshold })}</option>
            <option value="out">{t("levels.out")}</option>
          </select>
        </label>
        <Button type="submit" className="min-h-11">
          {t("apply")}
        </Button>
        {query.q || query.level ? (
          <Link href="/admin/inventory" className="inline-flex min-h-11 items-center px-3 text-sm text-muted underline-offset-4 hover:underline">
            {t("reset")}
          </Link>
        ) : null}
      </form>

      <InventoryManager
        rows={data.rows}
        threshold={threshold}
        canEdit={can(admin, "inventory:edit")}
        emptyIcon={<Boxes size={30} strokeWidth={1.2} />}
      />
      <div className="-mt-8">
        <Pagination page={page} pages={data.pages} pathname="/admin/inventory" query={query} />
      </div>
    </div>
  );
}
