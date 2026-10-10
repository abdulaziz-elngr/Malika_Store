"use client";

import { Check, Star, StarOff, Trash2, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Badge, Card, CardHeader, EmptyState, TableWrap, Td, Th, type BadgeTone } from "@/components/admin/primitives";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { useRouter } from "@/i18n/navigation";
import { formatDate } from "@/lib/format";
import { pick, type Loc } from "@/lib/localize";
import { moderateReviewAction } from "@/server/actions/admin-sales";

export type ReviewListItem = {
  id: string;
  name: string;
  email: string | null;
  rating: number;
  body: string;
  status: "pending" | "approved" | "rejected";
  featured: boolean;
  createdAt: Date;
  productNameAr: string;
  productNameEn: string;
  customerEmail: string | null;
};

type Props = { rows: ReviewListItem[]; canEdit: boolean; emptyIcon?: React.ReactNode };

const STATUS_TONE: Record<string, BadgeTone> = { pending: "copper", approved: "sage", rejected: "brand" };
const ICON_BTN = "grid size-8 shrink-0 place-items-center border border-line text-muted hover:border-accent hover:text-foreground";
const DELETE_BTN = "grid size-8 shrink-0 place-items-center border border-line text-muted hover:border-brand hover:text-brand";

/** Review queue: only the legal moderation actions are offered for each row's state. */
export function ReviewsManager({ rows, canEdit, emptyIcon }: Props) {
  const t = useTranslations("admin.reviews");
  const f = useTranslations("admin.form");
  const loc = useLocale() as Loc;
  const router = useRouter();
  const [confirm, setConfirm] = useState<ReviewListItem | null>(null);

  const run = (id: string, action: "approve" | "reject" | "feature" | "unfeature" | "delete") => {
    const fd = new FormData();
    fd.set("id", id);
    fd.set("action", action);
    return moderateReviewAction(fd).then(() => router.refresh());
  };

  return (
    <>
      <Card>
        <CardHeader title={t("listTitle")} />
        {rows.length === 0 ? (
          <EmptyState icon={emptyIcon ?? <Star size={30} strokeWidth={1.2} />} title={t("empty")} body={t("emptyBody")} />
        ) : (
          <TableWrap>
            <thead>
              <tr className="border-b border-line">
                <Th>{t("cols.product")}</Th>
                <Th>{t("cols.customer")}</Th>
                <Th>{t("cols.rating")}</Th>
                <Th>{t("cols.review")}</Th>
                <Th>{t("cols.date")}</Th>
                <Th className="text-end">
                  <span className="sr-only">{f("actions")}</span>
                </Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-brand/5">
                  <Td>
                    <p className="font-medium">{pick(loc, r.productNameAr, r.productNameEn)}</p>
                  </Td>
                  <Td>
                    <p className="truncate font-medium">{r.name}</p>
                    {(r.email ?? r.customerEmail) ? (
                      <p className="truncate text-xs text-muted" dir="ltr">
                        {r.email ?? r.customerEmail}
                      </p>
                    ) : null}
                  </Td>
                  <Td>
                    <span role="img" aria-label={t("ratingValue", { rating: r.rating })} className="inline-flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star key={n} size={14} aria-hidden className={n <= r.rating ? "fill-brand text-brand" : "text-line"} />
                      ))}
                    </span>
                  </Td>
                  <Td className="max-w-72">
                    <p className="truncate text-muted" title={r.body}>
                      {r.body.length > 140 ? `${r.body.slice(0, 140)}…` : r.body}
                    </p>
                    <span className="mt-1 flex flex-wrap gap-1.5">
                      <Badge tone={STATUS_TONE[r.status] ?? "neutral"}>{t(`statuses.${r.status}` as "statuses.pending")}</Badge>
                      {r.featured ? <Badge tone="brand">{t("featured")}</Badge> : null}
                    </span>
                  </Td>
                  <Td className="whitespace-nowrap text-muted">{formatDate(r.createdAt, loc)}</Td>
                  <Td className="text-end">
                    {canEdit ? (
                      <span className="flex justify-end gap-2">
                        {r.status !== "approved" ? (
                          <button type="button" onClick={() => run(r.id, "approve")} aria-label={`${t("approve")} — ${r.name}`} className={ICON_BTN}>
                            <Check size={14} />
                          </button>
                        ) : null}
                        {r.status !== "rejected" ? (
                          <button type="button" onClick={() => run(r.id, "reject")} aria-label={`${t("reject")} — ${r.name}`} className={ICON_BTN}>
                            <X size={14} />
                          </button>
                        ) : null}
                        {r.status === "approved" && !r.featured ? (
                          <button type="button" onClick={() => run(r.id, "feature")} aria-label={`${t("feature")} — ${r.name}`} className={ICON_BTN}>
                            <Star size={14} />
                          </button>
                        ) : null}
                        {r.featured ? (
                          <button type="button" onClick={() => run(r.id, "unfeature")} aria-label={`${t("unfeature")} — ${r.name}`} className={ICON_BTN}>
                            <StarOff size={14} />
                          </button>
                        ) : null}
                        <button type="button" onClick={() => setConfirm(r)} aria-label={`${f("delete")} — ${r.name}`} className={DELETE_BTN}>
                          <Trash2 size={14} />
                        </button>
                      </span>
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
        title={f("deleteTitle", { name: confirm ? confirm.name : "" })}
        body={f("deleteBody")}
        confirmLabel={f("deleteConfirm")}
        formAction={() => {
          const target = confirm;
          setConfirm(null);
          if (!target) return;
          return run(target.id, "delete");
        }}
      />
    </>
  );
}
