import { Package } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/admin/primitives";
import { Button, buttonClasses } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { ProductsManager } from "@/features/admin/products/products-manager";
import { Pagination } from "@/features/storefront/shop/pagination";
import { listAudienceOptions } from "@/server/services/admin-audiences";
import { can, requirePermission } from "@/server/auth/rbac";
import { listCategoriesAdmin, listProductsAdmin } from "@/server/services/admin-catalog";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Products — MALIKA Admin" };
const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

export default async function ProductsPage({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  setRequestLocale((await params).locale);
  const admin = await requirePermission("products:view");
  const sp = await searchParams;
  const q = one(sp.q).slice(0, 80);
  const status = ["draft", "published", "archived"].includes(one(sp.status)) ? one(sp.status) : "";
  const gender = /^[a-z0-9-]{1,40}$/.test(one(sp.gender)) ? one(sp.gender) : "";
  const category = one(sp.category).slice(0, 36);
  const page = Math.min(500, Math.max(1, Number.parseInt(one(sp.page), 10) || 1));

  const [t, data, cats, auds, locale] = await Promise.all([
    getTranslations("admin.products"),
    listProductsAdmin({ q: q || undefined, status: status || undefined, gender: gender || undefined, category: category || undefined, page }),
    listCategoriesAdmin(),
    listAudienceOptions(),
    getLocale(),
  ]);

  const query: Record<string, string> = {};
  if (q) query.q = q;
  if (status) query.status = status;
  if (gender) query.gender = gender;
  if (category) query.category = category;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("intro")}
        actions={
          can(admin, "products:create") ? (
            <Link href="/admin/products/new" className={buttonClasses()}>
              {t("new")}
            </Link>
          ) : undefined
        }
      />

      <form method="get" role="search" className="flex flex-wrap items-end gap-3">
        <label className="grid min-w-56 flex-1 gap-1.5 text-xs uppercase tracking-[0.18em] text-accent">
          {t("searchLabel")}
          <input type="search" name="q" defaultValue={q} maxLength={80} placeholder={t("searchPlaceholder")} className={`${inputClass} h-11 text-sm normal-case tracking-normal text-foreground`} />
        </label>
        <label className="grid gap-1.5 text-xs uppercase tracking-[0.18em] text-accent">
          {t("status")}
          <select name="status" defaultValue={status} className={`${inputClass} h-11 min-w-40 text-sm normal-case tracking-normal text-foreground`}>
            <option value="">{t("allStatuses")}</option>
            <option value="published">{t("statuses.published")}</option>
            <option value="draft">{t("statuses.draft")}</option>
            <option value="archived">{t("statuses.archived")}</option>
          </select>
        </label>
        <label className="grid gap-1.5 text-xs uppercase tracking-[0.18em] text-accent">
          {t("category")}
          <select name="category" defaultValue={category} className={`${inputClass} h-11 min-w-44 text-sm normal-case tracking-normal text-foreground`}>
            <option value="">{t("allCategories")}</option>
            {cats.map((c) => (
              <option key={c.c.id} value={c.c.id}>
                {c.c.nameEn}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-xs uppercase tracking-[0.18em] text-accent">
          {t("gender")}
          <select name="gender" defaultValue={gender} className={`${inputClass} h-11 min-w-36 text-sm normal-case tracking-normal text-foreground`}>
            <option value="">{t("allGenders")}</option>
            {auds.map((a) => (
              <option key={a.slug} value={a.slug}>
                {locale === "ar" ? a.nameAr : a.nameEn}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" className="min-h-11">
          {t("apply")}
        </Button>
        {query.q || query.status || query.gender || query.category ? (
          <Link href="/admin/products" className="inline-flex min-h-11 items-center px-3 text-sm text-muted underline-offset-4 hover:underline">
            {t("reset")}
          </Link>
        ) : null}
      </form>

      <ProductsManager
        rows={data.rows.map((r) => ({ ...r.p, categoryNameEn: r.categoryNameEn, image: r.image, stock: r.stock }))}
        canCreate={can(admin, "products:create")}
        canEdit={can(admin, "products:edit")}
        canDelete={can(admin, "products:delete")}
        canPublish={can(admin, "products:publish")}
        emptyIcon={<Package size={30} strokeWidth={1.2} />}
      />
      <div className="-mt-8">
        <Pagination page={page} pages={data.pages} pathname="/admin/products" query={query} />
      </div>
    </div>
  );
}
