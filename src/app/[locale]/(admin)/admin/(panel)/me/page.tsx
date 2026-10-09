import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { Card } from "@/components/admin/primitives";
import { PageHeader } from "@/components/admin/primitives";
import type { Locale } from "@/i18n/routing";
import { pick, type Loc } from "@/lib/localize";
import { ACTIONS, RESOURCES, type Action, type Resource } from "@/lib/permissions";
import { can } from "@/server/auth/rbac";
import { getAdmin } from "@/server/auth/admin-session";

export const dynamic = "force-dynamic";

/** Any signed-in staff member: shows the role and the permissions the account really has. */
export default async function MyAccessPage({ params }: { params: Promise<{ locale: Locale }> }) {
  setRequestLocale((await params).locale);
  const admin = (await getAdmin())!;
  const [t, loc] = await Promise.all([getTranslations("admin"), getLocale() as Promise<Loc>]);
  return (
    <div className="space-y-8">
      <PageHeader eyebrow={pick(loc, admin.role.nameAr, admin.role.nameEn)} title={t("me.title")} description={t("me.intro")} />
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[40rem] text-sm">
          <thead><tr className="border-b border-line text-xs uppercase tracking-[0.12em] text-muted"><th scope="col" className="p-3 text-start font-medium">{t("resource")}</th>{ACTIONS.map((a) => <th key={a} scope="col" className="p-3 text-center font-medium">{t(`actions.${a}`)}</th>)}</tr></thead>
          <tbody>
            {(Object.keys(RESOURCES) as Resource[]).map((r) => (
              <tr key={r} className="border-b border-line last:border-0">
                <th scope="row" className="p-3 text-start font-normal">{t(`resources.${r}`)}</th>
                {ACTIONS.map((a: Action) => {
                  const applicable = (RESOURCES[r] as readonly Action[]).includes(a);
                  const on = applicable && can(admin, `${r}:${a}` as never);
                  return <td key={a} className="p-3 text-center">{!applicable ? <span aria-hidden className="text-line">·</span> : on ? <span className="text-sage-700 dark:text-sage-500" aria-label={t("allowed")}>✓</span> : <span className="text-muted" aria-label={t("denied")}>—</span>}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
