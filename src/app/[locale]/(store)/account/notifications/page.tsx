import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { AccountShell } from "@/features/storefront/account/account-shell";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatDate } from "@/lib/format";
import { pick, type Loc } from "@/lib/localize";
import { markNotificationsReadAction } from "@/server/actions/account";
import { requireCustomer } from "@/server/auth/guard";
import { listCustomerNotifications } from "@/server/services/notifications";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false } };

export default async function NotificationsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  setRequestLocale((await params).locale);
  const customer = await requireCustomer("/account/notifications");
  const [t, loc, list] = await Promise.all([getTranslations("account"), getLocale() as Promise<Loc>, listCustomerNotifications(customer.id)]);
  const unread = list.filter((n) => !n.readAt).length;
  return (
    <AccountShell customer={customer} title={t("nav.notifications")}>
      {list.length === 0 ? <p className="border border-line bg-surface px-6 py-10 text-center text-muted">{t("noNotifications")}</p> : (
        <>
          {unread > 0 && <form action={markNotificationsReadAction} className="mb-6"><Button type="submit" variant="ghost" className="min-h-10 px-4">{t("markAllRead")}</Button></form>}
          <ul className="divide-y divide-line border-y border-line">
            {list.map((n) => {
              const body = (
                <div className="flex gap-4 py-5">
                  <span aria-hidden className={`mt-2 size-2 shrink-0 rounded-full ${n.readAt ? "bg-transparent" : "bg-brand"}`} />
                  <div className="space-y-1 text-sm">
                    <p className="font-medium">{pick(loc, n.titleAr, n.titleEn)}{!n.readAt && <span className="sr-only"> ({t("unread")})</span>}</p>
                    {(n.bodyAr || n.bodyEn) && <p className="text-muted">{pick(loc, n.bodyAr, n.bodyEn)}</p>}
                    <p className="text-xs text-muted">{formatDate(n.createdAt, loc, true)}</p>
                  </div>
                </div>
              );
              return <li key={n.id}>{n.href ? <Link href={n.href} className="block hover:bg-surface">{body}</Link> : body}</li>;
            })}
          </ul>
        </>
      )}
    </AccountShell>
  );
}
