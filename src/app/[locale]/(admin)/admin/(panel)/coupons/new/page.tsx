import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/admin/primitives";
import { inputClass } from "@/components/ui/field";
import { CouponForm } from "@/features/admin/coupons/coupon-form";
import { toRestrictionOptions } from "@/features/admin/coupons/options";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { Loc } from "@/lib/localize";
import { requirePermission } from "@/server/auth/rbac";
import { couponRestrictionOptions } from "@/server/services/admin-sales";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "New coupon — MALIKA Admin" };

export default async function NewCouponPage({ params }: { params: Promise<{ locale: Locale }> }) {
  setRequestLocale((await params).locale);
  await requirePermission("coupons:create");
  const [t, c, raw, loc] = await Promise.all([getTranslations("admin.coupon"), getTranslations("admin.coupons"), couponRestrictionOptions(), getLocale() as Promise<Loc>]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={c("eyebrow")}
        title={t("newTitle")}
        actions={
          <Link href="/admin/coupons" className={`${inputClass} inline-flex h-11 w-auto items-center px-4 text-sm`}>
            {t("backToList")}
          </Link>
        }
      />
      <CouponForm coupon={null} options={toRestrictionOptions(raw, loc)} />
    </div>
  );
}
