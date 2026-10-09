"use client";

import { ArrowDown, ArrowUp, GripVertical, Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Card, CardHeader, EmptyState } from "@/components/admin/primitives";
import { Drawer } from "@/components/admin/overlay";
import { useRouter } from "@/i18n/navigation";
import { moveSectionAction, reorderSectionsAction, toggleSectionAction } from "@/server/actions/admin-content";
import { cn } from "@/lib/cn";
import { SectionConfigForm } from "./section-config-form";
import type { SectionDTO } from "./types";

type Props = { rows: SectionDTO[]; canEdit: boolean };

/** Homepage builder: HTML5 drag-and-drop order (with arrow buttons as the keyboard fallback), enable toggles and a config drawer. */
export function HomepageManager({ rows, canEdit }: Props) {
  const t = useTranslations("admin.homepage");
  const f = useTranslations("admin.form");
  const router = useRouter();
  const [editing, setEditing] = useState<SectionDTO | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [status, setStatus] = useState<"" | "saving" | "saved">("");

  const label = (key: string) => t(`sections.${key}` as "sections.hero");

  const run = (fn: (fd: FormData) => Promise<void>, values: Record<string, string>, announce = false) => {
    if (announce) setStatus("saving");
    const fd = new FormData();
    for (const [k, v] of Object.entries(values)) fd.set(k, v);
    return fn(fd).then(() => {
      if (announce) setStatus("saved");
      router.refresh();
    });
  };

  const toggle = (r: SectionDTO) => run(toggleSectionAction, { id: r.id, enabled: String(!r.enabled) }, true);
  const move = (id: string, dir: "up" | "down") => run(moveSectionAction, { id, dir }, true);

  const drop = (targetId: string) => {
    const sourceId = dragId;
    setDragId(null);
    setOverId(null);
    if (!sourceId || sourceId === targetId) return;
    const ids = rows.map((r) => r.id);
    const from = ids.indexOf(sourceId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    const next = [...ids];
    const [moved] = next.splice(from, 1);
    if (!moved) return;
    next.splice(to, 0, moved);
    return run(reorderSectionsAction, { ids: JSON.stringify(next) }, true);
  };

  return (
    <>
      <Card>
        <CardHeader title={t("listTitle")} />
        {rows.length === 0 ? (
          <EmptyState title={f("empty")} body={f("emptyBody")} />
        ) : (
          <ul>
            {rows.map((r, i) => {
              const name = label(r.key);
              return (
                <li
                  key={r.id}
                  draggable={canEdit}
                  onDragStart={(e) => {
                    setDragId(r.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragOver={(e) => {
                    if (!canEdit || !dragId) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    setOverId(r.id);
                  }}
                  onDragEnd={() => {
                    setDragId(null);
                    setOverId(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    void drop(r.id);
                  }}
                  className={cn(
                    "flex flex-wrap items-center gap-4 border-b border-line px-5 py-4 transition-colors last:border-b-0",
                    canEdit && "cursor-grab active:cursor-grabbing",
                    dragId === r.id && "opacity-50",
                    overId === r.id && dragId && dragId !== r.id && "bg-brand/5",
                  )}
                >
                  <span aria-hidden className="text-muted">
                    <GripVertical size={16} />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{name}</span>
                    <span className="block text-xs text-muted" dir="ltr">
                      {r.key}
                    </span>
                  </span>

                  <label className="flex items-center gap-2 text-sm text-muted">
                    <input
                      type="checkbox"
                      checked={r.enabled}
                      disabled={!canEdit}
                      onChange={() => void toggle(r)}
                      aria-label={r.enabled ? t("hideSection", { name }) : t("showSection", { name })}
                      className="size-4 accent-[var(--color-brand,#67251b)]"
                    />
                    <span>{t("colEnabled")}</span>
                  </label>

                  <span className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => void move(r.id, "up")}
                      disabled={!canEdit || i === 0}
                      aria-label={`${t("moveUp")} — ${name}`}
                      className="grid size-8 place-items-center border border-line text-muted transition-colors hover:border-accent disabled:opacity-30"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => void move(r.id, "down")}
                      disabled={!canEdit || i === rows.length - 1}
                      aria-label={`${t("moveDown")} — ${name}`}
                      className="grid size-8 place-items-center border border-line text-muted transition-colors hover:border-accent disabled:opacity-30"
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(r)}
                      disabled={!canEdit}
                      aria-label={`${f("edit")} — ${name}`}
                      className="grid size-8 place-items-center border border-line text-muted transition-colors hover:border-accent hover:text-foreground disabled:opacity-30"
                    >
                      <Pencil size={14} />
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3">
          <p className="text-xs text-muted">{t("dragHint")}</p>
          <p role="status" aria-live="polite" className="text-sm text-sage-700 dark:text-sage-200">
            {status === "saving" ? t("orderSaving") : status === "saved" ? t("orderSaved") : ""}
          </p>
        </div>
      </Card>

      <Drawer
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={t("configTitle", { name: editing ? label(editing.key) : "" })}
        className="w-[min(94vw,40rem)]"
      >
        {editing && <SectionConfigForm row={editing} onDone={() => setEditing(null)} onCancel={() => setEditing(null)} />}
      </Drawer>
    </>
  );
}
