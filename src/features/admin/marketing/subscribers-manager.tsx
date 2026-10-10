"use client";

import { Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Badge, Card, CardHeader, EmptyState, TableWrap, Td, Th } from "@/components/admin/primitives";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { useRouter } from "@/i18n/navigation";
import { formatDate } from "@/lib/format";
import type { Loc } from "@/lib/localize";
import { deleteSubscriberAction } from "@/server/actions/admin-content";

export type SubscriberRow = { id: string; email: string; locale: string; source: string; createdAt: Date };

type Props = { rows: SubscriberRow[]; canDelete: boolean; emptyIcon?: React.ReactNode };

/** Newsletter subscriber list with a guarded remove. */
export function SubscribersManager({ rows, canDelete, emptyIcon }: Props) {
  const t = useTranslations("admin.marketing");
  const f = useTranslations("admin.form");
  const loc = useLocale() as Loc;
  const router = useRouter();
  const [confirm, setConfirm] = useState<SubscriberRow | null>(null);

  const remove = () => {
    const target = confirm;
    setConfirm(null);
    if (!target) return;
    const fd = new FormData();
    fd.set("id", target.id);
    return deleteSubscriberAction(fd).then(() => router.refresh());
  };

  return (
    <>
      <Card>
        <CardHeader title={t("listTitle")} />
        {rows.length === 0 ? (
          <EmptyState icon={emptyIcon} title={t("empty")} body={t("emptyBody")} />
        ) : (
          <TableWrap>
            <thead>
              <tr className="border-b border-line">
                <Th>{t("cols.email")}</Th>
                <Th>{t("cols.locale")}</Th>
                <Th>{t("cols.source")}</Th>
                <Th>{t("cols.subscribed")}</Th>
                <Th className="text-end">
                  <span className="sr-only">{f("actions")}</span>
                </Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((s) => (
                <tr key={s.id} className="hover:bg-brand/5">
                  <Td>
                    <span dir="ltr" className="block break-all text-start font-medium">
                      {s.email}
                    </span>
                  </Td>
                  <Td>
                    <Badge tone="neutral">{s.locale === "ar" ? t("locales.ar") : t("locales.en")}</Badge>
                  </Td>
                  <Td className="text-muted">{s.source === "footer" ? t("sources.footer") : <span dir="ltr">{s.source}</span>}</Td>
                  <Td className="whitespace-nowrap text-muted">{formatDate(s.createdAt, loc)}</Td>
                  <Td className="text-end">
                    {canDelete ? (
                      <button
                        type="button"
                        onClick={() => setConfirm(s)}
                        aria-label={`${f("delete")} — ${s.email}`}
                        className="grid size-8 place-items-center border border-line text-muted hover:border-brand hover:text-brand ms-auto"
                      >
                        <Trash2 size={14} />
                      </button>
                    ) : null}
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
        title={f("deleteTitle", { name: confirm ? confirm.email : "" })}
        body={f("deleteBody")}
        confirmLabel={f("deleteConfirm")}
        formAction={remove}
      />
    </>
  );
}
