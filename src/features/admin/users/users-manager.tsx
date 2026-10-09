"use client";

import { Pencil, Plus, Trash2, Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Badge, Card, CardHeader, EmptyState, TableWrap, Td, Th } from "@/components/admin/primitives";
import { buttonClasses } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/format";
import { pick, type Loc } from "@/lib/localize";
import { StaffDeleteDialog } from "./staff-delete-dialog";

export type StaffRow = {
  id: string;
  name: string;
  email: string;
  active: boolean;
  lastLoginAt: Date | null;
  roleKey: string;
  roleNameEn: string;
  roleNameAr: string;
};

type Props = { rows: StaffRow[]; canCreate: boolean; canEdit: boolean; canDelete: boolean; emptyIcon?: React.ReactNode };

/** Staff account list; delete runs in a dialog so server-side guards stay visible. */
export function UsersManager({ rows, canCreate, canEdit, canDelete, emptyIcon }: Props) {
  const t = useTranslations("admin.users");
  const f = useTranslations("admin.form");
  const loc = useLocale() as Loc;
  const [confirm, setConfirm] = useState<StaffRow | null>(null);

  return (
    <>
      <Card>
        <CardHeader
          title={t("listTitle")}
          action={
            canCreate ? (
              <Link href="/admin/users/new" className={`${buttonClasses()} min-h-10 px-5 text-xs`}>
                <Plus size={15} /> {t("new")}
              </Link>
            ) : undefined
          }
        />
        {rows.length === 0 ? (
          <EmptyState icon={emptyIcon ?? <Users size={30} strokeWidth={1.2} />} title={t("empty")} body={t("emptyBody")} />
        ) : (
          <TableWrap>
            <thead>
              <tr className="border-b border-line">
                <Th>{t("name")}</Th>
                <Th>{t("email")}</Th>
                <Th>{t("role")}</Th>
                <Th>{f("status")}</Th>
                <Th>{t("lastActive")}</Th>
                <Th className="text-end">
                  <span className="sr-only">{f("actions")}</span>
                </Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-brand/5">
                  <Td className="font-medium">{r.name}</Td>
                  <Td dir="ltr" className="text-start text-muted">{r.email}</Td>
                  <Td className="text-muted">{pick(loc, r.roleNameAr, r.roleNameEn)}</Td>
                  <Td>
                    <Badge tone={r.active ? "sage" : "neutral"}>{r.active ? t("active") : t("inactive")}</Badge>
                  </Td>
                  <Td className="whitespace-nowrap text-muted">
                    {r.lastLoginAt ? formatDate(r.lastLoginAt, loc, true) : <span className="opacity-60">{t("never")}</span>}
                  </Td>
                  <Td className="text-end">
                    <span className="flex justify-end gap-2">
                      {canEdit && (
                        <Link href={`/admin/users/${r.id}`} aria-label={`${f("edit")} — ${r.name}`} className="grid size-8 place-items-center border border-line text-muted hover:border-accent hover:text-foreground">
                          <Pencil size={14} />
                        </Link>
                      )}
                      {canDelete && (
                        <button type="button" onClick={() => setConfirm(r)} aria-label={`${f("delete")} — ${r.name}`} className="grid size-8 place-items-center border border-line text-muted hover:border-brand hover:text-brand">
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

      <StaffDeleteDialog target={confirm} onClose={() => setConfirm(null)} />
    </>
  );
}
