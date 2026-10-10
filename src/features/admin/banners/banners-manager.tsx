"use client";

import { Megaphone, Pencil, Plus, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Badge, Card, CardHeader, EmptyState, TableWrap, Td, Th, type BadgeTone } from "@/components/admin/primitives";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Drawer } from "@/components/admin/overlay";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { deleteBannerAction, toggleBannerAction } from "@/server/actions/admin-content";
import { BannerForm } from "./banner-form";
import type { BannerDTO } from "./types";

type Props = { rows: BannerDTO[]; canCreate: boolean; canEdit: boolean; canDelete: boolean; emptyIcon?: React.ReactNode };

const POSITION_TONE: Record<string, BadgeTone> = { home: "brand", promo: "copper", strip: "sage", campaign: "neutral" };

/** Banner list with a drawer form, an inline visibility switch and a guarded delete. */
export function BannersManager({ rows, canCreate, canEdit, canDelete, emptyIcon }: Props) {
  const t = useTranslations("admin.banners");
  const f = useTranslations("admin.form");
  const locale = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState<null | "new" | BannerDTO>(null);
  const [confirm, setConfirm] = useState<BannerDTO | null>(null);
  const dateFmt = useMemo(() => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }), [locale]);
  const day = (d: Date | null) => (d ? dateFmt.format(new Date(d)) : "");

  const run = (fn: (fd: FormData) => Promise<void>, values: Record<string, string>) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(values)) fd.set(k, v);
    return fn(fd).then(() => router.refresh());
  };

  const deleteIt = () => {
    const target = confirm;
    setConfirm(null);
    if (!target) return;
    return run(deleteBannerAction, { id: target.id });
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
          <EmptyState icon={emptyIcon ?? <Megaphone size={30} strokeWidth={1.2} />} title={t("empty")} body={t("emptyBody")} />
        ) : (
          <TableWrap>
            <thead>
              <tr className="border-b border-line">
                <Th>{t("cols.banner")}</Th>
                <Th>{t("cols.position")}</Th>
                <Th>{t("cols.schedule")}</Th>
                <Th>{f("visible")}</Th>
                <Th className="text-end">
                  <span className="sr-only">{f("actions")}</span>
                </Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((b) => (
                <tr key={b.id} className="hover:bg-brand/5">
                  <Td>
                    <p className="font-medium">{b.titleEn}</p>
                    <p className="text-xs text-muted">{b.titleAr}</p>
                  </Td>
                  <Td>
                    <Badge tone={POSITION_TONE[b.position] ?? "neutral"}>{t(`positions.${b.position}` as "positions.home")}</Badge>
                  </Td>
                  <Td className="whitespace-nowrap text-xs text-muted">
                    {b.startsAt || b.endsAt ? (
                      <span className="grid gap-1">
                        <span>
                          {t("startsAt")}{" "}
                          <time dateTime={b.startsAt ? new Date(b.startsAt).toISOString() : undefined} className="text-foreground">
                            {day(b.startsAt) || "—"}
                          </time>
                        </span>
                        <span>
                          {t("endsAt")}{" "}
                          <time dateTime={b.endsAt ? new Date(b.endsAt).toISOString() : undefined} className="text-foreground">
                            {day(b.endsAt) || "—"}
                          </time>
                        </span>
                      </span>
                    ) : (
                      <Badge tone="sage">{t("always")}</Badge>
                    )}
                  </Td>
                  <Td>
                    <input
                      type="checkbox"
                      checked={b.visible}
                      disabled={!canEdit}
                      onChange={() => void run(toggleBannerAction, { id: b.id, visible: String(!b.visible) })}
                      aria-label={`${f("visible")} — ${b.titleEn}`}
                      className="size-4 accent-[var(--color-brand,#67251b)]"
                    />
                  </Td>
                  <Td className="text-end">
                    <span className="flex justify-end gap-2">
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => setOpen(b)}
                          aria-label={`${f("edit")} — ${b.titleEn}`}
                          className="grid size-8 place-items-center border border-line text-muted hover:border-accent hover:text-foreground"
                        >
                          <Pencil size={14} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => setConfirm(b)}
                          aria-label={`${f("delete")} — ${b.titleEn}`}
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

      <Drawer
        open={open !== null}
        onClose={() => setOpen(null)}
        title={open === "new" ? t("newTitle") : t("editTitle")}
        className="w-[min(94vw,38rem)]"
      >
        {open && <BannerForm row={open === "new" ? null : open} onDone={() => setOpen(null)} onCancel={() => setOpen(null)} />}
      </Drawer>

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
