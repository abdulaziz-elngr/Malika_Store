"use client";

import { Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Badge, Card, CardHeader, EmptyState, TableWrap, Td, Th } from "@/components/admin/primitives";
import { buttonClasses } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { RoleDeleteDialog } from "./role-delete-dialog";

export type RoleRow = { id: string; key: string; nameAr: string; nameEn: string; isSystem: boolean; permCount: number; userCount: number };

type Props = { rows: RoleRow[]; canCreate: boolean; canEdit: boolean; canDelete: boolean; emptyIcon?: React.ReactNode };

/** Role list; system roles cannot be deleted, so their delete button is hidden. */
export function RolesManager({ rows, canCreate, canEdit, canDelete, emptyIcon }: Props) {
  const t = useTranslations("admin.roles");
  const f = useTranslations("admin.form");
  const [confirm, setConfirm] = useState<RoleRow | null>(null);

  return (
    <>
      <Card>
        <CardHeader
          title={t("listTitle")}
          action={
            canCreate ? (
              <Link href="/admin/roles/new" className={`${buttonClasses()} min-h-10 px-5 text-xs`}>
                <Plus size={15} /> {t("new")}
              </Link>
            ) : undefined
          }
        />
        {rows.length === 0 ? (
          <EmptyState icon={emptyIcon ?? <ShieldCheck size={30} strokeWidth={1.2} />} title={t("empty")} body={t("emptyBody")} />
        ) : (
          <TableWrap>
            <thead>
              <tr className="border-b border-line">
                <Th>{t("key")}</Th>
                <Th>{f("nameEn")}</Th>
                <Th>{f("nameAr")}</Th>
                <Th>{t("permissionsCount")}</Th>
                <Th>{t("staffCount")}</Th>
                <Th className="text-end">
                  <span className="sr-only">{f("actions")}</span>
                </Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-brand/5">
                  <Td>
                    <span className="flex items-center gap-2">
                      <code dir="ltr" className="text-xs text-muted">{r.key}</code>
                      {r.isSystem && <Badge tone="copper">{t("system")}</Badge>}
                    </span>
                  </Td>
                  <Td className="font-medium">{r.nameEn}</Td>
                  <Td className="text-muted">{r.nameAr}</Td>
                  <Td className="text-muted">{r.permCount}</Td>
                  <Td className="text-muted">{r.userCount}</Td>
                  <Td className="text-end">
                    <span className="flex justify-end gap-2">
                      {canEdit && (
                        <Link href={`/admin/roles/${r.id}`} aria-label={`${f("edit")} — ${r.nameEn}`} className="grid size-8 place-items-center border border-line text-muted hover:border-accent hover:text-foreground">
                          <Pencil size={14} />
                        </Link>
                      )}
                      {canDelete && !r.isSystem && (
                        <button type="button" onClick={() => setConfirm(r)} aria-label={`${f("delete")} — ${r.nameEn}`} className="grid size-8 place-items-center border border-line text-muted hover:border-brand hover:text-brand">
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

      <RoleDeleteDialog target={confirm} onClose={() => setConfirm(null)} />
    </>
  );
}
