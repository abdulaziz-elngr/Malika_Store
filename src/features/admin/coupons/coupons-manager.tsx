"use client";

import { Pencil, Plus, TicketPercent, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Badge, Card, CardHeader, EmptyState, TableWrap, Td, Th } from "@/components/admin/primitives";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { buttonClasses } from "@/components/ui/button";
import { Link, useRouter } from "@/i18n/navigation";
import { formatDate } from "@/lib/format";
import { formatMoney, pick, type Loc } from "@/lib/localize";
import { deleteCouponAction, toggleCouponAction } from "@/server/actions/admin-sales";
import type { CouponRow } from "./types";

type Props = {
  rows: CouponRow[];
  /** Authoritative per-coupon usage counts (id → uses), computed on the server. */
  usage: Record<string, number>;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  emptyIcon?: React.ReactNode;
};

/** Coupon list: value display, real usage counts, an active switch and a guarded delete. */
export function CouponsManager({ rows, usage, canCreate, canEdit, canDelete, emptyIcon }: Props) {
  const t = useTranslations("admin.coupons");
  const f = useTranslations("admin.form");
  const loc = useLocale() as Loc;
  const router = useRouter();
  const [confirm, setConfirm] = useState<CouponRow | null>(null);

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
              <Link href="/admin/coupons/new" className={`${buttonClasses()} min-h-10 px-5 text-xs`}>
                <Plus size={15} /> {t("new")}
              </Link>
            ) : undefined
          }
        />
        {rows.length === 0 ? (
          <EmptyState icon={emptyIcon ?? <TicketPercent size={30} strokeWidth={1.2} />} title={t("empty")} body={t("emptyBody")} />
        ) : (
          <TableWrap>
            <thead>
              <tr className="border-b border-line">
                <Th>{t("cols.code")}</Th>
                <Th>{t("cols.discount")}</Th>
                <Th>{t("cols.usage")}</Th>
                <Th>{t("cols.active")}</Th>
                <Th>{f("createdAt")}</Th>
                <Th className="text-end">
                  <span className="sr-only">{f("actions")}</span>
                </Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((c) => {
                const used = usage[c.id] ?? 0;
                return (
                  <tr key={c.id} className="hover:bg-brand/5">
                    <Td>
                      <p className="font-medium" dir="ltr">
                        <span className="block text-start">{c.code}</span>
                      </p>
                      <p className="truncate text-xs text-muted">{pick(loc, c.descriptionAr, c.descriptionEn)}</p>
                    </Td>
                    <Td className="whitespace-nowrap tabular-nums">
                      {c.type === "percent" ? `${c.value}%` : formatMoney(c.value, loc)}
                    </Td>
                    <Td className="whitespace-nowrap text-muted">
                      {c.usageLimit != null ? t("usage", { used, limit: c.usageLimit }) : t("usageNoLimit", { used })}
                    </Td>
                    <Td>
                      {canEdit ? (
                        <button
                          type="button"
                          role="switch"
                          aria-checked={c.active}
                          aria-label={`${c.active ? t("deactivate") : t("activate")} — ${c.code}`}
                          onClick={() => run(toggleCouponAction, { id: c.id, active: String(!c.active) })}
                          className="inline-flex border border-transparent p-0.5"
                        >
                          <Badge tone={c.active ? "sage" : "neutral"}>{c.active ? t("active") : t("inactive")}</Badge>
                        </button>
                      ) : (
                        <Badge tone={c.active ? "sage" : "neutral"}>{c.active ? t("active") : t("inactive")}</Badge>
                      )}
                    </Td>
                    <Td className="whitespace-nowrap text-muted">{formatDate(c.createdAt, loc)}</Td>
                    <Td className="text-end">
                      <span className="flex justify-end gap-2">
                        {canEdit ? (
                          <Link href={`/admin/coupons/${c.id}`} aria-label={`${f("edit")} — ${c.code}`} className="grid size-8 place-items-center border border-line text-muted hover:border-accent hover:text-foreground">
                            <Pencil size={14} />
                          </Link>
                        ) : null}
                        {canDelete ? (
                          <button type="button" onClick={() => setConfirm(c)} aria-label={`${f("delete")} — ${c.code}`} className="grid size-8 place-items-center border border-line text-muted hover:border-brand hover:text-brand">
                            <Trash2 size={14} />
                          </button>
                        ) : null}
                      </span>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </TableWrap>
        )}
      </Card>

      <ConfirmDialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={f("deleteTitle", { name: confirm ? confirm.code : "" })}
        body={f("deleteBody")}
        confirmLabel={f("deleteConfirm")}
        formAction={() => {
          const target = confirm;
          setConfirm(null);
          if (!target) return;
          return run(deleteCouponAction, { id: target.id });
        }}
      />
    </>
  );
}
