import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

export async function Pagination({ page, pages, pathname, query }: { page: number; pages: number; pathname: string; query: Record<string, string> }) {
  if (pages <= 1) return null;
  const t = await getTranslations("pagination");
  const href = (p: number) => {
    const qs = new URLSearchParams(query);
    if (p > 1) qs.set("page", String(p));
    else qs.delete("page");
    const s = qs.toString();
    return s ? `${pathname}?${s}` : pathname;
  };
  const cls = "inline-flex min-h-11 items-center border border-line px-5 text-sm uppercase tracking-[0.16em] transition-colors hover:border-brand";
  return (
    <nav aria-label={t("label")} className="mt-16 flex items-center justify-center gap-6">
      {page > 1 ? <Link href={href(page - 1)} rel="prev" className={cls}>{t("prev")}</Link> : <span className={cn(cls, "pointer-events-none opacity-40")}>{t("prev")}</span>}
      <span className="text-sm text-muted">{t("page", { page, pages })}</span>
      {page < pages ? <Link href={href(page + 1)} rel="next" className={cls}>{t("next")}</Link> : <span className={cn(cls, "pointer-events-none opacity-40")}>{t("next")}</span>}
    </nav>
  );
}
