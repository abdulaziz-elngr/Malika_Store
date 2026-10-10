"use client";

import { ArrowDown, ArrowUp, Pencil, Plus, Tags, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Badge, Card, CardHeader, EmptyState, TableWrap, Td, Th } from "@/components/admin/primitives";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Drawer } from "@/components/admin/overlay";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { deleteCategoryAction, moveCategoryAction } from "@/server/actions/admin-catalog";
import { CategoryForm } from "./category-form";
import type { CategoryRow } from "./types";

type Props = { rows: CategoryRow[]; canCreate: boolean; canEdit: boolean; canDelete: boolean; emptyIcon?: React.ReactNode };

/** Category list with a drawer form for create/edit, order arrows and a guarded delete. */
export function CategoriesManager({ rows, canCreate, canEdit, canDelete, emptyIcon }: Props) {
  const t = useTranslations("admin.categories");
  const f = useTranslations("admin.form");
  const router = useRouter();
  const [open, setOpen] = useState<null | "new" | CategoryRow>(null);
  const [confirm, setConfirm] = useState<CategoryRow | null>(null);

  const deleteIt = () => {
    const target = confirm;
    setConfirm(null);
    if (!target) return;
    const fd = new FormData();
    fd.set("id", target.id);
    return deleteCategoryAction(fd).then(() => router.refresh());
  };

  const move = (id: string, dir: "up" | "down") => {
    const fd = new FormData();
    fd.set("id", id);
    fd.set("dir", dir);
    return moveCategoryAction(fd).then(() => router.refresh());
  };

  return (
    <>
      <Card>
        <CardHeader
          title={t("listTitle")}
          action={
            canCreate ? (
              <Button type="button" onClick={() => setOpen("new")} className="min-h-10 px-5 text-xs">
                <Plus size={15} /> {t("new")}
              </Button>
            ) : undefined
          }
        />
        {rows.length === 0 ? (
          <EmptyState icon={emptyIcon ?? <Tags size={30} strokeWidth={1.2} />} title={t("empty")} body={t("emptyBody")} />
        ) : (
          <TableWrap>
            <thead>
              <tr className="border-b border-line">
                <Th>{f("nameEn")}</Th>
                <Th>{t("slug")}</Th>
                <Th>{t("productCount")}</Th>
                <Th>{f("visible")}</Th>
                <Th>{t("order")}</Th>
                <Th className="text-end">
                  <span className="sr-only">{f("actions")}</span>
                </Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((c, i) => (
                <tr key={c.id} className="hover:bg-brand/5">
                  <Td>
                    <p className="font-medium">{c.nameEn}</p>
                    <p className="text-xs text-muted">{c.nameAr}</p>
                  </Td>
                  <Td dir="ltr" className="text-muted">
                    /{c.slug}
                  </Td>
                  <Td className="text-muted">{c.productCount}</Td>
                  <Td>
                    <Badge tone={c.visible ? "sage" : "neutral"}>{c.visible ? f("visible") : f("hidden")}</Badge>
                  </Td>
                  <Td>
                    {canEdit && (
                      <span className="flex gap-1">
                        <button type="button" onClick={() => move(c.id, "up")} disabled={i === 0} aria-label={`${t("moveUp")} — ${c.nameEn}`} className="grid size-8 place-items-center border border-line text-muted disabled:opacity-30 hover:border-accent">
                          <ArrowUp size={14} />
                        </button>
                        <button type="button" onClick={() => move(c.id, "down")} disabled={i === rows.length - 1} aria-label={`${t("moveDown")} — ${c.nameEn}`} className="grid size-8 place-items-center border border-line text-muted disabled:opacity-30 hover:border-accent">
                          <ArrowDown size={14} />
                        </button>
                      </span>
                    )}
                  </Td>
                  <Td className="text-end">
                    <span className="flex justify-end gap-2">
                      {canEdit && (
                        <button type="button" onClick={() => setOpen(c)} aria-label={`${f("edit")} — ${c.nameEn}`} className="grid size-8 place-items-center border border-line text-muted hover:border-accent hover:text-foreground">
                          <Pencil size={14} />
                        </button>
                      )}
                      {canDelete && (
                        <button type="button" onClick={() => setConfirm(c)} aria-label={`${f("delete")} — ${c.nameEn}`} className="grid size-8 place-items-center border border-line text-muted hover:border-brand hover:text-brand">
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
      </Card>

      <Drawer
        open={open !== null}
        onClose={() => setOpen(null)}
        title={open === "new" ? t("newTitle") : t("editTitle")}
        className="w-[min(94vw,34rem)]"
      >
        {open && (
          <CategoryForm
            row={open === "new" ? null : open}
            parents={rows}
            onDone={() => setOpen(null)}
            onCancel={() => setOpen(null)}
          />
        )}
      </Drawer>

      <ConfirmDialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={f("deleteTitle", { name: confirm ? confirm.nameEn : "" })}
        body={f("deleteBody")}
        confirmLabel={f("deleteConfirm")}
        formAction={deleteIt}
      />
    </>
  );
}
