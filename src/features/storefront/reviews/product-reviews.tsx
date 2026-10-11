import { Star } from "lucide-react";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { getCustomer } from "@/server/auth/session";
import { getApprovedReviews, getCustomerReview, getRatingSummary, hasReceivedProduct } from "@/server/services/reviews";
import { ReviewForm } from "./review-form";

export function Stars({ value, size = 16, className }: { value: number; size?: number; className?: string }) {
  return (
    <span className={cn("inline-flex text-accent", className)} aria-hidden>
      {[1, 2, 3, 4, 5].map((n) => <Star key={n} size={size} strokeWidth={1.6} className={n <= Math.round(value) ? "fill-current" : "opacity-40"} />)}
    </span>
  );
}

export async function ProductReviews({ productId, slug }: { productId: string; slug: string }) {
  const [t, fmt, locale, customer] = await Promise.all([getTranslations("reviews"), getFormatter(), getLocale(), getCustomer()]);
  const [list, summary] = await Promise.all([getApprovedReviews(productId), getRatingSummary(productId)]);
  const [eligible, mine] = customer ? await Promise.all([hasReceivedProduct(customer.id, productId), getCustomerReview(customer.id, productId)]) : [false, null];

  return (
    <section id="reviews" aria-labelledby="pd-reviews" className="mt-16 scroll-mt-24 border-t border-line pt-12">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <h2 id="pd-reviews" className="font-display text-4xl text-brand">{t("title")}</h2>
        {summary.count > 0 && (
          <p className="flex items-center gap-3 text-sm text-muted">
            <Stars value={summary.average} size={18} />
            <span><span className="text-foreground">{fmt.number(summary.average, { maximumFractionDigits: 1 })}</span> · {t("count", { count: summary.count })}</span>
          </p>
        )}
      </div>

      <div className="grid gap-12 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div>
          {list.length === 0 ? (
            <p className="text-muted">{t("empty")}</p>
          ) : (
            <ul className="divide-y divide-line border-y border-line">
              {list.map((r) => (
                <li key={r.id} className="space-y-2 py-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Stars value={r.rating} />
                    <time dateTime={r.createdAt.toISOString()} className="text-xs text-muted">{new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(r.createdAt)}</time>
                  </div>
                  <p className="whitespace-pre-line text-base">{r.body}</p>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted">{r.name} · {t("verified")}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-medium uppercase tracking-[0.25em] text-accent">{t("write")}</h3>
          {!customer ? (
            <p className="text-sm text-muted">
              {t("loginPrompt")}{" "}
              <Link href={`/account/login?next=${encodeURIComponent(`/products/${slug}#reviews`)}`} className="text-accent underline underline-offset-4 hover:text-foreground">{t("loginCta")}</Link>
            </p>
          ) : !eligible ? (
            <p className="text-sm text-muted">{t("notEligible")}</p>
          ) : (
            <>
              {mine && (
                <p role="status" className="text-sm text-muted">
                  {mine.status === "approved" ? t("statusApproved") : mine.status === "rejected" ? t("statusRejected") : t("statusPending")}
                </p>
              )}
              <ReviewForm key={mine?.updatedAt.toISOString() ?? "new"} productId={productId} initialRating={mine?.rating} initialBody={mine?.body} editing={!!mine} />
            </>
          )}
        </div>
      </div>
    </section>
  );
}
