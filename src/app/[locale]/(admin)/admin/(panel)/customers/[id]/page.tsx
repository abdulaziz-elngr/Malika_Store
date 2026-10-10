import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/admin/primitives";
import { inputClass } from "@/components/ui/field";
import { CustomerProfile } from "@/features/admin/customers/customer-profile";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { can, requirePermission } from "@/server/auth/rbac";
import { getCustomerAdmin } from "@/server/services/admin-sales";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Customer — MALIKA Admin" };

export default async function CustomerDetailPage({ params }: { params: Promise<{ locale: Locale; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const admin = await requirePermission("customers:view");
  const [customer, t] = await Promise.all([getCustomerAdmin(id), getTranslations("admin.customer")]);
  if (!customer) notFound();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={t("eyebrow")}
        title={customer.name}
        actions={
          <Link href="/admin/customers" className={`${inputClass} inline-flex h-11 w-auto items-center px-4 text-sm`}>
            {t("backToList")}
          </Link>
        }
      />
      <CustomerProfile customer={customer} canViewOrders={can(admin, "orders:view")} />
    </div>
  );
}
