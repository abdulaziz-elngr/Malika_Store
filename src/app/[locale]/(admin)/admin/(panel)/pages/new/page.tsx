import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/admin/primitives";
import { inputClass } from "@/components/ui/field";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { PageForm } from "@/features/admin/pages/page-form";
import { requirePermission } from "@/server/auth/rbac";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "New page — MALIKA Admin" };

export default async function NewPagePage({ params }: { params: Promise<{ locale: Locale }> }) {
  setRequestLocale((await params).locale);
  await requirePermission("pages:create");
  const t = await getTranslations("admin.pages");

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("newTitle")}
        description={t("newIntro")}
        actions={
          <Link href="/admin/pages" className={`${inputClass} inline-flex h-11 w-auto items-center px-4 text-sm`}>
            {t("backToList")}
          </Link>
        }
      />
      <PageForm row={null} />
    </div>
  );
}
