import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/admin/primitives";
import { inputClass } from "@/components/ui/field";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { PageForm } from "@/features/admin/pages/page-form";
import { requirePermission } from "@/server/auth/rbac";
import { getPageAdmin } from "@/server/services/admin-content";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Edit page — MALIKA Admin" };

export default async function EditPagePage({ params }: { params: Promise<{ locale: Locale; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requirePermission("pages:edit");
  const [page, t] = await Promise.all([getPageAdmin(id), getTranslations("admin.pages")]);
  if (!page) notFound();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={t("eyebrow")}
        title={page.titleEn}
        description={t("editIntro")}
        actions={
          <Link href="/admin/pages" className={`${inputClass} inline-flex h-11 w-auto items-center px-4 text-sm`}>
            {t("backToList")}
          </Link>
        }
      />
      <PageForm row={page} />
    </div>
  );
}
