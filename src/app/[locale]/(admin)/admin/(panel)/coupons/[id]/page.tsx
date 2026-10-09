import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/admin/primitives";
import { inputClass } from "@/components/ui/field";
import { CouponForm } from "@/features/admin/coupons/coupon-form";
import { toRestrictionOptions } from "@/features/admin/coupons/options";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { Loc } from "@/lib/localize";
import { requirePermission } from "@/server/auth/rbac";
import { couponRestrictionOptions, getCouponAdmin } from "@/server/services/admin-sales";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Edit coupon — MALIKA Admin" };

export default async function EditCouponPage({ params }: { params: Promise<{ locale: Locale; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requirePermission("coupons:edit");
  const [coupon, raw, t, c, loc] = await Promise.all([
    getCouponAdmin(id),
    couponRestrictionOptions(),
    getTranslations("admin.coupon"),
    getTranslations("admin.coupons"),
    getLocale() as Promise<Loc>,
  ]);
  if (!coupon) notFound();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={c("eyebrow")}
        title={t("editTitle")}
        description={coupon.code}
        actions={
          <Link href="/admin/coupons" className={`${inputClass} inline-flex h-11 w-auto items-center px-4 text-sm`}>
            {t("backToList")}
          </Link>
        }
      />
      <CouponForm coupon={coupon} options={toRestrictionOptions(raw, loc)} />
    </div>
  );
}
