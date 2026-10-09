"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Drawer } from "@/components/admin/overlay";
import { usePathname } from "@/i18n/navigation";
import { adminLogoutAction } from "@/server/actions/admin-auth";
import type { NavGroup } from "../nav";
import { BottomNav } from "./bottom-nav";
import { CommandPalette } from "./command-palette";
import { NavList, Sidebar } from "./sidebar";
import { Topbar, type ShellUser } from "./topbar";
import { useCollapsed } from "./use-collapsed";

/** Client shell of the admin: sidebar, top bar, phone drawer + bottom bar, command palette and the sign-out confirmation. */
export function AdminShell({ user, groups, children }: { user: ShellUser; groups: NavGroup[]; children: React.ReactNode }) {
  const t = useTranslations("admin.shell");
  const pathname = usePathname();
  const [collapsed, toggleCollapsed] = useCollapsed();
  const [menu, setMenu] = useState(false);
  const [palette, setPalette] = useState(false);
  const [signOut, setSignOut] = useState(false);

  const closeMenu = useCallback(() => setMenu(false), []);
  const closePalette = useCallback(() => setPalette(false), []);
  const askSignOut = useCallback(() => setSignOut(true), []);

  useEffect(() => setMenu(false), [pathname]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPalette((p) => !p); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex min-h-dvh bg-background">
      <Sidebar groups={groups} collapsed={collapsed} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} collapsed={collapsed} onToggleCollapse={toggleCollapsed} onOpenMenu={() => setMenu(true)} onOpenPalette={() => setPalette(true)} onSignOut={askSignOut} />
        <main id="main" className="mx-auto w-full max-w-[88rem] flex-1 px-4 pb-28 pt-8 sm:px-6 lg:px-10 lg:pb-14">{children}</main>
      </div>
      <BottomNav groups={groups} onSearch={() => setPalette(true)} onMenu={() => setMenu(true)} />
      <Drawer open={menu} onClose={closeMenu} side="start" title={t("menu")}><div className="p-4"><NavList groups={groups} onNavigate={closeMenu} /></div></Drawer>
      <CommandPalette open={palette} onClose={closePalette} groups={groups} onSignOut={askSignOut} />
      <ConfirmDialog open={signOut} onClose={() => setSignOut(false)} title={t("signOutTitle")} body={t("signOutBody")} confirmLabel={t("signOut")} formAction={adminLogoutAction} />
    </div>
  );
}
