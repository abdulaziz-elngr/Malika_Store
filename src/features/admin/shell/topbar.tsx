"use client";

import { ChevronDown, ExternalLink, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Search, ShieldCheck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

export type ShellUser = { name: string; email: string; roleName: string };
const iconBtn = "grid size-10 place-items-center text-foreground transition-colors hover:text-accent";

function UserMenu({ user, onSignOut }: { user: ShellUser; onSignOut: () => void }) {
  const t = useTranslations("admin.shell");
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", esc); };
  }, [open]);
  const initials = user.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div ref={box} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} aria-label={t("userMenu")} className="flex h-10 items-center gap-2 ps-1 pe-2 hover:text-accent">
        <span className="grid size-8 place-items-center bg-brand text-xs font-medium text-brand-contrast" aria-hidden>{initials}</span>
        <ChevronDown size={14} aria-hidden className={cn("transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div role="menu" className="absolute end-0 top-full z-50 mt-2 w-64 border border-line bg-surface shadow-soft">
          <div className="border-b border-line px-4 py-3">
            <p className="truncate font-medium">{user.name}</p>
            <p className="truncate text-xs text-muted" dir="ltr">{user.email}</p>
            <p className="mt-1 text-[0.66rem] uppercase tracking-[0.2em] text-accent">{user.roleName}</p>
          </div>
          <Link role="menuitem" href="/admin/me" onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-line/50"><ShieldCheck size={16} strokeWidth={1.4} aria-hidden />{t("myAccess")}</Link>
          <button role="menuitem" type="button" onClick={() => { setOpen(false); onSignOut(); }} className="flex w-full items-center gap-3 px-4 py-2.5 text-start text-sm hover:bg-line/50"><LogOut size={16} strokeWidth={1.4} aria-hidden />{t("signOut")}</button>
        </div>
      )}
    </div>
  );
}

export function Topbar({ user, collapsed, onToggleCollapse, onOpenMenu, onOpenPalette, onSignOut }: { user: ShellUser; collapsed: boolean; onToggleCollapse: () => void; onOpenMenu: () => void; onOpenPalette: () => void; onSignOut: () => void }) {
  const t = useTranslations("admin.shell");
  const locale = useLocale();
  const Collapse = collapsed ? PanelLeftOpen : PanelLeftClose;
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-line bg-background/90 px-3 backdrop-blur-md sm:px-5">
      <button type="button" onClick={onOpenMenu} aria-label={t("openMenu")} className={cn(iconBtn, "lg:hidden")}><Menu size={22} strokeWidth={1.4} /></button>
      <button type="button" onClick={onToggleCollapse} aria-label={collapsed ? t("expand") : t("collapse")} aria-pressed={collapsed} className={cn(iconBtn, "hidden lg:grid")}>
        <Collapse size={19} strokeWidth={1.4} className="rtl:-scale-x-100" />
      </button>
      <button type="button" onClick={onOpenPalette} className="flex h-10 min-w-0 flex-1 items-center gap-3 border border-line bg-surface px-3 text-start text-sm text-muted hover:border-accent sm:max-w-md sm:flex-none sm:basis-96">
        <Search size={16} strokeWidth={1.4} aria-hidden /><span className="flex-1 truncate">{t("search")}</span>
        <kbd className="hidden border border-line px-1.5 text-[0.7rem] sm:inline" dir="ltr">Ctrl K</kbd>
      </button>
      <div className="ms-auto flex items-center">
        <a href={`/${locale}`} target="_blank" rel="noopener" aria-label={t("viewStore")} title={t("viewStore")} className={cn(iconBtn, "hidden sm:grid")}><ExternalLink size={18} strokeWidth={1.4} /></a>
        <ThemeToggle />
        <LanguageSwitcher className="mx-2 hidden sm:flex" />
        <UserMenu user={user} onSignOut={onSignOut} />
      </div>
    </header>
  );
}
