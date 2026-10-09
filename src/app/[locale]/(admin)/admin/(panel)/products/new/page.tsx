import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/admin/primitives";
import { inputClass } from "@/components/ui/field";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { ProductForm } from "@/features/admin/products/product-form";
import { requirePermission } from "@/server/auth/rbac";
import { listCategoriesAdmin, listCollectionsAdmin } from "@/server/services/admin-catalog";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "New product — MALIKA Admin" };

export default async function NewProductPage({ params }: { params: Promise<{ locale: Locale }> }) {
  setRequestLocale((await params).locale);
  await requirePermission("products:create");
  const [t, cats, cols] = await Promise.all([getTranslations("admin.products"), listCategoriesAdmin(), listCollectionsAdmin()]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("newTitle")}
        description={t("newIntro")}
        actions={
          <Link href="/admin/products" className={`${inputClass} inline-flex h-11 w-auto items-center px-4 text-sm`}>
            {t("backToList")}
          </Link>
        }
      />
      <ProductForm
        product={null}
        categories={cats.map((c) => ({ id: c.c.id, nameEn: c.c.nameEn, nameAr: c.c.nameAr }))}
        collections={cols.map((c) => ({ id: c.c.id, nameEn: c.c.nameEn, nameAr: c.c.nameAr }))}
      />
    </div>
  );
}
