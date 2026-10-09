"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Drawer } from "@/components/admin/overlay";
import { formatDate } from "@/lib/format";
import type { Loc } from "@/lib/localize";

type Json = Record<string, unknown> | null;
const show = (v: unknown) => (v === undefined ? "—" : typeof v === "string" ? v : JSON.stringify(v));

/** "Details" button + drawer with the recorded before/after values of one audit entry. */
export function AuditDetails({ summary, who, at, ip, before, after }: { summary: string; who: string; at: string; ip: string | null; before: Json; after: Json }) {
  const t = useTranslations("admin.audit");
  const loc = useLocale() as Loc;
  const [open, setOpen] = useState(false);
  const keys = [...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])];
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="border border-line px-3 py-1.5 text-xs hover:border-accent">{t("details")}</button>
      <Drawer open={open} onClose={() => setOpen(false)} title={t("drawerTitle")}>
        <div className="space-y-6 p-5">
          <div className="space-y-1 text-sm">
            <p className="font-medium">{summary}</p>
            <p className="text-muted">{who} · {formatDate(at, loc, true)}{ip ? <> · <span dir="ltr">{ip}</span></> : null}</p>
          </div>
          {keys.length === 0 ? <p className="border border-line p-4 text-sm text-muted">{t("noSnapshot")}</p> : (
            <dl className="divide-y divide-line border border-line text-sm">
              {keys.map((k) => (
                <div key={k} className="space-y-2 p-4">
                  <dt className="text-xs uppercase tracking-[0.15em] text-accent" dir="ltr">{k}</dt>
                  <dd className="grid gap-1.5">
                    <p className="flex gap-2"><span className="w-12 shrink-0 text-xs text-muted">{t("before")}</span><span className="break-all text-muted line-through decoration-brand/40" dir="auto">{show(before?.[k])}</span></p>
                    <p className="flex gap-2"><span className="w-12 shrink-0 text-xs text-muted">{t("after")}</span><span className="break-all" dir="auto">{show(after?.[k])}</span></p>
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </Drawer>
    </>
  );
}
