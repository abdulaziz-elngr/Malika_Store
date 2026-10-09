"use client";

import { LayoutGrid, Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Badge, Card, CardHeader, EmptyState, TableWrap, Td, Th } from "@/components/admin/primitives";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Drawer } from "@/components/admin/overlay";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { deleteCollectionAction } from "@/server/actions/admin-catalog";
import type { CollectionRow } from "../catalog/types";
import { CollectionForm } from "./collection-form";

type Row = CollectionRow & { productIds: string[] };
type ProductOption = { id: string; nameEn: string; nameAr: string; sku: string };
type Props = { rows: Row[]; products: ProductOption[]; canCreate: boolean; canEdit: boolean; canDelete: boolean; emptyIcon?: React.ReactNode };

/** Collection list with a drawer form (incl. product assignment) and a guarded delete. */
export function CollectionsManager({ rows, products, canCreate, canEdit, canDelete, emptyIcon }: Props) {
  const t = useTranslations("admin.collections");
  const f = useTranslations("admin.form");
  const router = useRouter();
  const [open, setOpen] = useState<null | "new" | Row>(null);
  const [confirm, setConfirm] = useState<Row | null>(null);

  const deleteIt = () => {
    const target = confirm;
    setConfirm(null);
    if (!target) return;
    const fd = new FormData();
    fd.set("id", target.id);
    return deleteCollectionAction(fd).then(() => router.refresh());
  };

  const now = Date.now();
  const windowLabel = (r: Row) => {
    if (!r.startsAt && !r.endsAt) return null;
    const from = r.startsAt ? new Date(r.startsAt) : null;
    const to = r.endsAt ? new Date(r.endsAt) : null;
    const live = (!from || from.getTime() <= now) && (!to || to.getTime() >= now);
    return <Badge tone={live ? "sage" : "neutral"}>{live ? t("live") : t("scheduled")}</Badge>;
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
          <EmptyState icon={emptyIcon ?? <LayoutGrid size={30} strokeWidth={1.2} />} title={t("empty")} body={t("emptyBody")} />
        ) : (
          <TableWrap>
            <thead>
              <tr className="border-b border-line">
                <Th>{f("nameEn")}</Th>
                <Th>{t("slug")}</Th>
                <Th>{t("products")}</Th>
                <Th>{t("window")}</Th>
                <Th>{f("visible")}</Th>
                <Th className="text-end">
                  <span className="sr-only">{f("actions")}</span>
                </Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((c) => (
                <tr key={c.id} className="hover:bg-brand/5">
                  <Td>
                    <p className="font-medium">{c.nameEn}</p>
                    <p className="text-xs text-muted">{c.nameAr}</p>
                  </Td>
                  <Td dir="ltr" className="text-muted">
                    /{c.slug}
                  </Td>
                  <Td className="text-muted">{c.productCount}</Td>
                  <Td>{windowLabel(c) ?? <span className="text-xs text-muted">{t("always")}</span>}</Td>
                  <Td>
                    <Badge tone={c.visible ? "sage" : "neutral"}>{c.visible ? f("visible") : f("hidden")}</Badge>
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

      <Drawer open={open !== null} onClose={() => setOpen(null)} title={open === "new" ? t("newTitle") : t("editTitle")} className="w-[min(96vw,40rem)]">
        {open && <CollectionForm row={open === "new" ? null : open} products={products} onDone={() => setOpen(null)} onCancel={() => setOpen(null)} />}
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
