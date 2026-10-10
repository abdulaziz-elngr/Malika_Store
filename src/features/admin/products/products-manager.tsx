"use client";

import { Copy, Package, Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Badge, Card, CardHeader, EmptyState, TableWrap, Td, Th, type BadgeTone } from "@/components/admin/primitives";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { buttonClasses } from "@/components/ui/button";
import { Link, useRouter } from "@/i18n/navigation";
import { deleteProductsAction, duplicateProductAction, setProductStatusAction } from "@/server/actions/admin-catalog";
import type { ProductListItem } from "../catalog/types";

type Props = { rows: ProductListItem[]; canCreate: boolean; canEdit: boolean; canDelete: boolean; canPublish: boolean; emptyIcon?: React.ReactNode };

const STATUS_TONE: Record<string, BadgeTone> = { published: "sage", draft: "copper", archived: "neutral" };

/** Product list: status switch, duplicate/delete actions, direct link into the editor. */
export function ProductsManager({ rows, canCreate, canEdit, canDelete, canPublish, emptyIcon }: Props) {
  const t = useTranslations("admin.products");
  const f = useTranslations("admin.form");
  const router = useRouter();
  const [confirm, setConfirm] = useState<ProductListItem | null>(null);

  const run = (fn: (fd: FormData) => Promise<void>, values: Record<string, string>) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(values)) fd.set(k, v);
    return fn(fd).then(() => router.refresh());
  };

  return (
    <>
      <Card>
        <CardHeader
          title={t("listTitle")}
          action={
            canCreate ? (
              <Link href="/admin/products/new" className={`${buttonClasses()} min-h-10 px-5 text-xs`}>
                <Plus size={15} /> {t("new")}
              </Link>
            ) : undefined
          }
        />
        {rows.length === 0 ? (
          <EmptyState icon={emptyIcon ?? <Package size={30} strokeWidth={1.2} />} title={t("empty")} body={t("emptyBody")} />
        ) : (
          <TableWrap>
            <thead>
              <tr className="border-b border-line">
                <Th>{t("cols.product")}</Th>
                <Th>{t("cols.price")}</Th>
                <Th>{t("cols.stock")}</Th>
                <Th>{f("status")}</Th>
                <Th>{t("cols.flags")}</Th>
                <Th className="text-end">
                  <span className="sr-only">{f("actions")}</span>
                </Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((p) => (
                <tr key={p.id} className="hover:bg-brand/5">
                  <Td>
                    <div className="flex items-center gap-3">
                      <span className="grid size-11 shrink-0 place-items-center overflow-hidden border border-line bg-brand/5 text-muted" aria-hidden>
                        {p.image ? (
                          // eslint-disable-next-line @next/next/no-img-element -- admin thumbnails accept arbitrary stored URLs
                          <img src={p.image} alt="" className="size-full object-cover" />
                        ) : (
                          <Package size={16} strokeWidth={1.4} />
                        )}
                      </span>
                      <span>
                        <p className="font-medium">{p.nameEn}</p>
                        <p className="text-xs text-muted">
                          {p.nameAr} · <span dir="ltr">{p.sku}</span>
                          {p.categoryNameEn ? ` · ${p.categoryNameEn}` : ""}
                        </p>
                      </span>
                    </div>
                  </Td>
                  <Td className="whitespace-nowrap">
                    {p.salePriceMinor != null ? (
                      <>
                        <span className="text-brand">{(p.salePriceMinor / 100).toLocaleString()}</span>{" "}
                        <s className="text-xs text-muted">{(p.priceMinor / 100).toLocaleString()}</s>
                      </>
                    ) : (
                      (p.priceMinor / 100).toLocaleString()
                    )}
                    <span className="ms-1 text-xs text-muted">{t("egp")}</span>
                  </Td>
                  <Td>
                    <Badge tone={p.stock === 0 ? "brand" : p.stock <= 5 ? "copper" : "neutral"}>{p.stock}</Badge>
                  </Td>
                  <Td>
                    {canPublish ? (
                      <form action={setProductStatusAction} className="m-0">
                        <input type="hidden" name="id" value={p.id} />
                        <select
                          name="status"
                          defaultValue={p.status}
                          aria-label={`${f("status")} — ${p.nameEn}`}
                          onChange={(e) => e.currentTarget.form?.requestSubmit()}
                          className="h-9 border border-line bg-surface px-2 text-xs text-foreground outline-none focus:border-brand"
                        >
                          <option value="published">{t("statuses.published")}</option>
                          <option value="draft">{t("statuses.draft")}</option>
                          <option value="archived">{t("statuses.archived")}</option>
                        </select>
                      </form>
                    ) : (
                      <Badge tone={STATUS_TONE[p.status]}>{t(`statuses.${p.status}` as "statuses.draft")}</Badge>
                    )}
                  </Td>
                  <Td>
                    <span className="flex flex-wrap gap-1">
                      {p.featured && <Badge tone="brand">{t("flags.featured")}</Badge>}
                      {p.isNew && <Badge tone="sage">{t("flags.isNew")}</Badge>}
                      {p.bestSeller && <Badge tone="copper">{t("flags.bestSeller")}</Badge>}
                    </span>
                  </Td>
                  <Td className="text-end">
                    <span className="flex justify-end gap-2">
                      {canEdit && (
                        <Link href={`/admin/products/${p.id}`} aria-label={`${f("edit")} — ${p.nameEn}`} className="grid size-8 place-items-center border border-line text-muted hover:border-accent hover:text-foreground">
                          <Pencil size={14} />
                        </Link>
                      )}
                      {canCreate && (
                        <button type="button" onClick={() => run(duplicateProductAction, { id: p.id })} aria-label={`${f("duplicate")} — ${p.nameEn}`} className="grid size-8 place-items-center border border-line text-muted hover:border-accent hover:text-foreground">
                          <Copy size={14} />
                        </button>
                      )}
                      {canDelete && (
                        <button type="button" onClick={() => setConfirm(p)} aria-label={`${f("delete")} — ${p.nameEn}`} className="grid size-8 place-items-center border border-line text-muted hover:border-brand hover:text-brand">
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
        title={f("deleteTitle", { name: confirm ? confirm.nameEn : "" })}
        body={f("deleteBody")}
        confirmLabel={f("deleteConfirm")}
        formAction={() => {
          const target = confirm;
          setConfirm(null);
          if (!target) return;
          return run(deleteProductsAction, { id: target.id });
        }}
      />
    </>
  );
}
