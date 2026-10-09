"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CornerDownLeft, ExternalLink, Languages, LogOut, Search, SunMoon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useDialog } from "@/components/admin/use-dialog";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import type { NavGroup } from "../nav";
import { ICONS } from "./icons";

type Entry = { id: string; label: string; group: "pages" | "actions"; icon: React.ReactNode; run: () => void };

/** Ctrl/⌘ + K: jump to any page the staff member may open, or run a quick action. */
export function CommandPalette({ open, onClose, groups, onSignOut }: { open: boolean; onClose: () => void; groups: NavGroup[]; onSignOut: () => void }) {
  const t = useTranslations("admin");
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const { resolvedTheme, setTheme } = useTheme();
  const [q, setQ] = useState("");
  const [cursor, setCursor] = useState(0);
  const panel = useRef<HTMLDivElement>(null);
  const listId = useId();
  useDialog(open, onClose, panel);

  useEffect(() => { if (open) { setQ(""); setCursor(0); } }, [open]);

  const entries = useMemo<Entry[]>(() => {
    const go = (href: string) => () => { onClose(); router.push(href); };
    const pages: Entry[] = groups.flatMap((g) => g.items.filter((i) => i.ready).map((i) => {
      const Icon = ICONS[i.icon];
      return { id: `p-${i.key}`, label: t(`resources.${i.key}` as never), group: "pages" as const, icon: <Icon size={16} strokeWidth={1.4} />, run: go(i.href) };
    }));
    const actions: Entry[] = [
      { id: "a-store", label: t("shell.viewStore"), group: "actions", icon: <ExternalLink size={16} strokeWidth={1.4} />, run: () => { onClose(); window.open(`/${locale}`, "_blank", "noopener"); } },
      { id: "a-lang", label: t("shell.switchLanguage"), group: "actions", icon: <Languages size={16} strokeWidth={1.4} />, run: () => { onClose(); router.replace(pathname, { locale: locale === "ar" ? "en" : "ar" }); } },
      { id: "a-theme", label: t("shell.toggleTheme"), group: "actions", icon: <SunMoon size={16} strokeWidth={1.4} />, run: () => { onClose(); setTheme(resolvedTheme === "dark" ? "light" : "dark"); } },
      { id: "a-out", label: t("shell.signOut"), group: "actions", icon: <LogOut size={16} strokeWidth={1.4} />, run: () => { onClose(); onSignOut(); } },
    ];
    return [...pages, ...actions];
  }, [groups, t, router, pathname, locale, resolvedTheme, setTheme, onClose, onSignOut]);

  const query = q.trim().toLocaleLowerCase();
  const results = query ? entries.filter((e) => e.label.toLocaleLowerCase().includes(query)) : entries;
  const active = Math.min(cursor, Math.max(results.length - 1, 0));

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => (c + 1) % Math.max(results.length, 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => (c - 1 + results.length) % Math.max(results.length, 1)); }
    else if (e.key === "Enter") { e.preventDefault(); results[active]?.run(); }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 pt-[12vh]">
          <motion.div aria-hidden onClick={onClose} className="absolute inset-0 bg-foreground/40 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div
            ref={panel} role="dialog" aria-modal="true" aria-label={t("shell.commandTitle")} tabIndex={-1} onKeyDown={onKeyDown}
            initial={{ opacity: 0, y: -12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-xl border border-line bg-surface shadow-soft outline-none"
          >
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search size={18} strokeWidth={1.4} className="text-accent" aria-hidden />
              <input
                data-autofocus value={q} onChange={(e) => { setQ(e.target.value); setCursor(0); }}
                role="combobox" aria-expanded="true" aria-controls={listId} aria-activedescendant={results[active] ? `${listId}-${results[active]!.id}` : undefined} aria-label={t("shell.commandTitle")}
                placeholder={t("shell.commandPlaceholder")} className="h-14 flex-1 bg-transparent text-base outline-none placeholder:text-muted/70"
              />
            </div>
            <ul id={listId} role="listbox" className="max-h-[50vh] overflow-y-auto py-2">
              {results.length === 0 && <li className="px-5 py-8 text-center text-sm text-muted">{t("shell.noResults", { q })}</li>}
              {results.map((r, i) => (
                <li key={r.id} role="presentation">
                  {(i === 0 || results[i - 1]!.group !== r.group) && <p className="px-5 pb-1 pt-3 text-[0.66rem] uppercase tracking-[0.25em] text-muted">{r.group === "pages" ? t("shell.groupPages") : t("shell.groupActions")}</p>}
                  <button
                    id={`${listId}-${r.id}`} type="button" role="option" aria-selected={i === active} tabIndex={-1} onClick={r.run} onMouseMove={() => setCursor(i)}
                    className={cn("flex w-full items-center gap-3 px-5 py-2.5 text-start text-sm", i === active ? "bg-brand text-brand-contrast" : "text-foreground")}
                  >
                    <span aria-hidden className="shrink-0">{r.icon}</span><span className="flex-1 truncate">{r.label}</span>
                    {i === active && <CornerDownLeft size={14} aria-hidden className="rtl:-scale-x-100" />}
                  </button>
                </li>
              ))}
            </ul>
            <p className="border-t border-line px-5 py-2.5 text-xs text-muted" dir="auto">{t("shell.commandHint")}</p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
