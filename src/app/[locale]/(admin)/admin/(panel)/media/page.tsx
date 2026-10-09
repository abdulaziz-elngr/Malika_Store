import { Images } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/admin/primitives";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { MediaManager } from "@/features/admin/media/media-manager";
import { Pagination } from "@/features/storefront/shop/pagination";
import { can, requirePermission } from "@/server/auth/rbac";
import { listMediaAdmin, mediaFolders } from "@/server/services/admin-content";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Media — MALIKA Admin" };
const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

export default async function MediaPage({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  setRequestLocale((await params).locale);
  const admin = await requirePermission("media:view");
  const sp = await searchParams;
  const q = one(sp.q).slice(0, 80);
  const folder = one(sp.folder).slice(0, 60);
  const page = Math.min(500, Math.max(1, Number.parseInt(one(sp.page), 10) || 1));

  const [t, folders, data] = await Promise.all([
    getTranslations("admin.media"),
    mediaFolders(),
    listMediaAdmin({ q: q || undefined, folder: folder || undefined, page }),
  ]);

  const query: Record<string, string> = {};
  if (q) query.q = q;
  if (folder) query.folder = folder;

  return (
    <div className="space-y-8">
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("intro")} />

      <form method="get" role="search" className="flex flex-wrap items-end gap-3">
        <label className="grid min-w-56 flex-1 gap-1.5 text-xs uppercase tracking-[0.18em] text-accent">
          {t("searchLabel")}
          <input type="search" name="q" defaultValue={q} maxLength={80} placeholder={t("searchPlaceholder")} className={`${inputClass} h-11 text-sm normal-case tracking-normal text-foreground`} />
        </label>
        <label className="grid gap-1.5 text-xs uppercase tracking-[0.18em] text-accent">
          {t("folderLabel")}
          <select name="folder" defaultValue={folder} className={`${inputClass} h-11 min-w-44 text-sm normal-case tracking-normal text-foreground`}>
            <option value="">{t("allFolders")}</option>
            {folders.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" className="min-h-11">
          {t("apply")}
        </Button>
        {query.q || query.folder ? (
          <Link href="/admin/media" className="inline-flex min-h-11 items-center px-3 text-sm text-muted underline-offset-4 hover:underline">
            {t("reset")}
          </Link>
        ) : null}
      </form>

      <MediaManager
        rows={data.rows}
        canCreate={can(admin, "media:create")}
        canEdit={can(admin, "media:edit")}
        canDelete={can(admin, "media:delete")}
        emptyIcon={<Images size={30} strokeWidth={1.2} />}
      />
      <div className="-mt-8">
        <Pagination page={page} pages={data.pages} pathname="/admin/media" query={query} />
      </div>
    </div>
  );
}
