import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/admin/primitives";
import { inputClass } from "@/components/ui/field";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { ProductForm } from "@/features/admin/products/product-form";
import { requirePermission } from "@/server/auth/rbac";
import { listAudienceOptions } from "@/server/services/admin-audiences";
import { getProductAdmin, listCategoriesAdmin, listCollectionsAdmin } from "@/server/services/admin-catalog";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Edit product — MALIKA Admin" };

export default async function EditProductPage({ params }: { params: Promise<{ locale: Locale; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requirePermission("products:edit");
  const [product, cats, cols, t, auds] = await Promise.all([getProductAdmin(id), listCategoriesAdmin(), listCollectionsAdmin(), getTranslations("admin.products"), listAudienceOptions()]);
  if (!product) notFound();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={t("eyebrow")}
        title={product.nameEn}
        description={t("editIntro")}
        actions={
          <Link href="/admin/products" className={`${inputClass} inline-flex h-11 w-auto items-center px-4 text-sm`}>
            {t("backToList")}
          </Link>
        }
      />
      <ProductForm
        product={product}
        categories={cats.map((c) => ({ id: c.c.id, nameEn: c.c.nameEn, nameAr: c.c.nameAr }))}
        collections={cols.map((c) => ({ id: c.c.id, nameEn: c.c.nameEn, nameAr: c.c.nameAr }))}
        audiences={auds}
      />
    </div>
  );
}
