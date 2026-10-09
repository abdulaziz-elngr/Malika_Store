"use client";

import { LayoutGrid, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import type { NavGroup } from "../nav";
import { ICONS } from "./icons";
import { isActive } from "./sidebar";

/** Thumb-reach navigation on phones: the pinned sections that exist, search, and the full menu. */
export function BottomNav({ groups, onSearch, onMenu }: { groups: NavGroup[]; onSearch: () => void; onMenu: () => void }) {
  const t = useTranslations("admin");
  const pathname = usePathname();
  const items = groups.flatMap((g) => g.items).filter((i) => i.ready && i.bottom);
  const cell = "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[0.68rem]";
  return (
    <nav aria-label={t("shell.mobileNav")} className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
      {items.map((i) => {
        const Icon = ICONS[i.icon];
        const active = isActive(pathname, i.href);
        return (
          <Link key={i.key} href={i.href} aria-current={active ? "page" : undefined} className={cn(cell, active ? "text-brand" : "text-muted")}>
            <Icon size={20} strokeWidth={active ? 1.8 : 1.4} aria-hidden /><span className="max-w-full truncate">{t(`resources.${i.key}` as never)}</span>
          </Link>
        );
      })}
      <button type="button" onClick={onSearch} className={cn(cell, "text-muted")}><Search size={20} strokeWidth={1.4} aria-hidden />{t("shell.search")}</button>
      <button type="button" onClick={onMenu} className={cn(cell, "text-muted")}><LayoutGrid size={20} strokeWidth={1.4} aria-hidden />{t("shell.menu")}</button>
    </nav>
  );
}
