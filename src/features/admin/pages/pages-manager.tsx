"use client";

import { FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Badge, Card, CardHeader, EmptyState, TableWrap, Td, Th } from "@/components/admin/primitives";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { buttonClasses } from "@/components/ui/button";
import { Link, useRouter } from "@/i18n/navigation";
import { deletePageAction } from "@/server/actions/admin-content";
import type { PageDTO } from "./types";

type Props = { rows: PageDTO[]; canCreate: boolean; canDelete: boolean; emptyIcon?: React.ReactNode };

/** CMS page list: links into the editor plus a guarded delete. */
export function PagesManager({ rows, canCreate, canDelete, emptyIcon }: Props) {
  const t = useTranslations("admin.pages");
  const f = useTranslations("admin.form");
  const locale = useLocale();
  const router = useRouter();
  const [confirm, setConfirm] = useState<PageDTO | null>(null);
  const dateFmt = useMemo(() => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }), [locale]);

  const deleteIt = () => {
    const target = confirm;
    setConfirm(null);
    if (!target) return;
    const fd = new FormData();
    fd.set("id", target.id);
    return deletePageAction(fd).then(() => router.refresh());
  };

  return (
    <>
      <Card>
        <CardHeader
          title={t("listTitle")}
          action={
            canCreate ? (
              <Link href="/admin/pages/new" className={`${buttonClasses()} min-h-10 px-5 text-xs`}>
                <Plus size={15} /> {t("new")}
              </Link>
            ) : undefined
          }
        />
        {rows.length === 0 ? (
          <EmptyState icon={emptyIcon ?? <FileText size={30} strokeWidth={1.2} />} title={t("empty")} body={t("emptyBody")} />
        ) : (
          <TableWrap>
            <thead>
              <tr className="border-b border-line">
                <Th>{t("cols.page")}</Th>
                <Th>{t("slug")}</Th>
                <Th>{f("visible")}</Th>
                <Th>{f("updatedAt")}</Th>
                <Th className="text-end">
                  <span className="sr-only">{f("actions")}</span>
                </Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((p) => (
                <tr key={p.id} className="hover:bg-brand/5">
                  <Td>
                    <Link href={`/admin/pages/${p.id}`} className="font-medium hover:text-brand hover:underline underline-offset-4">
                      {p.titleEn}
                    </Link>
                    <p className="text-xs text-muted">{p.titleAr}</p>
                  </Td>
                  <Td dir="ltr" className="text-muted">
                    /{p.slug}
                  </Td>
                  <Td>
                    <Badge tone={p.visible ? "sage" : "neutral"}>{p.visible ? f("visible") : f("hidden")}</Badge>
                  </Td>
                  <Td className="whitespace-nowrap text-xs text-muted">
                    <time dateTime={new Date(p.updatedAt).toISOString()}>{dateFmt.format(new Date(p.updatedAt))}</time>
                  </Td>
                  <Td className="text-end">
                    <span className="flex justify-end gap-2">
                      <Link
                        href={`/admin/pages/${p.id}`}
                        aria-label={`${f("edit")} — ${p.titleEn}`}
                        className="grid size-8 place-items-center border border-line text-muted hover:border-accent hover:text-foreground"
                      >
                        <Pencil size={14} />
                      </Link>
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => setConfirm(p)}
                          aria-label={`${f("delete")} — ${p.titleEn}`}
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
      </Card>

      <ConfirmDialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={f("deleteTitle", { name: confirm ? confirm.titleEn : "" })}
        body={f("deleteBody")}
        confirmLabel={f("deleteConfirm")}
        formAction={deleteIt}
      />
    </>
  );
}
