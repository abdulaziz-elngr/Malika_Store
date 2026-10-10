"use client";

import { ArrowDown, ArrowUp, Pencil, Plus, Trash2, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Badge, Card, CardHeader, EmptyState, TableWrap, Td, Th } from "@/components/admin/primitives";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Drawer } from "@/components/admin/overlay";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { deleteAudienceAction, moveAudienceAction } from "@/server/actions/admin-audiences";
import { AudienceForm } from "./audience-form";
import type { AudienceRow } from "./types";

type Props = { rows: AudienceRow[]; canCreate: boolean; canEdit: boolean; canDelete: boolean };

/** The storefront page that lists an audience's products. Women and Men keep their original pages. */
const storefrontPath = (slug: string) => (slug === "women" ? "/women" : slug === "men" ? "/men" : `/for/${slug}`);

export function AudiencesManager({ rows, canCreate, canEdit, canDelete }: Props) {
  const t = useTranslations("admin.audiences");
  const f = useTranslations("admin.form");
  const router = useRouter();
  const [open, setOpen] = useState<null | "new" | AudienceRow>(null);
  const [confirm, setConfirm] = useState<AudienceRow | null>(null);

  const deleteIt = () => {
    const target = confirm;
    setConfirm(null);
    if (!target) return;
    const fd = new FormData();
    fd.set("id", target.id);
    return deleteAudienceAction(fd).then(() => router.refresh());
  };

  const move = (id: string, dir: "up" | "down") => {
    const fd = new FormData();
    fd.set("id", id);
    fd.set("dir", dir);
    return moveAudienceAction(fd).then(() => router.refresh());
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
          <EmptyState icon={<Users size={30} strokeWidth={1.2} />} title={t("empty")} body={t("emptyBody")} />
        ) : (
          <TableWrap>
            <thead>
              <tr className="border-b border-line">
                <Th>{f("nameEn")}</Th>
                <Th>{t("storefrontLink")}</Th>
                <Th>{t("productCount")}</Th>
                <Th>{f("visible")}</Th>
                <Th>{t("order")}</Th>
                <Th className="text-end">
                  <span className="sr-only">{f("actions")}</span>
                </Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((a, i) => (
                <tr key={a.id} className="hover:bg-brand/5">
                  <Td>
                    <p className="font-medium">{a.nameEn}</p>
                    <p className="text-xs text-muted">{a.nameAr}</p>
                  </Td>
                  <Td dir="ltr" className="text-muted">
                    {storefrontPath(a.slug)}
                  </Td>
                  <Td className="text-muted">{a.productCount}</Td>
                  <Td>
                    <Badge tone={a.visible ? "sage" : "neutral"}>{a.visible ? f("visible") : f("hidden")}</Badge>
                  </Td>
                  <Td>
                    {canEdit && (
                      <span className="flex gap-1">
                        <button type="button" onClick={() => move(a.id, "up")} disabled={i === 0} aria-label={`${t("moveUp")} — ${a.nameEn}`} className="grid size-8 place-items-center border border-line text-muted disabled:opacity-30 hover:border-accent">
                          <ArrowUp size={14} />
                        </button>
                        <button type="button" onClick={() => move(a.id, "down")} disabled={i === rows.length - 1} aria-label={`${t("moveDown")} — ${a.nameEn}`} className="grid size-8 place-items-center border border-line text-muted disabled:opacity-30 hover:border-accent">
                          <ArrowDown size={14} />
                        </button>
                      </span>
                    )}
                  </Td>
                  <Td className="text-end">
                    <span className="flex justify-end gap-2">
                      {canEdit && (
                        <button type="button" onClick={() => setOpen(a)} aria-label={`${f("edit")} — ${a.nameEn}`} className="grid size-8 place-items-center border border-line text-muted hover:border-accent hover:text-foreground">
                          <Pencil size={14} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => setConfirm(a)}
                          disabled={a.productCount > 0}
                          title={a.productCount > 0 ? t("inUse") : undefined}
                          aria-label={`${f("delete")} — ${a.nameEn}`}
                          className="grid size-8 place-items-center border border-line text-muted hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-30"
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
      </Card>

      <Drawer open={open !== null} onClose={() => setOpen(null)} title={open === "new" ? t("newTitle") : t("editTitle")} className="w-[min(94vw,30rem)]">
        {open && <AudienceForm row={open === "new" ? null : open} onDone={() => setOpen(null)} onCancel={() => setOpen(null)} />}
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
