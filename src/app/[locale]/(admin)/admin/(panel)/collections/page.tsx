import { LayoutGrid } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/admin/primitives";
import type { Locale } from "@/i18n/routing";
import { CollectionsManager } from "@/features/admin/collections/collections-manager";
import { can, requirePermission } from "@/server/auth/rbac";
import { allCollectionLinks, listCollectionsAdmin, productOptions } from "@/server/services/admin-catalog";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Collections — MALIKA Admin" };

export default async function CollectionsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  setRequestLocale((await params).locale);
  const admin = await requirePermission("collections:view");
  const [t, rows, links, products] = await Promise.all([getTranslations("admin.collections"), listCollectionsAdmin(), allCollectionLinks(), productOptions()]);

  const linkMap: Record<string, string[]> = {};
  for (const l of links) (linkMap[l.collectionId] ??= []).push(l.productId);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("intro")} />
      <CollectionsManager
        rows={rows.map((r) => ({ ...r.c, productCount: r.productCount, productIds: linkMap[r.c.id] ?? [] }))}
        products={products}
        canCreate={can(admin, "collections:create")}
        canEdit={can(admin, "collections:edit")}
        canDelete={can(admin, "collections:delete")}
        emptyIcon={<LayoutGrid size={30} strokeWidth={1.2} />}
      />
    </div>
  );
}
