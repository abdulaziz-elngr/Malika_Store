"use client";

import { useTranslations } from "next-intl";
import { Logo } from "@/components/brand/logo";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import type { NavGroup } from "../nav";
import { ICONS } from "./icons";

export const isActive = (pathname: string, href: string) => (href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`));

/** The navigation list, shared by the desktop sidebar and the mobile drawer. */
export function NavList({ groups, compact = false, onNavigate }: { groups: NavGroup[]; compact?: boolean; onNavigate?: () => void }) {
  const t = useTranslations("admin");
  const pathname = usePathname();
  return (
    <nav aria-label={t("shell.primaryNav")} className="space-y-6">
      {groups.map((g) => (
        <div key={g.key}>
          <p className={cn("mb-2 px-3 text-[0.66rem] font-medium uppercase tracking-[0.25em] text-muted", compact && "sr-only")}>{t(`nav.groups.${g.key}` as never)}</p>
          <ul className="space-y-0.5">
            {g.items.map((i) => {
              const Icon = ICONS[i.icon];
              const label = t(`resources.${i.key}` as never);
              const base = cn("flex min-h-10 items-center gap-3 px-3 text-sm transition-colors", compact && "justify-center px-0");
              if (!i.ready)
                return (
                  <li key={i.key}>
                    <span aria-disabled="true" title={t("shell.soonHint")} className={cn(base, "cursor-not-allowed text-muted/70")}>
                      <Icon size={18} strokeWidth={1.4} aria-hidden className="shrink-0" />
                      <span className={cn("flex-1 truncate", compact && "sr-only")}>{label}</span>
                      <span className={cn("border border-line px-1.5 py-px text-[0.62rem] uppercase tracking-[0.12em]", compact && "sr-only")}>{t("shell.soon")}</span>
                    </span>
                  </li>
                );
              const active = isActive(pathname, i.href);
              return (
                <li key={i.key}>
                  <Link href={i.href} onClick={onNavigate} aria-current={active ? "page" : undefined} title={compact ? label : undefined}
                    className={cn(base, active ? "bg-brand text-brand-contrast" : "text-foreground hover:bg-line/50")}>
                    <Icon size={18} strokeWidth={1.4} aria-hidden className="shrink-0" />
                    <span className={cn("truncate", compact && "sr-only")}>{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function Sidebar({ groups, collapsed }: { groups: NavGroup[]; collapsed: boolean }) {
  const t = useTranslations("admin.shell");
  return (
    <aside className={cn("sticky top-0 hidden h-dvh shrink-0 flex-col border-e border-line bg-surface transition-[width] duration-500 ease-luxe lg:flex", collapsed ? "w-[4.5rem]" : "w-64")}>
      <div className={cn("flex h-16 shrink-0 items-center border-b border-line", collapsed ? "justify-center" : "justify-between px-5")}>
        <Link href="/admin" aria-label="MALIKA — Admin"><Logo height={collapsed ? 26 : 34} priority /></Link>
        {!collapsed && <span className="text-[0.62rem] uppercase tracking-[0.25em] text-accent">{t("admin")}</span>}
      </div>
      <div className={cn("min-h-0 flex-1 overflow-y-auto py-5", collapsed ? "px-2" : "px-3")}><NavList groups={groups} compact={collapsed} /></div>
    </aside>
  );
}
