"use client";

import { ArrowDown, ArrowUp, Link2, Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Badge, Card, EmptyState, TableWrap, Td, Th } from "@/components/admin/primitives";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Drawer } from "@/components/admin/overlay";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { useRouter } from "@/i18n/navigation";
import { deleteNavItemAction, moveNavItemAction } from "@/server/actions/admin-content";
import { NavItemForm } from "./nav-item-form";
import type { NavDTO, NavMenu } from "./types";

type Props = { rows: Record<NavMenu, NavDTO[]>; canCreate: boolean; canEdit: boolean; canDelete: boolean; emptyIcon?: React.ReactNode };

const MENUS: readonly NavMenu[] = ["header", "footer"];

/** Header/footer menu builder: one tab per menu, ordered rows, a drawer form and a guarded delete. */
export function NavigationManager({ rows, canCreate, canEdit, canDelete, emptyIcon }: Props) {
  const t = useTranslations("admin.navigation");
  const f = useTranslations("admin.form");
  const router = useRouter();
  const [menu, setMenu] = useState<NavMenu>("header");
  const [open, setOpen] = useState<null | "new" | NavDTO>(null);
  const [confirm, setConfirm] = useState<NavDTO | null>(null);

  const items = rows[menu];

  const run = (fn: (fd: FormData) => Promise<void>, values: Record<string, string>) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(values)) fd.set(k, v);
    return fn(fd).then(() => router.refresh());
  };

  const deleteIt = () => {
    const target = confirm;
    setConfirm(null);
    if (!target) return;
    return run(deleteNavItemAction, { id: target.id });
  };

  return (
    <>
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5">
          <div role="tablist" aria-label={t("title")} className="flex gap-1">
            {MENUS.map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={menu === m}
                onClick={() => setMenu(m)}
                className={cn(
                  "border-b-2 border-transparent px-4 py-4 text-xs uppercase tracking-[0.18em] transition-colors",
                  menu === m ? "border-brand text-foreground" : "text-muted hover:text-foreground",
                )}
              >
                {t(`tabs.${m}` as "tabs.header")}
              </button>
            ))}
          </div>
          {canCreate ? (
            <Button type="button" onClick={() => setOpen("new")} className="my-3 min-h-10 px-5 text-xs">
              <Plus size={15} /> {t("new")}
            </Button>
          ) : undefined}
        </div>

        {items.length === 0 ? (
          <EmptyState icon={emptyIcon ?? <Link2 size={30} strokeWidth={1.2} />} title={t("empty")} body={t("emptyBody")} />
        ) : (
          <TableWrap>
            <thead>
              <tr className="border-b border-line">
                <Th>{t("cols.link")}</Th>
                <Th>{t("cols.href")}</Th>
                <Th>{f("visible")}</Th>
                <Th>{t("cols.order")}</Th>
                <Th className="text-end">
                  <span className="sr-only">{f("actions")}</span>
                </Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((n, i) => (
                <tr key={n.id} className="hover:bg-brand/5">
                  <Td>
                    <p className="font-medium">{n.labelEn}</p>
                    <p className="text-xs text-muted">{n.labelAr}</p>
                  </Td>
                  <Td dir="ltr" className="text-muted">
                    {n.href}
                  </Td>
                  <Td>
                    <Badge tone={n.visible ? "sage" : "neutral"}>{n.visible ? f("visible") : f("hidden")}</Badge>
                  </Td>
                  <Td>
                    {canEdit && (
                      <span className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => void run(moveNavItemAction, { id: n.id, dir: "up" })}
                          disabled={i === 0}
                          aria-label={`${t("moveUp")} — ${n.labelEn}`}
                          className="grid size-8 place-items-center border border-line text-muted transition-colors hover:border-accent disabled:opacity-30"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => void run(moveNavItemAction, { id: n.id, dir: "down" })}
                          disabled={i === items.length - 1}
                          aria-label={`${t("moveDown")} — ${n.labelEn}`}
                          className="grid size-8 place-items-center border border-line text-muted transition-colors hover:border-accent disabled:opacity-30"
                        >
                          <ArrowDown size={14} />
                        </button>
                      </span>
                    )}
                  </Td>
                  <Td className="text-end">
                    <span className="flex justify-end gap-2">
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => setOpen(n)}
                          aria-label={`${f("edit")} — ${n.labelEn}`}
                          className="grid size-8 place-items-center border border-line text-muted hover:border-accent hover:text-foreground"
                        >
                          <Pencil size={14} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => setConfirm(n)}
                          aria-label={`${f("delete")} — ${n.labelEn}`}
                          className="grid size-8 place-items-center border border-line text-muted hover:border-brand hover:text-brand"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
        <div className="space-y-1 border-t border-line px-5 py-3">
          <p className="text-xs text-muted">{menu === "header" ? t("headerHint") : t("footerHint")}</p>
          <p className="text-xs text-muted">{t("reorderHint")}</p>
        </div>
      </Card>

      <Drawer
        open={open !== null}
        onClose={() => setOpen(null)}
        title={open === "new" ? t("newTitle") : t("editTitle")}
        className="w-[min(94vw,34rem)]"
      >
        {open && <NavItemForm row={open === "new" ? null : open} menu={menu} onDone={() => setOpen(null)} onCancel={() => setOpen(null)} />}
      </Drawer>

      <ConfirmDialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={f("deleteTitle", { name: confirm ? confirm.labelEn : "" })}
        body={f("deleteBody")}
        confirmLabel={f("deleteConfirm")}
        formAction={deleteIt}
      />
    </>
  );
}
