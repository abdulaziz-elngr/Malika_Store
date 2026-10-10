"use client";

import { History, SlidersHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { Badge, Card, CardHeader, EmptyState, TableWrap, Td, Th, type BadgeTone } from "@/components/admin/primitives";
import { Drawer } from "@/components/admin/overlay";
import { Button } from "@/components/ui/button";
import { Field, FormError, inputClass } from "@/components/ui/field";
import { useRouter } from "@/i18n/navigation";
import { adjustStockAction, listMovementsAction } from "@/server/actions/admin-catalog";
import { useActionState } from "react";
import type { ActionState, MovementDTO } from "@/server/actions/types";
import type { VariantRow } from "../catalog/types";

type Props = { rows: VariantRow[]; threshold: number; canEdit: boolean; emptyIcon?: React.ReactNode };

const REASONS = ["initial", "return", "adjustment", "damage"] as const;
/** Reasons the checkout flow writes itself; shown read-only in the history. */
const reasonLabel = (t: (k: never) => string, reason: string) =>
  [...REASONS, "sale"].includes(reason) ? t(`reasons.${reason}` as never) : reason;

export function InventoryManager({ rows, threshold, canEdit, emptyIcon }: Props) {
  const t = useTranslations("admin.inventory");
  const f = useTranslations("admin.form");
  const [open, setOpen] = useState<VariantRow | null>(null);

  return (
    <>
      <Card>
        <CardHeader title={t("listTitle")} />
        {rows.length === 0 ? (
          <EmptyState icon={emptyIcon ?? <History size={30} strokeWidth={1.2} />} title={t("empty")} body={t("emptyBody")} />
        ) : (
          <TableWrap>
            <thead>
              <tr className="border-b border-line">
                <Th>{t("cols.product")}</Th>
                <Th>{t("cols.variant")}</Th>
                <Th dir="ltr">{t("cols.sku")}</Th>
                <Th>{t("cols.stock")}</Th>
                <Th>{t("cols.price")}</Th>
                <Th className="text-end">
                  <span className="sr-only">{f("actions")}</span>
                </Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.v.id} className="hover:bg-brand/5">
                  <Td>
                    <p className="font-medium">{r.nameEn}</p>
                    <p className="text-xs text-muted">{r.nameAr}</p>
                  </Td>
                  <Td className="whitespace-nowrap text-muted">
                    {r.v.size} · {r.v.colorNameEn}
                  </Td>
                  <Td dir="ltr" className="text-muted">
                    {r.v.sku}
                  </Td>
                  <Td>
                    <Badge tone={stockTone(r.v.stock, threshold)}>{r.v.stock}</Badge>
                  </Td>
                  <Td className="whitespace-nowrap text-muted">{(r.v.priceMinor ?? r.priceMinor) / 100}</Td>
                  <Td className="text-end">
                    <button
                      type="button"
                      onClick={() => setOpen(r)}
                      aria-label={`${t("adjust")} — ${r.nameEn} ${r.v.size}`}
                      className="inline-flex size-8 items-center justify-center border border-line text-muted hover:border-accent hover:text-foreground"
                    >
                      <SlidersHorizontal size={14} />
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Card>

      <Drawer open={open !== null} onClose={() => setOpen(null)} title={open ? `${open.nameEn} · ${open.v.size}` : ""} className="w-[min(94vw,32rem)]">
        {open && <AdjustPanel row={open} threshold={threshold} canEdit={canEdit} onDone={() => setOpen(null)} />}
      </Drawer>
    </>
  );
}

function stockTone(stock: number, threshold: number): BadgeTone {
  if (stock === 0) return "brand";
  if (stock <= threshold) return "copper";
  return "sage";
}

/** Adjust form + the movement trail of one variant, refreshed after every change. */
function AdjustPanel({ row, threshold, canEdit, onDone }: { row: VariantRow; threshold: number; canEdit: boolean; onDone: () => void }) {
  const t = useTranslations("admin.inventory");
  const f = useTranslations("admin.form");
  const router = useRouter();
  const [state, action, pending] = useActionState(adjustStockAction, {} as ActionState);
  const [mode, setMode] = useState<"delta" | "set">("delta");
  const [direction, setDirection] = useState<"up" | "down">("up");
  const [movements, setMovements] = useState<MovementDTO[] | null>(null);

  const load = useCallback(() => {
    const fd = new FormData();
    fd.set("variantId", row.v.id);
    listMovementsAction(fd).then(setMovements);
  }, [row.v.id]);

  useEffect(load, [load]);
  useEffect(() => {
    if (state.ok) {
      load();
      router.refresh();
    }
  }, [state, load, router]);

  return (
    <div className="space-y-6 p-5">
      <div className="flex items-center justify-between gap-3 border border-line bg-brand/5 p-4">
        <span className="text-sm text-muted">{t("currentStock")}</span>
        <Badge tone={stockTone(row.v.stock, threshold)} className="text-base">
          {row.v.stock}
        </Badge>
      </div>

      {canEdit ? (
        <form action={action} className="space-y-5" noValidate aria-busy={pending}>
          <input type="hidden" name="variantId" value={row.v.id} />
          <input type="hidden" name="mode" value={mode} />
          <input type="hidden" name="direction" value={direction} />
          <FormError error={state.errors?.form} />

          <div className="flex gap-2">
            <button type="button" onClick={() => setMode("delta")} aria-pressed={mode === "delta"} className={`flex-1 border px-3 py-2 text-xs ${mode === "delta" ? "border-brand bg-brand text-brand-contrast" : "border-line text-muted"}`}>
              {t("modeDelta")}
            </button>
            <button type="button" onClick={() => setMode("set")} aria-pressed={mode === "set"} className={`flex-1 border px-3 py-2 text-xs ${mode === "set" ? "border-brand bg-brand text-brand-contrast" : "border-line text-muted"}`}>
              {t("modeSet")}
            </button>
          </div>

          {mode === "delta" && (
            <div className="flex gap-2">
              <button type="button" onClick={() => setDirection("up")} aria-pressed={direction === "up"} className={`flex-1 border px-3 py-2 text-xs ${direction === "up" ? "border-brand bg-brand text-brand-contrast" : "border-line text-muted"}`}>
                {t("directionUp")}
              </button>
              <button type="button" onClick={() => setDirection("down")} aria-pressed={direction === "down"} className={`flex-1 border px-3 py-2 text-xs ${direction === "down" ? "border-brand bg-brand text-brand-contrast" : "border-line text-muted"}`}>
                {t("directionDown")}
              </button>
            </div>
          )}

          <Field label={mode === "delta" ? t("quantity") : t("target")} error={state.errors?.quantity}>
            {(p) => <input {...p} name="quantity" dir="ltr" inputMode="numeric" min={0} defaultValue="1" required className={inputClass} />}
          </Field>

          <Field label={t("reason")} error={state.errors?.reason}>
            {(p) => (
              <select {...p} name="reason" defaultValue="adjustment" className={inputClass}>
                {REASONS.map((r) => (
                  <option key={r} value={r}>
                    {t(`reasons.${r}` as "reasons.adjustment")}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <Field label={t("note")} error={state.errors?.note}>
            {(p) => <input {...p} name="note" maxLength={300} placeholder={t("notePlaceholder")} className={inputClass} />}
          </Field>

          <p role="status" aria-live="polite" className="text-sm text-sage-700 dark:text-sage-200">
            {state.ok ? f("saved") : ""}
          </p>
          <div className="flex justify-between gap-3 border-t border-line pt-5">
            <Button type="button" variant="secondary" onClick={onDone} className="min-h-11 px-6">
              {f("back")}
            </Button>
            <Button type="submit" disabled={pending} aria-busy={pending} className="min-h-11 px-6">
              {pending ? f("saving") : t("apply")}
            </Button>
          </div>
        </form>
      ) : (
        <p className="text-sm text-muted">{t("readOnly")}</p>
      )}

      <section className="space-y-3 border-t border-line pt-5">
        <h3 className="text-xs uppercase tracking-[0.2em] text-accent">{t("movements")}</h3>
        {!movements ? null : movements.length === 0 ? (
          <p className="text-sm text-muted">{t("noMovements")}</p>
        ) : (
          <ul className="divide-y divide-line border border-line text-sm">
            {movements.map((m) => (
              <li key={m.id} className="flex items-start justify-between gap-3 p-3">
                <span>
                  <span className={m.delta >= 0 ? "text-sage-700 dark:text-sage-200" : "text-brand"}>
                    {m.delta > 0 ? `+${m.delta}` : m.delta}
                  </span>{" "}
                  <span className="text-muted">· {reasonLabel(t as never, m.reason)}</span>
                  {m.note ? <span className="block text-xs text-muted">{m.note}</span> : null}
                </span>
                <time className="shrink-0 text-xs text-muted" dateTime={m.createdAt}>
                  {new Date(m.createdAt).toLocaleString()}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
