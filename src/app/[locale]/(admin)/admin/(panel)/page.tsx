import { FileText } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/admin/primitives";
import type { Locale } from "@/i18n/routing";
import { PagesManager } from "@/features/admin/pages/pages-manager";
import { Pagination } from "@/features/storefront/shop/pagination";
import { can, requirePermission } from "@/server/auth/rbac";
import { listPagesAdminPaged } from "@/server/services/admin-content";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pages — MALIKA Admin" };
const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

export default async function PagesPage({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  setRequestLocale((await params).locale);
  const admin = await requirePermission("pages:view");
  const sp = await searchParams;
  const page = Math.min(500, Math.max(1, Number.parseInt(one(sp.page), 10) || 1));

  const [t, data] = await Promise.all([getTranslations("admin.pages"), listPagesAdminPaged(page)]);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("intro")} />
      <PagesManager
        rows={data.rows}
        canCreate={can(admin, "pages:create")}
        canDelete={can(admin, "pages:delete")}
        emptyIcon={<FileText size={30} strokeWidth={1.2} />}
      />
      <div className="-mt-8">
        <Pagination page={page} pages={data.pages} pathname="/admin/pages" query={{}} />
      </div>
    </div>
  );
}
